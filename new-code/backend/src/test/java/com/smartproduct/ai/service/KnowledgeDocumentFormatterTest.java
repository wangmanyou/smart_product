package com.smartproduct.ai.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class KnowledgeDocumentFormatterTest {
    private final KnowledgeDocumentFormatter formatter = new KnowledgeDocumentFormatter();

    @Test
    void formatsStructuredKnowledgeAsStableMarkdown() {
        KnowledgeDocumentFormatter.KnowledgeDocument source = new KnowledgeDocumentFormatter.KnowledgeDocument(
                123L,
                12L,
                6,
                "客户投诉处理",
                "客户投诉响应时效",
                "张三",
                LocalDateTime.of(2026, 8, 17, 10, 30),
                List.of(
                        new KnowledgeDocumentFormatter.KnowledgeField("问题分类", "text", "一般投诉"),
                        new KnowledgeDocumentFormatter.KnowledgeField("处理时限", "richtext", "<p>2 小时内首次响应</p><p>48 小时内完成闭环</p>")
                ),
                List.of("客户投诉", "售后服务")
        );

        KnowledgeDocumentFormatter.FormattedDocument result = formatter.format(source);

        assertEquals("knowledge-123-v6.md", result.fileName());
        assertTrue(result.markdown().contains("# 客户投诉响应时效"));
        assertTrue(result.markdown().contains("## 处理时限"));
        assertTrue(result.markdown().contains("2 小时内首次响应"));
        assertFalse(result.markdown().contains("<p>"));
        assertTrue(result.markdown().contains("客户投诉、售后服务"));
        assertEquals(64, result.contentHash().length());
    }

    @Test
    void producesSameHashForSameEffectiveContent() {
        KnowledgeDocumentFormatter.KnowledgeDocument source = new KnowledgeDocumentFormatter.KnowledgeDocument(
                1L, 2L, 1, "场景", "标题", null, null,
                List.of(new KnowledgeDocumentFormatter.KnowledgeField("正文", "text", "内容")),
                List.of()
        );

        String first = formatter.format(source).contentHash();
        String second = formatter.format(source).contentHash();

        assertEquals(first, second);
    }
}
