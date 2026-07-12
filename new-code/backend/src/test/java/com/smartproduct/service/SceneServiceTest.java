package com.smartproduct.service;

import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.mapper.DictTemplateMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.shared.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SceneServiceTest {
    private SceneItemMapper sceneItems;
    private KnowledgeMapper knowledge;
    private KnowledgeItemMapper knowledgeItems;
    private AccessLogService accessLogs;
    private SceneService service;

    @BeforeEach
    void setUp() {
        sceneItems = mock(SceneItemMapper.class);
        knowledge = mock(KnowledgeMapper.class);
        knowledgeItems = mock(KnowledgeItemMapper.class);
        accessLogs = mock(AccessLogService.class);
        service = new SceneService(
                mock(SceneTemplateMapper.class),
                sceneItems,
                mock(DictTemplateMapper.class),
                knowledge,
                knowledgeItems,
                mock(TokenService.class),
                mock(CurrentUserService.class),
                accessLogs
        );
    }

    @Test
    void deletesFieldWhenAllStoredValuesAreEmpty() {
        SceneItemEntity field = sceneItem(7L, 3L, "临时字段");
        when(sceneItems.selectById(7L)).thenReturn(field);
        when(knowledgeItems.selectList(any())).thenReturn(List.of(
                knowledgeItem(101L, "", ""),
                knowledgeItem(102L, "   ", "[]"),
                knowledgeItem(103L, null, null)
        ));

        service.deleteItem(7L);

        verify(knowledgeItems).delete(any());
        verify(sceneItems).deleteById(7L);
        verify(accessLogs).success(
                "场景管理", "SCENE_ITEM_DELETE", "SCENE_ITEM", 7L, 3L, "删除场景字段：临时字段");
    }

    @Test
    void rejectsDeletionWhenTextFieldContainsData() {
        when(sceneItems.selectById(7L)).thenReturn(sceneItem(7L, 3L, "说明"));
        when(knowledgeItems.selectList(any())).thenReturn(List.of(
                knowledgeItem(101L, "已有内容", "")
        ));

        assertThatThrownBy(() -> service.deleteItem(7L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("1 条知识填写了内容");

        verify(knowledgeItems, never()).delete(any());
        verify(sceneItems, never()).deleteById(7L);
    }

    @Test
    void rejectsDeletionWhenDirectoryFieldContainsSelection() {
        when(sceneItems.selectById(7L)).thenReturn(sceneItem(7L, 3L, "目录"));
        when(knowledgeItems.selectList(any())).thenReturn(List.of(
                knowledgeItem(101L, "", "[12]")
        ));

        assertThatThrownBy(() -> service.deleteItem(7L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("1 条知识填写了内容");

        verify(knowledgeItems, never()).delete(any());
        verify(sceneItems, never()).deleteById(7L);
    }

    @Test
    void reportsHowManyHistoricalKnowledgeRecordsAreMissingARequiredValue() {
        SceneItemEntity field = sceneItem(7L, 3L, "说明");
        field.type = "text";
        when(sceneItems.selectById(7L)).thenReturn(field);
        when(knowledge.selectList(any())).thenReturn(List.of(
                knowledge(101L),
                knowledge(102L),
                knowledge(103L)
        ));
        when(knowledgeItems.selectList(any())).thenReturn(List.of(
                knowledgeItem(101L, "已填写", ""),
                knowledgeItem(102L, "", "")
        ));

        Map<String, Object> result = service.requiredEligibility(7L);

        assertThat(result.get("canSetRequired")).isEqualTo(false);
        assertThat(result.get("missingKnowledgeCount")).isEqualTo(2L);
    }

    @Test
    void previewsSafeTextToRichTextMigration() {
        SceneItemEntity field = sceneItem(7L, 3L, "内容");
        field.type = "text";
        when(sceneItems.selectById(7L)).thenReturn(field);
        when(knowledgeItems.selectList(any())).thenReturn(List.of(
                knowledgeItem(101L, "第一段\n第二段", ""),
                knowledgeItem(102L, "", "")
        ));

        Map<String, Object> result = service.typeMigrationPreview(7L, "richtext");

        assertThat(result.get("canMigrate")).isEqualTo(true);
        assertThat(result.get("affectedKnowledgeCount")).isEqualTo(1L);
        assertThat(result.get("invalidKnowledgeCount")).isEqualTo(0L);
    }

    @Test
    void rejectsTextToTitlePreviewWhenHistoricalValueIsTooLong() {
        SceneItemEntity field = sceneItem(7L, 3L, "主题");
        field.type = "text";
        when(sceneItems.selectById(7L)).thenReturn(field);
        when(knowledgeItems.selectList(any())).thenReturn(List.of(
                knowledgeItem(101L, "x".repeat(121), "")
        ));

        Map<String, Object> result = service.typeMigrationPreview(7L, "title");

        assertThat(result.get("canMigrate")).isEqualTo(false);
        assertThat(result.get("invalidKnowledgeCount")).isEqualTo(1L);
    }

    private static SceneItemEntity sceneItem(Long id, Long sceneTemplateId, String name) {
        SceneItemEntity item = new SceneItemEntity();
        item.id = id;
        item.sceneTemplateId = sceneTemplateId;
        item.name = name;
        return item;
    }

    private static KnowledgeItemEntity knowledgeItem(Long knowledgeId, String value, String directoryIds) {
        KnowledgeItemEntity item = new KnowledgeItemEntity();
        item.knowledgeId = knowledgeId;
        item.sceneItemValue = value;
        item.selectDictTreeIds = directoryIds;
        return item;
    }

    private static KnowledgeEntity knowledge(Long id) {
        KnowledgeEntity item = new KnowledgeEntity();
        item.id = id;
        return item;
    }
}
