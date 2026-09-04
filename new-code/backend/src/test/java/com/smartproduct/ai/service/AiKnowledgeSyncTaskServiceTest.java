package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.ai.model.AiKnowledgeStatuses;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import com.smartproduct.mapper.AiKnowledgeSyncTaskMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AiKnowledgeSyncTaskServiceTest {

    @Test
    void enqueuesAnUpsertWhenAiIsEnabled() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        when(mapper.selectOne(any(QueryWrapper.class))).thenReturn(null);
        AiKnowledgeSyncTaskService service = service(mapper);

        service.enqueueUpsert(15L, 4);

        ArgumentCaptor<AiKnowledgeSyncTaskEntity> captor = ArgumentCaptor.forClass(AiKnowledgeSyncTaskEntity.class);
        verify(mapper).insert(captor.capture());
        AiKnowledgeSyncTaskEntity task = captor.getValue();
        assertThat(task.knowledgeId).isEqualTo(15L);
        assertThat(task.knowledgeVersion).isEqualTo(4);
        assertThat(task.taskType).isEqualTo(AiKnowledgeStatuses.TASK_UPSERT);
        assertThat(task.taskStatus).isEqualTo(AiKnowledgeStatuses.TASK_PENDING);
        assertThat(task.retryCount).isZero();
        assertThat(task.rerunRequired).isFalse();
        assertThat(task.createAt).isNotNull();
    }

    @Test
    void doesNothingWhileAiIsDisabled() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        AiKnowledgeSyncTaskService service = new AiKnowledgeSyncTaskService(mapper, new AiProperties());

        service.enqueueDelete(15L, 5);

        verifyNoInteractions(mapper);
    }

    @Test
    void skipsRebuildWhenAnyActiveTaskAlreadyExists() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        AiKnowledgeSyncTaskEntity active = task(7L, AiKnowledgeStatuses.TASK_PENDING,
                AiKnowledgeStatuses.TASK_UPSERT, 4);
        when(mapper.selectOne(any(QueryWrapper.class))).thenReturn(active);
        AiKnowledgeSyncTaskService service = service(mapper);

        assertThat(service.enqueueRebuild(15L)).isFalse();

        verify(mapper, never()).insert(any(AiKnowledgeSyncTaskEntity.class));
        verify(mapper, never()).update(any(UpdateWrapper.class));
    }

    @Test
    void coalescesAChangeArrivingDuringProcessingAndRequestsRerun() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        AiKnowledgeSyncTaskEntity active = task(7L, AiKnowledgeStatuses.TASK_PROCESSING,
                AiKnowledgeStatuses.TASK_UPSERT, 4);
        when(mapper.selectOne(any(QueryWrapper.class))).thenReturn(active);
        when(mapper.update(any(UpdateWrapper.class))).thenReturn(1);
        AiKnowledgeSyncTaskService service = service(mapper);

        service.enqueueDelete(15L, 5);

        ArgumentCaptor<UpdateWrapper<AiKnowledgeSyncTaskEntity>> captor = updateCaptor();
        verify(mapper).update(captor.capture());
        assertThat(captor.getValue().getSqlSet())
                .contains("task_type", "knowledge_version", "rerun_required");
    }

    @Test
    void requeuesInsteadOfCompletingWhenAChangeArrivedDuringProcessing() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        when(mapper.update(any(UpdateWrapper.class))).thenReturn(0, 1);
        AiKnowledgeSyncTaskService service = service(mapper);

        service.markSuccess(7L);

        ArgumentCaptor<UpdateWrapper<AiKnowledgeSyncTaskEntity>> captor = updateCaptor();
        verify(mapper, times(2)).update(captor.capture());
        assertThat(captor.getAllValues().get(1).getSqlSet())
                .contains("task_status", "rerun_required", "next_retry_at");
    }

    @Test
    void movesTerminalFailureToFailedStatus() {
        AiKnowledgeSyncTaskMapper mapper = mock(AiKnowledgeSyncTaskMapper.class);
        when(mapper.update(any(UpdateWrapper.class))).thenReturn(1);
        AiKnowledgeSyncTaskService service = service(mapper);
        AiKnowledgeSyncTaskEntity active = task(7L, AiKnowledgeStatuses.TASK_PROCESSING,
                AiKnowledgeStatuses.TASK_UPSERT, 4);
        active.retryCount = 6;

        service.markFailureOrRetry(active, "boom", Duration.ofSeconds(30), 6);

        ArgumentCaptor<UpdateWrapper<AiKnowledgeSyncTaskEntity>> captor = updateCaptor();
        verify(mapper).update(captor.capture());
        assertThat(captor.getValue().getSqlSet()).contains("task_status", "finished_at", "error_message");
    }

    private static AiKnowledgeSyncTaskService service(AiKnowledgeSyncTaskMapper mapper) {
        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        return new AiKnowledgeSyncTaskService(mapper, properties);
    }

    private static AiKnowledgeSyncTaskEntity task(Long id, String status, String type, Integer version) {
        AiKnowledgeSyncTaskEntity task = new AiKnowledgeSyncTaskEntity();
        task.id = id;
        task.knowledgeId = 15L;
        task.taskStatus = status;
        task.taskType = type;
        task.knowledgeVersion = version;
        task.retryCount = 0;
        task.rerunRequired = false;
        return task;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<UpdateWrapper<AiKnowledgeSyncTaskEntity>> updateCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(UpdateWrapper.class);
    }
}
