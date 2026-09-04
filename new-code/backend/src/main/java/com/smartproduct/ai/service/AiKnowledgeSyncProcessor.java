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
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
public class AiKnowledgeSyncProcessor {
    private static final String DATASET_ENABLED = "ENABLED";
    private static final String MAIN_SOURCE_KEY = "main";

    private final KnowledgeDocumentSourceService source;
    private final AiRagDatasetBindingMapper bindings;
    private final AiRagDatasetService datasets;
    private final AiKnowledgeDocumentMapper documents;
    private final RagflowClient ragflow;

    public AiKnowledgeSyncProcessor(KnowledgeDocumentSourceService source,
                                    AiRagDatasetBindingMapper bindings,
                                    AiKnowledgeDocumentMapper documents,
                                    RagflowClient ragflow) {
        this(source, bindings, documents, ragflow, null);
    }

    @Autowired
    public AiKnowledgeSyncProcessor(KnowledgeDocumentSourceService source,
                                    AiRagDatasetBindingMapper bindings,
                                    AiKnowledgeDocumentMapper documents,
                                    RagflowClient ragflow,
                                    AiRagDatasetService datasets) {
        this.source = source;
        this.bindings = bindings;
        this.documents = documents;
        this.ragflow = ragflow;
        this.datasets = datasets;
    }

    public ProcessingResult process(AiKnowledgeSyncTaskEntity task) {
        if (task == null || task.knowledgeId == null) {
            throw new IllegalArgumentException("同步任务缺少 knowledgeId");
        }
        if (AiKnowledgeStatuses.TASK_DELETE.equals(task.taskType)) {
            deleteReplica(task.knowledgeId);
            return ProcessingResult.SUCCESS;
        }
        return upsertReplica(task.knowledgeId);
    }

    private ProcessingResult upsertReplica(Long knowledgeId) {
        Optional<KnowledgeDocumentSourceService.PreparedDocument> optional = source.prepare(knowledgeId);
        if (optional.isEmpty()) {
            deleteReplica(knowledgeId);
            return ProcessingResult.SUCCESS;
        }

        KnowledgeDocumentSourceService.PreparedDocument prepared = optional.orElseThrow();
        AiRagDatasetBindingEntity binding = ensureBinding(prepared.sceneTemplateId());
        AiKnowledgeDocumentEntity mapping = findMapping(knowledgeId);

        if (mapping != null && hasPending(mapping)) {
            if (activeMatches(mapping, binding.ragflowDatasetId, prepared.contentHash())) {
                discardPending(mapping, "知识内容已回到当前生效版本");
                markReady(mapping.id);
                return ProcessingResult.SUCCESS;
            }
            if (pendingMatches(mapping, binding.ragflowDatasetId, prepared.contentHash())) {
                return pollOrStartPending(mapping);
            }
            discardPending(mapping, "检测到更新版本，取消旧的待解析文档");
            mapping = findMapping(knowledgeId);
        }

        if (mapping != null && activeMatches(mapping, binding.ragflowDatasetId, prepared.contentHash())) {
            markReady(mapping.id);
            return ProcessingResult.SUCCESS;
        }

        RagflowClient.UploadedDocument uploaded = ragflow.uploadMarkdown(
                binding.ragflowDatasetId,
                prepared.fileName(),
                prepared.markdown()
        );
        mapping = savePending(mapping, prepared, binding.ragflowDatasetId, uploaded.documentId());
        ragflow.startParsing(binding.ragflowDatasetId, uploaded.documentId());
        markDocumentParsing(mapping.id);
        return ProcessingResult.PARSING;
    }

    private ProcessingResult pollOrStartPending(AiKnowledgeDocumentEntity mapping) {
        RagflowClient.DocumentStatus status = ragflow.getDocumentStatus(
                mapping.pendingRagflowDatasetId,
                mapping.pendingRagflowDocumentId
        );
        if (status.succeeded()) {
            promotePending(mapping);
            return ProcessingResult.SUCCESS;
        }
        if (status.failed()) {
            String message = firstNonBlank(status.progressMessage(), "RAGFlow 文档解析失败，状态：" + status.run());
            discardPending(mapping, message);
            markDocumentFailed(mapping.id, message);
            throw new IllegalStateException(message);
        }
        if (status.unstarted()) {
            ragflow.startParsing(mapping.pendingRagflowDatasetId, mapping.pendingRagflowDocumentId);
        }
        markDocumentParsing(mapping.id);
        return ProcessingResult.PARSING;
    }

    private void promotePending(AiKnowledgeDocumentEntity mapping) {
        String oldDatasetId = mapping.ragflowDatasetId;
        String oldDocumentId = mapping.ragflowDocumentId;
        String oldContentHash = mapping.contentHash;
        Integer oldKnowledgeVersion = mapping.knowledgeVersion;
        String newDatasetId = mapping.pendingRagflowDatasetId;
        String newDocumentId = mapping.pendingRagflowDocumentId;
        String newContentHash = mapping.pendingContentHash;
        Integer newKnowledgeVersion = mapping.pendingKnowledgeVersion;
        LocalDateTime now = LocalDateTime.now();

        boolean hasDifferentOldDocument = notBlank(oldDocumentId)
                && (!Objects.equals(oldDocumentId, newDocumentId)
                || !Objects.equals(oldDatasetId, newDatasetId));
        if (!hasDifferentOldDocument) {
            requireUpdated(documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                    .eq("id", mapping.id)
                    .set("ragflow_dataset_id", newDatasetId)
                    .set("ragflow_document_id", newDocumentId)
                    .set("content_hash", newContentHash)
                    .set("knowledge_version", newKnowledgeVersion)
                    .set("pending_ragflow_dataset_id", null)
                    .set("pending_ragflow_document_id", null)
                    .set("pending_content_hash", null)
                    .set("pending_knowledge_version", null)
                    .set("sync_status", AiKnowledgeStatuses.DOCUMENT_READY)
                    .set("sync_error", null)
                    .set("last_sync_at", now)
                    .set("update_at", now)), mapping.id);
            return;
        }

        // Make the parsed document current before deleting the old replica. The old
        // location is temporarily kept in pending_* as a durable cleanup marker, so
        // a process crash cannot create a retrieval gap or lose the cleanup target.
        requireUpdated(documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mapping.id)
                .set("ragflow_dataset_id", newDatasetId)
                .set("ragflow_document_id", newDocumentId)
                .set("content_hash", newContentHash)
                .set("knowledge_version", newKnowledgeVersion)
                .set("pending_ragflow_dataset_id", oldDatasetId)
                .set("pending_ragflow_document_id", oldDocumentId)
                .set("pending_content_hash", oldContentHash)
                .set("pending_knowledge_version", oldKnowledgeVersion)
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_SYNCING)
                .set("sync_error", null)
                .set("last_sync_at", now)
                .set("update_at", now)), mapping.id);

        ragflow.deleteDocuments(oldDatasetId, Set.of(oldDocumentId));
        requireUpdated(documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mapping.id)
                .eq("ragflow_document_id", newDocumentId)
                .eq("pending_ragflow_document_id", oldDocumentId)
                .set("pending_ragflow_dataset_id", null)
                .set("pending_ragflow_document_id", null)
                .set("pending_content_hash", null)
                .set("pending_knowledge_version", null)
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_READY)
                .set("sync_error", null)
                .set("update_at", LocalDateTime.now())), mapping.id);
    }
    private AiKnowledgeDocumentEntity savePending(AiKnowledgeDocumentEntity mapping,
                                                   KnowledgeDocumentSourceService.PreparedDocument prepared,
                                                   String datasetId,
                                                   String documentId) {
        LocalDateTime now = LocalDateTime.now();
        if (mapping == null) {
            mapping = new AiKnowledgeDocumentEntity();
            mapping.knowledgeId = prepared.knowledgeId();
            mapping.sceneTemplateId = prepared.sceneTemplateId();
            mapping.sourceType = AiKnowledgeStatuses.SOURCE_MAIN;
            mapping.sourceKey = MAIN_SOURCE_KEY;
            // ragflow_dataset_id is the active location. For a first upload there
            // is no active document yet, but the column remains non-null.
            mapping.ragflowDatasetId = datasetId;
            mapping.pendingRagflowDatasetId = datasetId;
            mapping.pendingRagflowDocumentId = documentId;
            mapping.pendingContentHash = prepared.contentHash();
            mapping.pendingKnowledgeVersion = prepared.knowledgeVersion();
            mapping.syncStatus = AiKnowledgeStatuses.DOCUMENT_PENDING;
            mapping.createAt = now;
            mapping.updateAt = now;
            documents.insert(mapping);
            return mapping;
        }
        documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mapping.id)
                .set("scene_template_id", prepared.sceneTemplateId())
                .set("pending_ragflow_dataset_id", datasetId)
                .set("pending_ragflow_document_id", documentId)
                .set("pending_content_hash", prepared.contentHash())
                .set("pending_knowledge_version", prepared.knowledgeVersion())
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_PENDING)
                .set("sync_error", null)
                .set("update_at", now));
        mapping.sceneTemplateId = prepared.sceneTemplateId();
        mapping.pendingRagflowDatasetId = datasetId;
        mapping.pendingRagflowDocumentId = documentId;
        mapping.pendingContentHash = prepared.contentHash();
        mapping.pendingKnowledgeVersion = prepared.knowledgeVersion();
        mapping.syncStatus = AiKnowledgeStatuses.DOCUMENT_PENDING;
        return mapping;
    }

    private void discardPending(AiKnowledgeDocumentEntity mapping, String reason) {
        if (notBlank(mapping.pendingRagflowDatasetId) && notBlank(mapping.pendingRagflowDocumentId)) {
            ragflow.deleteDocuments(mapping.pendingRagflowDatasetId, Set.of(mapping.pendingRagflowDocumentId));
        }
        documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mapping.id)
                .set("pending_ragflow_dataset_id", null)
                .set("pending_ragflow_document_id", null)
                .set("pending_content_hash", null)
                .set("pending_knowledge_version", null)
                .set("sync_error", truncate(reason, 2000))
                .set("update_at", LocalDateTime.now()));
    }

    private void deleteReplica(Long knowledgeId) {
        AiKnowledgeDocumentEntity mapping = findMapping(knowledgeId);
        if (mapping == null) {
            return;
        }
        Map<String, Set<String>> documentsByDataset = new LinkedHashMap<>();
        addDocument(documentsByDataset, mapping.ragflowDatasetId, mapping.ragflowDocumentId);
        addDocument(documentsByDataset, mapping.pendingRagflowDatasetId, mapping.pendingRagflowDocumentId);
        for (Map.Entry<String, Set<String>> entry : documentsByDataset.entrySet()) {
            ragflow.deleteDocuments(entry.getKey(), entry.getValue());
        }
        LocalDateTime now = LocalDateTime.now();
        documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mapping.id)
                .set("ragflow_document_id", null)
                .set("content_hash", null)
                .set("knowledge_version", null)
                .set("pending_ragflow_dataset_id", null)
                .set("pending_ragflow_document_id", null)
                .set("pending_content_hash", null)
                .set("pending_knowledge_version", null)
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_DELETED)
                .set("sync_error", null)
                .set("last_sync_at", now)
                .set("update_at", now));
    }

    private AiRagDatasetBindingEntity ensureBinding(Long sceneTemplateId) {
        AiRagDatasetBindingEntity binding;
        if (datasets == null) {
            binding = bindings.selectOne(new QueryWrapper<AiRagDatasetBindingEntity>()
                    .eq("scene_template_id", sceneTemplateId)
                    .eq("status", DATASET_ENABLED)
                    .last("limit 1"));
        } else {
            binding = datasets.ensureBinding(sceneTemplateId);
        }
        if (binding == null || !notBlank(binding.ragflowDatasetId)) {
            String message = datasets == null
                    ? "业务场景 " + sceneTemplateId + " 尚未绑定可用的 RAGFlow Dataset"
                    : "业务场景 " + sceneTemplateId + " 无法创建可用的 RAGFlow Dataset";
            throw new IllegalStateException(message);
        }
        return binding;
    }

    private AiKnowledgeDocumentEntity findMapping(Long knowledgeId) {
        return documents.selectOne(new QueryWrapper<AiKnowledgeDocumentEntity>()
                .eq("knowledge_id", knowledgeId)
                .eq("source_type", AiKnowledgeStatuses.SOURCE_MAIN)
                .eq("source_key", MAIN_SOURCE_KEY)
                .last("limit 1"));
    }

    private void markDocumentParsing(Long mappingId) {
        documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mappingId)
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_PARSING)
                .set("sync_error", null)
                .set("update_at", LocalDateTime.now()));
    }

    private void markDocumentFailed(Long mappingId, String error) {
        documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mappingId)
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_FAILED)
                .set("sync_error", truncate(error, 2000))
                .set("update_at", LocalDateTime.now()));
    }

    private void markReady(Long mappingId) {
        documents.update(new UpdateWrapper<AiKnowledgeDocumentEntity>()
                .eq("id", mappingId)
                .set("sync_status", AiKnowledgeStatuses.DOCUMENT_READY)
                .set("sync_error", null)
                .set("update_at", LocalDateTime.now()));
    }

    private static boolean activeMatches(AiKnowledgeDocumentEntity mapping, String datasetId, String contentHash) {
        return notBlank(mapping.ragflowDocumentId)
                && Objects.equals(mapping.ragflowDatasetId, datasetId)
                && Objects.equals(mapping.contentHash, contentHash);
    }

    private static boolean pendingMatches(AiKnowledgeDocumentEntity mapping, String datasetId, String contentHash) {
        return notBlank(mapping.pendingRagflowDocumentId)
                && Objects.equals(mapping.pendingRagflowDatasetId, datasetId)
                && Objects.equals(mapping.pendingContentHash, contentHash);
    }

    private static boolean hasPending(AiKnowledgeDocumentEntity mapping) {
        return notBlank(mapping.pendingRagflowDocumentId);
    }

    private static void addDocument(Map<String, Set<String>> target, String datasetId, String documentId) {
        if (!notBlank(datasetId) || !notBlank(documentId)) {
            return;
        }
        target.computeIfAbsent(datasetId, ignored -> new LinkedHashSet<>()).add(documentId);
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }

    private static String firstNonBlank(String first, String fallback) {
        return first == null || first.isBlank() ? fallback : first;
    }

    private static void requireUpdated(int updated, Long mappingId) {
        if (updated != 1) {
            throw new IllegalStateException("知识同步映射更新失败，mappingId=" + mappingId);
        }
    }
    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    public enum ProcessingResult {
        SUCCESS,
        PARSING
    }
}

