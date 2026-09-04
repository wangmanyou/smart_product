package com.smartproduct.ai.service;

import org.jsoup.Jsoup;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HexFormat;
import java.util.List;
import java.util.Objects;

/**
 * Produces a stable, human-readable document from one effective knowledge
 * version. The result is what gets uploaded to the retrieval engine.
 */
@Component
public class KnowledgeDocumentFormatter {

    public FormattedDocument format(KnowledgeDocument source) {
        Objects.requireNonNull(source, "source");
        if (source.knowledgeId() == null || source.sceneTemplateId() == null) {
            throw new IllegalArgumentException("knowledgeId and sceneTemplateId are required");
        }

        String title = firstNonBlank(source.title(), "知识 " + source.knowledgeId());
        StringBuilder markdown = new StringBuilder(1024);
        markdown.append("# ").append(cleanInline(title)).append("\n\n");
        appendMetadata(markdown, "业务场景", source.sceneName());
        appendMetadata(markdown, "知识编号", String.valueOf(source.knowledgeId()));
        appendMetadata(markdown, "知识版本", "V" + Math.max(source.version(), 1));
        appendMetadata(markdown, "维护人", source.creatorName());
        appendMetadata(markdown, "更新时间", source.updatedAt() == null ? null : source.updatedAt().toString());

        for (KnowledgeField field : safe(source.fields())) {
            if (field == null || isBlank(field.name()) || isBlank(field.value())) {
                continue;
            }
            markdown.append("\n## ").append(cleanInline(field.name())).append("\n\n");
            markdown.append(normalizeValue(field.type(), field.value())).append("\n");
        }

        if (!safe(source.tags()).isEmpty()) {
            markdown.append("\n## 标签\n\n");
            markdown.append(String.join("、", source.tags().stream()
                    .filter(Objects::nonNull)
                    .map(KnowledgeDocumentFormatter::cleanInline)
                    .filter(value -> !value.isBlank())
                    .toList()));
            markdown.append("\n");
        }

        String normalized = markdown.toString().trim() + "\n";
        String fileName = "knowledge-" + source.knowledgeId() + "-v" + Math.max(source.version(), 1) + ".md";
        return new FormattedDocument(fileName, normalized, sha256(normalized));
    }

    private static void appendMetadata(StringBuilder target, String name, String value) {
        if (!isBlank(value)) {
            target.append("**").append(name).append("：** ").append(cleanInline(value)).append("\n");
        }
    }

    private static String normalizeValue(String type, String value) {
        if ("richtext".equalsIgnoreCase(type) || looksLikeHtml(value)) {
            return Jsoup.parse(value).wholeText().trim();
        }
        return value.replace("\r\n", "\n").replace('\r', '\n').trim();
    }

    private static boolean looksLikeHtml(String value) {
        String trimmed = value == null ? "" : value.trim();
        return trimmed.startsWith("<") && trimmed.contains(">");
    }

    private static String cleanInline(String value) {
        return value == null ? "" : Jsoup.parse(value).text().replaceAll("\\s+", " ").trim();
    }

    private static String firstNonBlank(String preferred, String fallback) {
        return isBlank(preferred) ? fallback : preferred;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static <T> List<T> safe(Collection<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to calculate document hash", ex);
        }
    }

    public record KnowledgeDocument(
            Long knowledgeId,
            Long sceneTemplateId,
            int version,
            String sceneName,
            String title,
            String creatorName,
            LocalDateTime updatedAt,
            Collection<KnowledgeField> fields,
            Collection<String> tags
    ) {
    }

    public record KnowledgeField(String name, String type, String value) {
    }

    public record FormattedDocument(String fileName, String markdown, String contentHash) {
    }
}
