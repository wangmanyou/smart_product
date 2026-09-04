package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.ai.model.AiKnowledgeStatuses;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import com.smartproduct.mapper.AiKnowledgeSyncTaskMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AiKnowledgeSyncTaskClaimService {
    private final AiKnowledgeSyncTaskMapper tasks;

    public AiKnowledgeSyncTaskClaimService(AiKnowledgeSyncTaskMapper tasks) {
        this.tasks = tasks;
    }

    @Transactional
    public Optional<ClaimedTask> claimNext() {
        LocalDateTime now = LocalDateTime.now();
        AiKnowledgeSyncTaskEntity row = tasks.selectNextForUpdate(now);
        if (row == null) {
            return Optional.empty();
        }
        String previousStatus = row.taskStatus;
        int updated = tasks.update(new UpdateWrapper<AiKnowledgeSyncTaskEntity>()
                .eq("id", row.id)
                .eq("task_status", previousStatus)
                .set("task_status", AiKnowledgeStatuses.TASK_PROCESSING)
                .set("started_at", now)
                .set("next_retry_at", null)
                .set("rerun_required", false));
        if (updated == 0) {
            return Optional.empty();
        }
        row.taskStatus = AiKnowledgeStatuses.TASK_PROCESSING;
        row.startedAt = now;
        row.nextRetryAt = null;
        row.rerunRequired = false;
        return Optional.of(new ClaimedTask(row, previousStatus));
    }

    public record ClaimedTask(AiKnowledgeSyncTaskEntity task, String previousStatus) {
    }
}

