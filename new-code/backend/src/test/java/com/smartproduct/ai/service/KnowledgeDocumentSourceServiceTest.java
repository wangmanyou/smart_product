package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.entity.DictDirectoryEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.KnowledgeVersionEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.KnowledgeVersionMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class KnowledgeDocumentSourceServiceTest {

    @Test
    void preparesEffectiveKnowledgeWithoutUsingTheViewDetailApi() {
        KnowledgeMapper knowledge = mock(KnowledgeMapper.class);
        KnowledgeItemMapper knowledgeItems = mock(KnowledgeItemMapper.class);
        KnowledgeVersionMapper versions = mock(KnowledgeVersionMapper.class);
        SceneTemplateMapper scenes = mock(SceneTemplateMapper.class);
        SceneItemMapper sceneItems = mock(SceneItemMapper.class);
        DictDirectoryMapper directories = mock(DictDirectoryMapper.class);

        KnowledgeEntity knowledgeRow = new KnowledgeEntity();
        knowledgeRow.id = 10L;
        knowledgeRow.sceneTemplateId = 20L;
        knowledgeRow.creatorName = "operator";
        knowledgeRow.updateAt = LocalDateTime.of(2026, 8, 17, 12, 0);
        knowledgeRow.del = 0;
        when(knowledge.selectById(10L)).thenReturn(knowledgeRow);

        SceneTemplateEntity scene = new SceneTemplateEntity();
        scene.id = 20L;
        scene.name = "产品知识";
        when(scenes.selectById(20L)).thenReturn(scene);

        KnowledgeVersionEntity version = new KnowledgeVersionEntity();
        version.versionNo = 3;
        when(versions.selectOne(any(QueryWrapper.class))).thenReturn(version);

        SceneItemEntity title = item(1L, "标题", "title", null, false);
        SceneItemEntity body = item(2L, "使用说明", "richtext", null, false);
        SceneItemEntity category = item(3L, "产品分类", "dict", 90L, false);
        SceneItemEntity tags = item(4L, "标签", "tag", null, false);
        SceneItemEntity hidden = item(5L, "内部备注", "text", null, true);
        when(sceneItems.selectList(any(QueryWrapper.class))).thenReturn(List.of(title, body, category, tags, hidden));

        when(knowledgeItems.selectList(any(QueryWrapper.class))).thenReturn(List.of(
                value(10L, 1L, "手机保修政策", null),
                value(10L, 2L, "<p>整机保修一年</p>", null),
                value(10L, 3L, "", "[102]"),
                value(10L, 4L, "售后，保修", null),
                value(10L, 5L, "不得进入检索文档", null)
        ));

        DictDirectoryEntity root = directory(101L, 90L, null, "产品");
        DictDirectoryEntity leaf = directory(102L, 90L, 101L, "手机");
        when(directories.selectList(any(QueryWrapper.class))).thenReturn(List.of(root, leaf));

        KnowledgeDocumentSourceService service = new KnowledgeDocumentSourceService(
                knowledge, knowledgeItems, versions, scenes, sceneItems, directories, new KnowledgeDocumentFormatter());

        KnowledgeDocumentSourceService.PreparedDocument result = service.prepare(10L).orElseThrow();

        assertThat(result.knowledgeVersion()).isEqualTo(3);
        assertThat(result.fileName()).isEqualTo("knowledge-10-v3.md");
        assertThat(result.markdown()).contains("# 手机保修政策");
        assertThat(result.markdown()).contains("整机保修一年");
        assertThat(result.markdown()).contains("产品 / 手机");
        assertThat(result.markdown()).contains("售后、保修");
        assertThat(result.markdown()).doesNotContain("不得进入检索文档");
        assertThat(result.contentHash()).hasSize(64);
    }

    @Test
    void returnsEmptyForDeletedKnowledge() {
        KnowledgeMapper knowledge = mock(KnowledgeMapper.class);
        KnowledgeEntity row = new KnowledgeEntity();
        row.id = 10L;
        row.del = 1;
        when(knowledge.selectById(10L)).thenReturn(row);

        KnowledgeDocumentSourceService service = new KnowledgeDocumentSourceService(
                knowledge,
                mock(KnowledgeItemMapper.class),
                mock(KnowledgeVersionMapper.class),
                mock(SceneTemplateMapper.class),
                mock(SceneItemMapper.class),
                mock(DictDirectoryMapper.class),
                new KnowledgeDocumentFormatter());

        assertThat(service.prepare(10L)).isEmpty();
    }

    private static SceneItemEntity item(Long id, String name, String type, Long dictTemplateId, boolean hidden) {
        SceneItemEntity row = new SceneItemEntity();
        row.id = id;
        row.name = name;
        row.type = type;
        row.dictTemplateId = dictTemplateId;
        row.isHide = hidden;
        row.del = 0;
        return row;
    }

    private static KnowledgeItemEntity value(Long knowledgeId, Long itemId, String value, String directoryIds) {
        KnowledgeItemEntity row = new KnowledgeItemEntity();
        row.knowledgeId = knowledgeId;
        row.sceneItemId = itemId;
        row.sceneItemValue = value;
        row.selectDictTreeIds = directoryIds;
        return row;
    }

    private static DictDirectoryEntity directory(Long id, Long templateId, Long parentId, String name) {
        DictDirectoryEntity row = new DictDirectoryEntity();
        row.id = id;
        row.dictTemplateId = templateId;
        row.parentId = parentId;
        row.name = name;
        row.del = 0;
        return row;
    }
}
