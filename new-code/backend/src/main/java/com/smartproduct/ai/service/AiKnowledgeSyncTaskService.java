package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.ai.model.AiKnowledgeStatuses;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import com.smartproduct.mapper.AiKnowledgeSyncTaskMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
public class AiKnowledgeSyncTaskService {
    private static final List<String> ACTIVE_STATUSES = List.of(
            AiKnowledgeStatuses.TASK_PENDING,
            AiKnowledgeStatuses.TASK_PROCESSING,
            AiKnowledgeStatuses.TASK_PARSING
    );

    private final AiKnowledgeSyncTaskMapper tasks;
    private final AiProperties properties;

    public AiKnowledgeSyncTaskService(AiKnowledgeSyncTaskMapper tasks, AiProperties properties) {
        this.tasks = tasks;
        this.properties = properties;
    }

    public void enqueueUpsert(Long knowledgeId, Integer knowledgeVersion) {
        enqueue(knowledgeId, knowledgeVersion, AiKnowledgeStatuses.TASK_UPSERT);
    }

    public void enqueueDelete(Long knowledgeId, Integer knowledgeVersion) {
        enqueue(knowledgeId, knowledgeVersion, AiKnowledgeStatuses.TASK_DELETE);
    }

    public boolean enqueueRebuild(Long knowledgeId) {
        return enqueue(knowledgeId, null, AiKnowledgeStatuses.TASK_REBUILD);
    }

    public void markSuccess(Long taskId) {
        int completed = tasks.update(new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("id", taskId)
                .eq("task_status", AiKnowledgeStatuses.TASK_PROCESSING)
                .and(wrapper -> wrapper.isNull("rerun_required").or().eq("rerun_required", false))
                .set("task_status", AiKnowledgeStatuses.TASK_SUCCESS)
                .set("next_retry_at", null)
                .set("error_message", null)
                .set("finished_at", LocalDateTime.now()));
        if (completed == 0) {
            requeueRequestedChange(taskId);
        }
    }

    public void markParsing(Long taskId, Duration pollDelay) {
        LocalDateTime nextPoll = LocalDateTime.now().plus(safeDuration(pollDelay, Duration.ofSeconds(10)));
        int parsing = tasks.update(new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("id", taskId)
                .eq("task_status", AiKnowledgeStatuses.TASK_PROCESSING)
                .and(wrapper -> wrapper.isNull("rerun_required").or().eq("rerun_required", false))
                .set("task_status", AiKnowledgeStatuses.TASK_PARSING)
                .set("next_retry_at", nextPoll)
                .set("error_message", null)
                .set("finished_at", null));
        if (parsing == 0) {
            requeueRequestedChange(taskId);
        }
    }

    public void markFailureOrRetry(AiKnowledgeSyncTaskEntity task, String error, Duration retryDelay, int maxRetries) {
        int retries = task.retryCount == null ? 1 : task.retryCount + 1;
        boolean terminal = retries > Math.max(maxRetries, 0);
        UpdateWrapper<AiKnowledgeSyncTaskEntity> update = new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("id", task.id)
                .eq("task_status", AiKnowledgeStatuses.TASK_PROCESSING)
                .and(wrapper -> wrapper.isNull("rerun_required").or().eq("rerun_required", false))
                .set("retry_count", retries)
                .set("error_message", truncate(error, 2000));
        if (terminal) {
            update.set("task_status", AiKnowledgeStatuses.TASK_FAILED)
                    .set("next_retry_at", null)
                    .set("finished_at", LocalDateTime.now());
        } else {
            update.set("task_status", AiKnowledgeStatuses.TASK_PENDING)
                    .set("next_retry_at", LocalDateTime.now().plus(safeDuration(retryDelay, Duration.ofSeconds(30))))
                    .set("started_at", null)
                    .set("finished_at", null);
        }
        int updated = tasks.update(update);
        if (updated == 0) {
            requeueRequestedChange(task.id);
        }
    }

    public int recoverStaleProcessing(Duration timeout) {
        LocalDateTime staleBefore = LocalDateTime.now().minus(safeDuration(timeout, Duration.ofMinutes(5)));
        return tasks.update(new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("task_status", AiKnowledgeStatuses.TASK_PROCESSING)
                .lt("started_at", staleBefore)
                .set("task_status", AiKnowledgeStatuses.TASK_PENDING)
                .set("retry_count", 0)
                .set("rerun_required", false)
                .set("started_at", null)
                .set("next_retry_at", LocalDateTime.now())
                .set("error_message", "检测到未完成的同步任务，已自动恢复"));
    }

    private boolean enqueue(Long knowledgeId, Integer knowledgeVersion, String taskType) {
        // Keeping this disabled by default prevents an installation that has not
        // applied 003_ai_knowledge_upgrade.sql from affecting existing writes.
        // Enabling AI requires applying the migration and running an initial rebuild.
        if (!properties.isEnabled() || knowledgeId == null || knowledgeId <= 0) {
            return false;
        }

        DuplicateKeyException lastRace = null;
        for (int attempt = 0; attempt < 3; attempt++) {
            AiKnowledgeSyncTaskEntity active = findActive(knowledgeId);
            if (active != null) {
                Boolean merged = mergeIntoActive(active, knowledgeVersion, taskType);
                if (merged != null) {
                    return merged;
                }
                continue;
            }

            AiKnowledgeSyncTaskEntity row = new AiKnowledgeSyncTaskEntity();
            row.knowledgeId = knowledgeId;
            row.knowledgeVersion = knowledgeVersion;
            row.taskType = taskType;
            row.taskStatus = AiKnowledgeStatuses.TASK_PENDING;
            row.retryCount = 0;
            row.rerunRequired = false;
            row.createAt = LocalDateTime.now();
            try {
                tasks.insert(row);
                return true;
            } catch (DuplicateKeyException race) {
                // The generated active_knowledge_id unique key protects two application
                // instances that enqueue the same knowledge item at the same time.
                lastRace = race;
            }
        }
        if (lastRace != null) {
            throw lastRace;
        }
        throw new IllegalStateException("知识同步任务状态持续变化，请稍后重试");
    }
    private AiKnowledgeSyncTaskEntity findActive(Long knowledgeId) {
        return tasks.selectOne(new QueryWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("knowledge_id", knowledgeId)
                .in("task_status", ACTIVE_STATUSES)
                .last("limit 1"));
    }

    private Boolean mergeIntoActive(AiKnowledgeSyncTaskEntity active, Integer knowledgeVersion, String taskType) {
        if (AiKnowledgeStatuses.TASK_REBUILD.equals(taskType)
                || Objects.equals(active.taskType, taskType) && Objects.equals(active.knowledgeVersion, knowledgeVersion)) {
            return false;
        }

        UpdateWrapper<AiKnowledgeSyncTaskEntity> update = new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("id", active.id)
                .eq("task_status", active.taskStatus)
                .set("task_type", taskType)
                .set("knowledge_version", knowledgeVersion)
                .set("retry_count", 0)
                .set("error_message", null)
                .set("finished_at", null);
        if (AiKnowledgeStatuses.TASK_PROCESSING.equals(active.taskStatus)) {
            update.set("rerun_required", true);
        } else {
            update.set("task_status", AiKnowledgeStatuses.TASK_PENDING)
                    .set("rerun_required", false)
                    .set("started_at", null)
                    .set("next_retry_at", LocalDateTime.now());
        }
        return tasks.update(update) == 1 ? Boolean.TRUE : null;
    }

    private void requeueRequestedChange(Long taskId) {
        tasks.update(new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("id", taskId)
                .eq("task_status", AiKnowledgeStatuses.TASK_PROCESSING)
                .eq("rerun_required", true)
                .set("task_status", AiKnowledgeStatuses.TASK_PENDING)
                .set("retry_count", 0)
                .set("rerun_required", false)
                .set("started_at", null)
                .set("next_retry_at", LocalDateTime.now())
                .set("error_message", null)
                .set("finished_at", null));
    }

    private static Duration safeDuration(Duration value, Duration fallback) {
        return value == null || value.isNegative() || value.isZero() ? fallback : value;
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "同步失败";
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}


