package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.ai.model.AiKnowledgeStatuses;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import com.smartproduct.mapper.AiKnowledgeSyncTaskMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiKnowledgeSyncTaskClaimServiceTest {

    @Test
    void claimsDueTaskAndMarksItProcessing() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        AiKnowledgeSyncTaskEntity row = new AiKnowledgeSyncTaskEntity();
        row.id = 9L;
        row.knowledgeId = 15L;
        row.taskStatus = AiKnowledgeStatuses.TASK_PARSING;
        row.rerunRequired = true;
        when(mapper.selectNextForUpdate(any())).thenReturn(row);
        when(mapper.update(any(UpdateWrapper.class))).thenReturn(1);
        AiKnowledgeSyncTaskClaimService service = new AiKnowledgeSyncTaskClaimService(mapper);

        Optional<AiKnowledgeSyncTaskClaimService.ClaimedTask> claimed = service.claimNext();

        assertThat(claimed).isPresent();
        assertThat(claimed.orElseThrow().previousStatus()).isEqualTo(AiKnowledgeStatuses.TASK_PARSING);
        assertThat(claimed.orElseThrow().task().taskStatus).isEqualTo(AiKnowledgeStatuses.TASK_PROCESSING);
        assertThat(claimed.orElseThrow().task().startedAt).isNotNull();
        assertThat(claimed.orElseThrow().task().rerunRequired).isFalse();
        ArgumentCaptor<UpdateWrapper<AiKnowledgeSyncTaskEntity>> captor = updateCaptor();
        verify(mapper).update(captor.capture());
        assertThat(captor.getValue().getSqlSet()).contains("task_status", "started_at", "rerun_required");
    }

    @Test
    void returnsEmptyWhenConditionalClaimLosesRace() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        AiKnowledgeSyncTaskEntity row = new AiKnowledgeSyncTaskEntity();
        row.id = 9L;
        row.taskStatus = AiKnowledgeStatuses.TASK_PENDING;
        when(mapper.selectNextForUpdate(any())).thenReturn(row);
        when(mapper.update(any(UpdateWrapper.class))).thenReturn(0);

        assertThat(new AiKnowledgeSyncTaskClaimService(mapper).claimNext()).isEmpty();
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<UpdateWrapper<AiKnowledgeSyncTaskEntity>> updateCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(UpdateWrapper.class);
    }
}
