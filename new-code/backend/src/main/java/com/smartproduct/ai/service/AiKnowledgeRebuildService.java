package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.ai.model.AiKnowledgeStatuses;
import com.smartproduct.entity.AiKnowledgeDocumentEntity;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.mapper.AiKnowledgeDocumentMapper;
import com.smartproduct.mapper.AiKnowledgeSyncTaskMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class AiKnowledgeRebuildService {
    private static final List<String> TASK_STATUSES = List.of(
            AiKnowledgeStatuses.TASK_PENDING,
            AiKnowledgeStatuses.TASK_PROCESSING,
            AiKnowledgeStatuses.TASK_PARSING,
            AiKnowledgeStatuses.TASK_SUCCESS,
            AiKnowledgeStatuses.TASK_FAILED
    );
    private static final List<String> DOCUMENT_STATUSES = List.of(
            AiKnowledgeStatuses.DOCUMENT_PENDING,
            AiKnowledgeStatuses.DOCUMENT_SYNCING,
            AiKnowledgeStatuses.DOCUMENT_PARSING,
            AiKnowledgeStatuses.DOCUMENT_READY,
            AiKnowledgeStatuses.DOCUMENT_FAILED,
            AiKnowledgeStatuses.DOCUMENT_DELETED
    );

    private final AiProperties properties;
    private final KnowledgeMapper knowledge;
    private final AiKnowledgeSyncTaskMapper taskMapper;
    private final AiKnowledgeDocumentMapper documentMapper;
    private final AiKnowledgeSyncTaskService tasks;
    private final CurrentUserService currentUsers;

    public AiKnowledgeRebuildService(AiProperties properties, KnowledgeMapper knowledge,
                                     AiKnowledgeSyncTaskMapper taskMapper,
                                     AiKnowledgeDocumentMapper documentMapper,
                                     AiKnowledgeSyncTaskService tasks,
                                     CurrentUserService currentUsers) {
        this.properties = properties;
        this.knowledge = knowledge;
        this.taskMapper = taskMapper;
        this.documentMapper = documentMapper;
        this.tasks = tasks;
        this.currentUsers = currentUsers;
    }

    public Map<String, Object> enqueue(Long sceneTemplateId) {
        requireEnabled();
        CurrentUser user = currentUsers.current();
        QueryWrapper<KnowledgeEntity> query = new QueryWrapper<KnowledgeEntity>()
                .select("id", "scene_template_id")
                .eq("del", 0)
                .orderByAsc("id");
        if (sceneTemplateId != null) {
            if (!user.admin() && !user.hasScenePermission(PermissionCodes.AI_KNOWLEDGE_SYNC, sceneTemplateId)) {
                throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有管理该场景知识同步的权限");
            }
            query.eq("scene_template_id", sceneTemplateId);
        } else if (!user.admin()) {
            Set<Long> allowed = user.sceneIdsForAnyPermission(PermissionCodes.AI_KNOWLEDGE_SYNC);
            if (allowed.isEmpty()) {
                throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有管理知识同步的权限");
            }
            query.in("scene_template_id", allowed);
        }

        int queued = 0;
        List<KnowledgeEntity> rows = knowledge.selectList(query);
        for (KnowledgeEntity row : rows) {
            if (tasks.enqueueRebuild(row.id)) {
                queued++;
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sceneTemplateId", sceneTemplateId);
        result.put("knowledgeCount", rows.size());
        result.put("queuedTaskCount", queued);
        result.put("skippedActiveTaskCount", rows.size() - queued);
        return result;
    }

    public Map<String, Object> summary() {
        CurrentUser user = currentUsers.current();
        if (!user.hasPermission(PermissionCodes.AI_KNOWLEDGE_SYNC)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有管理知识同步的权限");
        }
        Map<String, Long> taskCounts = new LinkedHashMap<>();
        for (String status : TASK_STATUSES) {
            taskCounts.put(status, taskMapper.selectCount(new QueryWrapper<AiKnowledgeSyncTaskEntity>()
                    .eq("task_status", status)));
        }
        Map<String, Long> documentCounts = new LinkedHashMap<>();
        for (String status : DOCUMENT_STATUSES) {
            documentCounts.put(status, documentMapper.selectCount(new QueryWrapper<AiKnowledgeDocumentEntity>()
                    .eq("sync_status", status)));
        }
        return Map.of(
                "enabled", properties.isEnabled(),
                "tasks", taskCounts,
                "documents", documentCounts
        );
    }

    private void requireEnabled() {
        if (!properties.isEnabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE.value(), "智能问答功能尚未启用");
        }
    }
}
