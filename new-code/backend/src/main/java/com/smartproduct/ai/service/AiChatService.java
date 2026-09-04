package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.smartproduct.ai.client.LlmClient;
import com.smartproduct.ai.client.RagflowClient;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.entity.AiKnowledgeDocumentEntity;
import com.smartproduct.mapper.AiKnowledgeDocumentMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.shared.exception.ApiException;
import org.jsoup.Jsoup;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
public class AiChatService {
    private static final int MAX_QUESTION_LENGTH = 2000;

    private final AiProperties properties;
    private final AiPermissionService permissions;
    private final RagflowClient ragflow;
    private final LlmClient llm;
    private final AiChatHistoryService history;
    private final CurrentUserService currentUsers;
    private final AiKnowledgeDocumentMapper knowledgeDocuments;

    @Autowired
    public AiChatService(AiProperties properties, AiPermissionService permissions,
                         RagflowClient ragflow, LlmClient llm,
                         AiChatHistoryService history, CurrentUserService currentUsers,
                          AiKnowledgeDocumentMapper knowledgeDocuments) {
        this.properties = properties;
        this.permissions = permissions;
        this.ragflow = ragflow;
        this.llm = llm;
        this.history = history;
        this.currentUsers = currentUsers;
        this.knowledgeDocuments = knowledgeDocuments;
    }

    /**
     * Keeps the service easy to unit-test for callers that do not need
     * document-to-knowledge detail linking.
     */
    public AiChatService(AiProperties properties, AiPermissionService permissions,
                         RagflowClient ragflow, LlmClient llm,
                         AiChatHistoryService history, CurrentUserService currentUsers) {
        this(properties, permissions, ragflow, llm, history, currentUsers, null);
    }

    public AskResponse ask(Long sessionId, String question, Collection<Long> requestedSceneIds) {
        String normalizedQuestion = normalizeQuestion(question);
        CurrentUser user = currentUsers.current();
        if (sessionId != null) {
            history.requireOwnedSession(sessionId, user.userId());
        }

        AiPermissionService.ResolvedScope scope = permissions.resolve(requestedSceneIds);
        if (scope.isEmpty()) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "当前可访问场景尚未绑定可用的知识检索库");
        }

        long started = System.nanoTime();
        JsonNode retrieval = ragflow.retrieve(normalizedQuestion, scope.ragflowDatasetIds());
        List<RetrievedChunk> chunks = parseChunks(retrieval, scope);
        List<LlmClient.ChatTurn> turns = history.recentTurns(
                sessionId, user.userId(), properties.getRetrieval().getHistoryMessageLimit()
        );

        String answer;
        String modelName;
        if (chunks.isEmpty()) {
            answer = llm.answerWithoutKnowledge(normalizedQuestion, turns);
            modelName = llm.modelName();
        } else {
            answer = llm.answer(normalizedQuestion,
                    chunks.stream().map(chunk -> new LlmClient.SourceChunk(chunk.title(), chunk.content())).toList(),
                    turns);
            modelName = llm.modelName();
        }
        long latencyMs = (System.nanoTime() - started) / 1_000_000L;
        List<Reference> references = references(chunks);
        AiChatHistoryService.PersistedExchange persisted = history.saveExchange(
                sessionId, user.userId(), normalizedQuestion, answer, references, modelName, latencyMs
        );
        return new AskResponse(
                persisted.sessionId(), persisted.assistantMessageId(), answer, references,
                scope.sceneTemplateIds(), scope.unboundSceneTemplateIds(), modelName, latencyMs
        );
    }

    private List<RetrievedChunk> parseChunks(JsonNode retrieval, AiPermissionService.ResolvedScope scope) {
        JsonNode chunksNode = retrieval == null ? null : retrieval.get("chunks");
        if ((chunksNode == null || !chunksNode.isArray()) && retrieval != null) {
            chunksNode = retrieval.path("data").path("chunks");
        }
        if (chunksNode == null || !chunksNode.isArray()) {
            return List.of();
        }

        Map<String, Long> sceneByDataset = new LinkedHashMap<>();
        scope.ragflowDatasetIdsByScene().forEach((sceneId, datasetId) -> sceneByDataset.put(datasetId, sceneId));
        int limit = Math.max(1, properties.getRetrieval().getTopK());
        int remainingChars = Math.max(1000, properties.getRetrieval().getMaxContextChars());
        Set<String> seen = new LinkedHashSet<>();
        List<RetrievedChunk> result = new ArrayList<>();
        for (JsonNode node : chunksNode) {
            if (result.size() >= limit || remainingChars <= 0) {
                break;
            }
            String datasetId = text(node, "dataset_id");
            Long sceneId = sceneByDataset.get(datasetId);
            if (sceneId == null) {
                // Defense in depth: never pass through a chunk outside the resolved scope,
                // even if a remote retrieval service returns unexpected data.
                continue;
            }
            String documentId = text(node, "document_id");
            String chunkId = firstNonBlank(text(node, "id"), text(node, "chunk_id"));
            String dedupeKey = datasetId + ":" + documentId + ":" + chunkId;
            if (!seen.add(dedupeKey)) {
                continue;
            }
            String content = cleanContent(firstNonBlank(
                    text(node, "content"),
                    firstNonBlank(text(node, "content_with_weight"), text(node, "content_ltks"))
            ));
            if (content.isBlank()) {
                continue;
            }
            if (content.length() > remainingChars) {
                content = content.substring(0, remainingChars);
            }
            remainingChars -= content.length();
            String title = firstNonBlank(text(node, "document_keyword"), text(node, "document_name"));
            result.add(new RetrievedChunk(
                    sceneId, knowledgeId(datasetId, documentId), datasetId, documentId, chunkId, title, content,
                    number(node, "similarity"), text(node, "doc_type_kwd")
            ));
        }
        return Collections.unmodifiableList(result);
    }

    private Long knowledgeId(String datasetId, String documentId) {
        if (knowledgeDocuments == null || datasetId == null || datasetId.isBlank()
                || documentId == null || documentId.isBlank()) {
            return null;
        }
        List<AiKnowledgeDocumentEntity> rows = knowledgeDocuments.selectList(new QueryWrapper<AiKnowledgeDocumentEntity>()
                .eq("ragflow_dataset_id", datasetId)
                .and(wrapper -> wrapper
                        .eq("ragflow_document_id", documentId)
                        .or()
                        .eq("pending_ragflow_document_id", documentId))
                .orderByDesc("update_at")
                .last("limit 1"));
        return rows.isEmpty() ? null : rows.get(0).knowledgeId;
    }

    private static List<Reference> references(List<RetrievedChunk> chunks) {
        List<Reference> result = new ArrayList<>();
        for (int i = 0; i < chunks.size(); i++) {
            RetrievedChunk chunk = chunks.get(i);
            result.add(new Reference(
                    i + 1,
                    chunk.sceneTemplateId(),
                    chunk.knowledgeId(),
                    chunk.documentId(),
                    chunk.chunkId(),
                    chunk.title(),
                    chunk.similarity(),
                    preview(chunk.content())
            ));
        }
        return List.copyOf(result);
    }

    private static String normalizeQuestion(String question) {
        if (question == null || question.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "问题不能为空");
        }
        String value = question.trim();
        if (value.length() > MAX_QUESTION_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "问题长度不能超过 " + MAX_QUESTION_LENGTH + " 个字符");
        }
        return value;
    }

    private static String cleanContent(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Jsoup.parse(value).text().replaceAll("\\s+", " ").trim();
    }

    private static String preview(String content) {
        if (content == null) {
            return "";
        }
        return content.length() <= 300 ? content : content.substring(0, 300) + "…";
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private static double number(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? 0d : value.asDouble(0d);
    }

    private static String firstNonBlank(String first, String fallback) {
        return first == null || first.isBlank() ? Objects.requireNonNullElse(fallback, "") : first;
    }

    record RetrievedChunk(
            Long sceneTemplateId,
            Long knowledgeId,
            String datasetId,
            String documentId,
            String chunkId,
            String title,
            String content,
            double similarity,
            String documentType
    ) {
    }

    public record Reference(
            int index,
            Long sceneTemplateId,
            Long knowledgeId,
            String documentId,
            String chunkId,
            String title,
            double similarity,
            String contentPreview
    ) {
    }

    public record AskResponse(
            Long sessionId,
            Long messageId,
            String answer,
            List<Reference> references,
            Set<Long> sceneTemplateIds,
            Set<Long> unboundSceneTemplateIds,
            String modelName,
            long latencyMs
    ) {
    }
}


