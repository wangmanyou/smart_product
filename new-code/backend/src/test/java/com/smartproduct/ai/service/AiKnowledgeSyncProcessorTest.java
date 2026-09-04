package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.ai.client.RagflowClient;
import com.smartproduct.ai.model.AiKnowledgeStatuses;
import com.smartproduct.entity.AiKnowledgeDocumentEntity;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import com.smartproduct.entity.AiRagDatasetBindingEntity;
import com.smartproduct.mapper.AiKnowledgeDocumentMapper;
import com.smartproduct.mapper.AiRagDatasetBindingMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AiKnowledgeSyncProcessorTest {
    private KnowledgeDocumentSourceService source;
    private AiRagDatasetBindingMapper bindings;
    private AiKnowledgeDocumentMapper documents;
    private RagflowClient ragflow;
    private AiKnowledgeSyncProcessor processor;

    @BeforeEach
    void setUp() {
        source = mock(KnowledgeDocumentSourceService.class);
        bindings = mock(AiRagDatasetBindingMapper.class);
        documents = mock(AiKnowledgeDocumentMapper.class);
        ragflow = mock(RagflowClient.class);
        processor = new AiKnowledgeSyncProcessor(source, bindings, documents, ragflow);
    }

    @Test
    void skipsUploadWhenActiveDocumentAlreadyMatchesLatestContent() {
        when(source.prepare(15L)).thenReturn(Optional.of(prepared("hash-new", 5)));
        when(bindings.selectOne(any(QueryWrapper.class))).thenReturn(binding("dataset-a"));
        AiKnowledgeDocumentEntity mapping = mapping();
        mapping.ragflowDatasetId = "dataset-a";
        mapping.ragflowDocumentId = "doc-current";
        mapping.contentHash = "hash-new";
        when(documents.selectOne(any(QueryWrapper.class))).thenReturn(mapping);

        assertThat(processor.process(upsertTask())).isEqualTo(AiKnowledgeSyncProcessor.ProcessingResult.SUCCESS);

        verify(ragflow, never()).uploadMarkdown(any(), any(), any());
        verify(ragflow, never()).startParsing(any(), any());
        verify(documents).update(any(UpdateWrapper.class));
    }

    @Test
    void firstUploadCreatesPendingMappingAndStartsParsing() {
        when(source.prepare(15L)).thenReturn(Optional.of(prepared("hash-new", 5)));
        when(bindings.selectOne(any(QueryWrapper.class))).thenReturn(binding("dataset-a"));
        when(documents.selectOne(any(QueryWrapper.class))).thenReturn(null);
        when(ragflow.uploadMarkdown("dataset-a", "knowledge-15.md", "# content"))
                .thenReturn(new RagflowClient.UploadedDocument("doc-new", "knowledge-15.md"));
        doAnswer(invocation -> {
            AiKnowledgeDocumentEntity row = invocation.getArgument(0);
            row.id = 31L;
            return 1;
        }).when(documents).insert(any(AiKnowledgeDocumentEntity.class));

        assertThat(processor.process(upsertTask())).isEqualTo(AiKnowledgeSyncProcessor.ProcessingResult.PARSING);

        ArgumentCaptor<AiKnowledgeDocumentEntity> captor = ArgumentCaptor.forClass(AiKnowledgeDocumentEntity.class);
        verify(documents).insert(captor.capture());
        assertThat(captor.getValue().pendingRagflowDatasetId).isEqualTo("dataset-a");
        assertThat(captor.getValue().pendingRagflowDocumentId).isEqualTo("doc-new");
        assertThat(captor.getValue().pendingContentHash).isEqualTo("hash-new");
        assertThat(captor.getValue().ragflowDocumentId).isNull();
        verify(ragflow).startParsing("dataset-a", "doc-new");
    }

    @Test
    void promotesParsedPendingDocumentOnlyAfterSuccessAndDeletesOldDocument() {
        when(source.prepare(15L)).thenReturn(Optional.of(prepared("hash-new", 5)));
        when(bindings.selectOne(any(QueryWrapper.class))).thenReturn(binding("dataset-a"));
        AiKnowledgeDocumentEntity mapping = mapping();
        mapping.ragflowDatasetId = "dataset-a";
        mapping.ragflowDocumentId = "doc-old";
        mapping.contentHash = "hash-old";
        mapping.pendingRagflowDatasetId = "dataset-a";
        mapping.pendingRagflowDocumentId = "doc-new";
        mapping.pendingContentHash = "hash-new";
        mapping.pendingKnowledgeVersion = 5;
        when(documents.selectOne(any(QueryWrapper.class))).thenReturn(mapping);
        when(ragflow.getDocumentStatus("dataset-a", "doc-new"))
                .thenReturn(new RagflowClient.DocumentStatus("doc-new", "3", 1d, "", 12, 100));
        when(documents.update(any(UpdateWrapper.class))).thenReturn(1);

        assertThat(processor.process(upsertTask())).isEqualTo(AiKnowledgeSyncProcessor.ProcessingResult.SUCCESS);

        verify(ragflow).deleteDocuments("dataset-a", Set.of("doc-old"));
        ArgumentCaptor<UpdateWrapper<AiKnowledgeDocumentEntity>> captor = updateCaptor();
        verify(documents, org.mockito.Mockito.times(2)).update(captor.capture());
        assertThat(captor.getAllValues().get(0).getSqlSet())
                .contains("ragflow_document_id", "pending_ragflow_document_id", "content_hash", "last_sync_at");
        assertThat(captor.getAllValues().get(1).getSqlSet())
                .contains("pending_ragflow_document_id", "sync_status");
    }

    @Test
    void deleteRemovesCurrentAndPendingDocuments() {
        AiKnowledgeDocumentEntity mapping = mapping();
        mapping.ragflowDatasetId = "dataset-a";
        mapping.ragflowDocumentId = "doc-old";
        mapping.pendingRagflowDatasetId = "dataset-a";
        mapping.pendingRagflowDocumentId = "doc-new";
        when(documents.selectOne(any(QueryWrapper.class))).thenReturn(mapping);
        AiKnowledgeSyncTaskEntity task = upsertTask();
        task.taskType = AiKnowledgeStatuses.TASK_DELETE;

        assertThat(processor.process(task)).isEqualTo(AiKnowledgeSyncProcessor.ProcessingResult.SUCCESS);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Set<String>> ids = ArgumentCaptor.forClass(Set.class);
        verify(ragflow).deleteDocuments(org.mockito.ArgumentMatchers.eq("dataset-a"), ids.capture());
        assertThat(ids.getValue()).containsExactlyInAnyOrder("doc-old", "doc-new");
        verifyNoInteractions(source);
    }

    @Test
    void failsClearlyWhenSceneHasNoDatasetBinding() {
        when(source.prepare(15L)).thenReturn(Optional.of(prepared("hash-new", 5)));
        when(bindings.selectOne(any(QueryWrapper.class))).thenReturn(null);

        assertThatThrownBy(() -> processor.process(upsertTask()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("尚未绑定");
        verifyNoInteractions(ragflow);
    }

    private static KnowledgeDocumentSourceService.PreparedDocument prepared(String hash, int version) {
        return new KnowledgeDocumentSourceService.PreparedDocument(
                15L, 8L, version, "knowledge-15.md", "# content", hash
        );
    }

    private static AiRagDatasetBindingEntity binding(String datasetId) {
        AiRagDatasetBindingEntity binding = new AiRagDatasetBindingEntity();
        binding.sceneTemplateId = 8L;
        binding.ragflowDatasetId = datasetId;
        binding.status = "ENABLED";
        return binding;
    }

    private static AiKnowledgeDocumentEntity mapping() {
        AiKnowledgeDocumentEntity mapping = new AiKnowledgeDocumentEntity();
        mapping.id = 21L;
        mapping.knowledgeId = 15L;
        mapping.sceneTemplateId = 8L;
        mapping.sourceType = AiKnowledgeStatuses.SOURCE_MAIN;
        mapping.sourceKey = "main";
        return mapping;
    }

    private static AiKnowledgeSyncTaskEntity upsertTask() {
        AiKnowledgeSyncTaskEntity task = new AiKnowledgeSyncTaskEntity();
        task.id = 11L;
        task.knowledgeId = 15L;
        task.taskType = AiKnowledgeStatuses.TASK_UPSERT;
        task.taskStatus = AiKnowledgeStatuses.TASK_PROCESSING;
        task.retryCount = 0;
        return task;
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<UpdateWrapper<AiKnowledgeDocumentEntity>> updateCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(UpdateWrapper.class);
    }
}



