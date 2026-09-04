package com.smartproduct.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Thin transport adapter for the RAGFlow HTTP API. Dataset authorization is
 * resolved by the Spring service layer; browser supplied dataset IDs are never
 * forwarded directly.
 */
@Component
public class RagflowClient {
    private final RestClient client;
    private final AiProperties properties;

    @Autowired
    public RagflowClient(AiProperties properties) {
        this(properties, createClient(properties));
    }

    RagflowClient(AiProperties properties, RestClient client) {
        this.properties = properties;
        this.client = client;
    }

    public JsonNode retrieve(String question, Set<String> datasetIds) {
        requireEnabledAndConfigured();
        if (question == null || question.isBlank()) {
            throw new ApiException(400, "问题不能为空");
        }
        if (datasetIds == null || datasetIds.isEmpty()) {
            throw new ApiException(403, "当前用户没有可检索的知识范围");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("question", question.trim());
        body.put("dataset_ids", datasetIds);
        body.put("page", 1);
        body.put("page_size", Math.max(1, properties.getRetrieval().getTopK()));
        body.put("top_k", Math.max(properties.getRetrieval().getTopK(), properties.getRetrieval().getCandidateTopK()));
        body.put("similarity_threshold", properties.getRetrieval().getSimilarityThreshold());

        JsonNode response = call("检索", () -> client.post()
                .uri("/api/v1/retrieval")
                .headers(this::authorize)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class));
        requireSuccessful(response, "检索");
        return response;
    }

    public DatasetResult createDataset(String name) {
        requireEnabledAndConfigured();
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("dataset name is required");
        }
        JsonNode response = call("创建 Dataset", () -> client.post()
                .uri("/api/v1/datasets")
                .headers(this::authorize)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("name", name.trim()))
                .retrieve()
                .body(JsonNode.class));
        JsonNode data = requireSuccessful(response, "创建 Dataset");
        String id = text(data, "id");
        if (id.isBlank()) {
            throw new ApiException(502, "RAGFlow 创建 Dataset 后未返回 ID");
        }
        return new DatasetResult(id, firstNonBlank(text(data, "name"), name.trim()));
    }

    public UploadedDocument uploadMarkdown(String datasetId, String fileName, String markdown) {
        requireEnabledAndConfigured();
        requireId(datasetId, "datasetId");
        if (fileName == null || fileName.isBlank()) {
            throw new IllegalArgumentException("fileName is required");
        }
        byte[] bytes = (markdown == null ? "" : markdown).getBytes(StandardCharsets.UTF_8);
        ByteArrayResource file = new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return fileName;
            }
        };
        MultiValueMap<String, Object> parts = new LinkedMultiValueMap<>();
        parts.add("file", file);

        JsonNode response = call("上传文档", () -> client.post()
                .uri("/api/v1/datasets/{datasetId}/documents", datasetId)
                .headers(this::authorize)
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(parts)
                .retrieve()
                .body(JsonNode.class));
        JsonNode data = requireSuccessful(response, "上传文档");
        JsonNode document = firstDocument(data);
        String documentId = text(document, "id");
        if (documentId.isBlank()) {
            throw new ApiException(502, "RAGFlow 上传文档后未返回文档 ID");
        }
        return new UploadedDocument(documentId, firstNonBlank(text(document, "name"), fileName));
    }

    public void startParsing(String datasetId, String documentId) {
        requireEnabledAndConfigured();
        requireId(datasetId, "datasetId");
        requireId(documentId, "documentId");
        JsonNode response = call("启动文档解析", () -> client.post()
                .uri("/api/v1/datasets/{datasetId}/chunks", datasetId)
                .headers(this::authorize)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("document_ids", List.of(documentId)))
                .retrieve()
                .body(JsonNode.class));
        requireSuccessful(response, "启动文档解析");
    }

    public DocumentStatus getDocumentStatus(String datasetId, String documentId) {
        requireEnabledAndConfigured();
        requireId(datasetId, "datasetId");
        requireId(documentId, "documentId");
        JsonNode response = call("查询文档状态", () -> client.get()
                .uri(builder -> builder
                        .path("/api/v1/datasets/{datasetId}/documents")
                        .queryParam("id", documentId)
                        .queryParam("page", 1)
                        .queryParam("page_size", 1)
                        .build(datasetId))
                .headers(this::authorize)
                .retrieve()
                .body(JsonNode.class));
        JsonNode data = requireSuccessful(response, "查询文档状态");
        JsonNode document = firstDocument(data);
        if (document == null || document.isMissingNode() || document.isNull()) {
            return new DocumentStatus(documentId, "MISSING", 0d, "文档不存在", 0, 0);
        }
        return new DocumentStatus(
                firstNonBlank(text(document, "id"), documentId),
                text(document, "run"),
                number(document, "progress"),
                message(document, "progress_msg"),
                integer(document, "chunk_count"),
                integer(document, "token_count")
        );
    }

    public void deleteDocuments(String datasetId, Set<String> documentIds) {
        requireEnabledAndConfigured();
        requireId(datasetId, "datasetId");
        if (documentIds == null || documentIds.isEmpty()) {
            return;
        }
        JsonNode response = call("删除文档", () -> client.method(HttpMethod.DELETE)
                .uri("/api/v1/datasets/{datasetId}/documents", datasetId)
                .headers(this::authorize)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("ids", documentIds))
                .retrieve()
                .body(JsonNode.class));
        requireSuccessful(response, "删除文档");
    }

    private void authorize(HttpHeaders headers) {
        headers.setBearerAuth(properties.getRagflow().getApiKey().trim());
    }

    private void requireEnabledAndConfigured() {
        if (!properties.isEnabled()) {
            throw new ApiException(503, "智能问答功能尚未启用");
        }
        String apiKey = properties.getRagflow().getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException(503, "RAGFlow 尚未配置 API Key");
        }
    }

    private JsonNode call(String operation, RemoteCall call) {
        try {
            JsonNode response = call.execute();
            if (response == null) {
                throw new ApiException(502, "RAGFlow " + operation + "返回为空");
            }
            return response;
        } catch (RestClientException ex) {
            throw new ApiException(502, "RAGFlow " + operation + "失败：" + safeMessage(ex));
        }
    }

    private static JsonNode requireSuccessful(JsonNode response, String operation) {
        JsonNode code = response == null ? null : response.get("code");
        boolean success = code == null || code.isNull()
                || code.isIntegralNumber() && code.asInt() == 0
                || code.isTextual() && "0".equals(code.asText());
        if (!success) {
            String message = firstNonBlank(text(response, "message"), text(response, "msg"));
            throw new ApiException(502, "RAGFlow " + operation + "失败：" + firstNonBlank(message, "code=" + code.asText()));
        }
        JsonNode data = response == null ? null : response.get("data");
        return data == null ? response : data;
    }

    private static JsonNode firstDocument(JsonNode data) {
        if (data == null || data.isNull() || data.isMissingNode()) {
            return null;
        }
        if (data.isArray()) {
            return data.isEmpty() ? null : data.get(0);
        }
        JsonNode docs = data.get("docs");
        if (docs != null && docs.isArray()) {
            return docs.isEmpty() ? null : docs.get(0);
        }
        return data.has("id") ? data : null;
    }

    private static String text(JsonNode node, String field) {
        if (node == null || node.isNull() || node.isMissingNode()) {
            return "";
        }
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText("");
    }

    private static String message(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        if (value == null || value.isNull()) {
            return "";
        }
        if (!value.isArray()) {
            return value.asText("");
        }
        String result = "";
        for (JsonNode item : value) {
            String candidate = item == null ? "" : item.asText("");
            if (!candidate.isBlank()) {
                result = candidate;
            }
        }
        return result;
    }
    private static double number(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? 0d : value.asDouble(0d);
    }

    private static int integer(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value == null || value.isNull() ? 0 : value.asInt(0);
    }

    private static void requireId(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is required");
        }
    }

    private static RestClient createClient(AiProperties properties) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMillis(properties.getRagflow().getConnectTimeout(), Duration.ofSeconds(5)));
        requestFactory.setReadTimeout(timeoutMillis(properties.getRagflow().getReadTimeout(), Duration.ofSeconds(60)));
        return RestClient.builder()
                .baseUrl(trimTrailingSlash(properties.getRagflow().getBaseUrl()))
                .requestFactory(requestFactory)
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    private static int timeoutMillis(Duration configured, Duration fallback) {
        Duration value = configured == null || configured.isNegative() || configured.isZero() ? fallback : configured;
        return (int) Math.min(value.toMillis(), Integer.MAX_VALUE);
    }

    private static String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://127.0.0.1:9380";
        }
        return value.replaceAll("/+$", "");
    }

    private static String safeMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return ex.getClass().getSimpleName();
        }
        return message.length() > 500 ? message.substring(0, 500) : message;
    }

    private static String firstNonBlank(String preferred, String fallback) {
        return preferred == null || preferred.isBlank() ? fallback : preferred;
    }

    @FunctionalInterface
    private interface RemoteCall {
        JsonNode execute();
    }

    public record DatasetResult(String datasetId, String name) {
    }

    public record UploadedDocument(String documentId, String name) {
    }

    public record DocumentStatus(
            String documentId,
            String run,
            double progress,
            String progressMessage,
            int chunkCount,
            int tokenCount
    ) {
        public boolean succeeded() {
            String value = normalizedRun();
            return progress >= 0.999d || Set.of("3", "DONE", "SUCCESS", "SUCCEEDED", "FINISHED").contains(value);
        }

        public boolean failed() {
            String value = normalizedRun();
            return progress < 0d || Set.of("2", "4", "FAIL", "FAILED", "CANCEL", "CANCELED", "CANCELLED", "MISSING").contains(value);
        }

        public boolean unstarted() {
            String value = normalizedRun();
            return value.isBlank() || Set.of("UNSTART", "PENDING", "NOT_STARTED", "0").contains(value);
        }

        private String normalizedRun() {
            return run == null ? "" : run.trim().toUpperCase(Locale.ROOT);
        }
    }
}


