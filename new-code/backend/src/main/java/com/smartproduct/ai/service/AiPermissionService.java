package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.entity.AiRagDatasetBindingEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.AiRagDatasetBindingMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Resolves the retrieval scope before any RAGFlow call is made.
 *
 * The client may narrow the scope, but it can never expand the scope granted by
 * the current user's roles. Dataset IDs are always loaded by the backend and
 * must never be accepted from the request body.
 */
@Service
public class AiPermissionService {
    private static final String ENABLED = "ENABLED";

    private final CurrentUserService currentUsers;
    private final SceneTemplateMapper scenes;
    private final AiRagDatasetBindingMapper datasetBindings;
    private final AiRagDatasetService datasets;

    public AiPermissionService(CurrentUserService currentUsers,
                               SceneTemplateMapper scenes,
                               AiRagDatasetBindingMapper datasetBindings) {
        this(currentUsers, scenes, datasetBindings, null);
    }

    @Autowired
    public AiPermissionService(CurrentUserService currentUsers,
                               SceneTemplateMapper scenes,
                               AiRagDatasetBindingMapper datasetBindings,
                               AiRagDatasetService datasets) {
        this.currentUsers = currentUsers;
        this.scenes = scenes;
        this.datasetBindings = datasetBindings;
        this.datasets = datasets;
    }

    public ResolvedScope resolve(Collection<Long> requestedSceneIds) {
        CurrentUser user = currentUsers.current();
        if (!user.hasPermission(PermissionCodes.AI_CHAT)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有智能问答权限");
        }

        Set<Long> enabledSceneIds = enabledSceneIds();
        Set<Long> allowedSceneIds = user.admin()
                ? enabledSceneIds
                : new LinkedHashSet<>(safeIds(user.sceneIdsForAnyPermission(PermissionCodes.AI_CHAT)));
        allowedSceneIds.retainAll(enabledSceneIds);
        Set<Long> actualSceneIds = narrowToAllowed(allowedSceneIds, requestedSceneIds);

        Map<Long, String> datasetIds = new LinkedHashMap<>();
        if (!actualSceneIds.isEmpty()) {
            datasetBindings.selectList(new QueryWrapper<AiRagDatasetBindingEntity>()
                            .eq("status", ENABLED)
                            .in("scene_template_id", actualSceneIds))
                    .stream()
                    .filter(Objects::nonNull)
                    .filter(row -> ENABLED.equals(row.status))
                    .filter(row -> row.sceneTemplateId != null && actualSceneIds.contains(row.sceneTemplateId))
                    .filter(row -> row.ragflowDatasetId != null
                            && !row.ragflowDatasetId.isBlank())
                    .forEach(row -> datasetIds.put(row.sceneTemplateId, row.ragflowDatasetId));
        }

        // Dataset IDs are derived by the backend. If an authorized scene has no
        // mapping yet, create its retrieval container from the existing scene
        // metadata instead of forcing an operator to copy IDs by hand.
        if (datasets != null) {
            for (Long sceneTemplateId : actualSceneIds) {
                if (datasetIds.containsKey(sceneTemplateId)) {
                    continue;
                }
                AiRagDatasetBindingEntity binding = datasets.ensureBinding(sceneTemplateId);
                if (binding != null && binding.ragflowDatasetId != null
                        && !binding.ragflowDatasetId.isBlank()) {
                    datasetIds.put(sceneTemplateId, binding.ragflowDatasetId);
                }
            }
        }

        Set<Long> unboundSceneIds = new LinkedHashSet<>(actualSceneIds);
        unboundSceneIds.removeAll(datasetIds.keySet());
        return new ResolvedScope(actualSceneIds, new LinkedHashMap<>(datasetIds),
                new LinkedHashSet<>(datasetIds.values()), unboundSceneIds);
    }

    private Set<Long> enabledSceneIds() {
        return scenes.selectList(new QueryWrapper<SceneTemplateEntity>()
                        .eq("del", 0)
                        .eq("is_disabled", false))
                .stream()
                .filter(Objects::nonNull)
                .map(row -> row.id)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Set<Long> narrowToAllowed(Set<Long> allowed, Collection<Long> requested) {
        if (requested == null || requested.isEmpty()) {
            return new LinkedHashSet<>(allowed);
        }
        return requested.stream()
                .filter(Objects::nonNull)
                .filter(allowed::contains)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static Set<Long> safeIds(Collection<Long> ids) {
        if (ids == null) {
            return Set.of();
        }
        return ids.stream()
                .filter(Objects::nonNull)
                .filter(id -> id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public record ResolvedScope(
            Set<Long> sceneTemplateIds,
            Map<Long, String> ragflowDatasetIdsByScene,
            Set<String> ragflowDatasetIds,
            Set<Long> unboundSceneTemplateIds
    ) {
        public boolean isEmpty() {
            return ragflowDatasetIds == null || ragflowDatasetIds.isEmpty();
        }
    }
}
