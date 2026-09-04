package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.ai.client.RagflowClient;
import com.smartproduct.entity.AiRagDatasetBindingEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.AiRagDatasetBindingMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AiRagDatasetService {
    private static final String ENABLED = "ENABLED";

    private final AiRagDatasetBindingMapper bindings;
    private final SceneTemplateMapper scenes;
    private final CurrentUserService currentUsers;
    private final RagflowClient ragflow;

    public AiRagDatasetService(AiRagDatasetBindingMapper bindings, SceneTemplateMapper scenes,
                               CurrentUserService currentUsers, RagflowClient ragflow) {
        this.bindings = bindings;
        this.scenes = scenes;
        this.currentUsers = currentUsers;
        this.ragflow = ragflow;
    }

    public Map<String, Object> bind(Long sceneTemplateId, String datasetId, String datasetName) {
        SceneTemplateEntity scene = requireScene(sceneTemplateId);
        requirePermission(sceneTemplateId);
        AiRagDatasetBindingEntity binding = saveBinding(scene, datasetId, datasetName);
        return Map.of(
                "sceneTemplateId", sceneTemplateId,
                "sceneName", scene.name,
                "ragflowDatasetId", binding.ragflowDatasetId,
                "datasetName", binding.datasetName,
                "status", binding.status
        );
    }

    /**
     * Ensures that the existing business scene has a RAGFlow dataset mapping.
     * This is an internal backend operation: callers cannot choose a dataset
     * and the existing role/scene permissions remain the authorization source.
     */
    public AiRagDatasetBindingEntity ensureBinding(Long sceneTemplateId) {
        SceneTemplateEntity scene = requireScene(sceneTemplateId);
        AiRagDatasetBindingEntity existing = bindings.selectOne(new QueryWrapper<AiRagDatasetBindingEntity>()
                .eq("scene_template_id", sceneTemplateId)
                .eq("status", ENABLED)
                .last("limit 1"));
        if (existing != null && existing.ragflowDatasetId != null && !existing.ragflowDatasetId.isBlank()) {
            return existing;
        }

        try {
            return saveBinding(scene, null, null);
        } catch (DuplicateKeyException race) {
            AiRagDatasetBindingEntity concurrent = bindings.selectOne(new QueryWrapper<AiRagDatasetBindingEntity>()
                    .eq("scene_template_id", sceneTemplateId)
                    .eq("status", ENABLED)
                    .last("limit 1"));
            if (concurrent != null && concurrent.ragflowDatasetId != null && !concurrent.ragflowDatasetId.isBlank()) {
                return concurrent;
            }
            throw race;
        }
    }

    private AiRagDatasetBindingEntity saveBinding(SceneTemplateEntity scene, String datasetId, String datasetName) {
        String resolvedName = firstNonBlank(datasetName,
                "知识场景-" + scene.id + "-" + firstNonBlank(scene.name, "未命名"));
        String resolvedId = datasetId == null ? "" : datasetId.trim();
        if (resolvedId.isBlank()) {
            RagflowClient.DatasetResult created = ragflow.createDataset(resolvedName);
            resolvedId = created.datasetId();
            resolvedName = created.name();
        }

        AiRagDatasetBindingEntity existing = bindings.selectOne(new QueryWrapper<AiRagDatasetBindingEntity>()
                .eq("scene_template_id", scene.id)
                .last("limit 1"));
        LocalDateTime now = LocalDateTime.now();
        if (existing == null) {
            existing = new AiRagDatasetBindingEntity();
            existing.sceneTemplateId = scene.id;
            existing.ragflowDatasetId = resolvedId;
            existing.datasetName = resolvedName;
            existing.status = ENABLED;
            existing.createAt = now;
            existing.updateAt = now;
            bindings.insert(existing);
        } else {
            bindings.update(new UpdateWrapper<AiRagDatasetBindingEntity>()
                    .eq("id", existing.id)
                    .set("ragflow_dataset_id", resolvedId)
                    .set("dataset_name", resolvedName)
                    .set("status", ENABLED)
                    .set("update_at", now));
            existing.ragflowDatasetId = resolvedId;
            existing.datasetName = resolvedName;
            existing.status = ENABLED;
            existing.updateAt = now;
        }
        return existing;
    }

    public List<Map<String, Object>> list() {
        CurrentUser user = currentUsers.current();
        if (!user.hasPermission(PermissionCodes.AI_KNOWLEDGE_SYNC)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有管理知识同步的权限");
        }
        Set<Long> allowedSceneIds = user.admin()
                ? Set.of()
                : new LinkedHashSet<>(user.sceneIdsForAnyPermission(PermissionCodes.AI_KNOWLEDGE_SYNC));
        if (!user.admin() && allowedSceneIds.isEmpty()) {
            return List.of();
        }
        QueryWrapper<SceneTemplateEntity> sceneQuery = new QueryWrapper<SceneTemplateEntity>().eq("del", 0);
        QueryWrapper<AiRagDatasetBindingEntity> bindingQuery =
                new QueryWrapper<AiRagDatasetBindingEntity>().orderByAsc("scene_template_id");
        if (!user.admin()) {
            sceneQuery.in("id", allowedSceneIds);
            bindingQuery.in("scene_template_id", allowedSceneIds);
        }
        Map<Long, String> sceneNames = scenes.selectList(sceneQuery)
                .stream()
                .collect(LinkedHashMap::new,
                        (map, row) -> map.put(row.id, row.name),
                        Map::putAll);
        return bindings.selectList(bindingQuery)
                .stream()
                .map(row -> {
                    Map<String, Object> result = new LinkedHashMap<>();
                    result.put("id", row.id);
                    result.put("sceneTemplateId", row.sceneTemplateId);
                    result.put("sceneName", sceneNames.getOrDefault(row.sceneTemplateId, ""));
                    result.put("ragflowDatasetId", row.ragflowDatasetId);
                    result.put("datasetName", row.datasetName);
                    result.put("status", row.status);
                    return result;
                })
                .toList();
    }

    private SceneTemplateEntity requireScene(Long sceneTemplateId) {
        SceneTemplateEntity scene = sceneTemplateId == null ? null : scenes.selectById(sceneTemplateId);
        if (scene == null || scene.del != null && scene.del != 0) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "业务场景不存在");
        }
        return scene;
    }

    private void requirePermission(Long sceneTemplateId) {
        CurrentUser user = currentUsers.current();
        if (!user.admin() && !user.hasScenePermission(PermissionCodes.AI_KNOWLEDGE_SYNC, sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有管理该场景知识同步的权限");
        }
    }

    private static String firstNonBlank(String first, String fallback) {
        return first == null || first.isBlank() ? fallback : first.trim();
    }
}
