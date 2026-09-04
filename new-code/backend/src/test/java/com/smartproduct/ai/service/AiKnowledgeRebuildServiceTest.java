package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.mapper.AiKnowledgeDocumentMapper;
import com.smartproduct.mapper.AiKnowledgeSyncTaskMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiKnowledgeRebuildServiceTest {

    @Test
    void rebuildsOnlyWithinUsersScopedSceneAndReportsSkippedActiveTasks() {
        KnowledgeMapper knowledge = mock(KnowledgeMapper.class);
        AiKnowledgeSyncTaskService tasks = mock(AiKnowledgeSyncTaskService.class);
        CurrentUserService currentUsers = mock(CurrentUserService.class);
        when(currentUsers.current()).thenReturn(scopedUser(8L));
        when(knowledge.selectList(any(QueryWrapper.class))).thenReturn(List.of(knowledge(15L, 8L), knowledge(16L, 8L)));
        when(tasks.enqueueRebuild(15L)).thenReturn(true);
        when(tasks.enqueueRebuild(16L)).thenReturn(false);
        AiKnowledgeRebuildService service = service(knowledge, tasks, currentUsers);

        Map<String, Object> result = service.enqueue(8L);

        assertThat(result).containsEntry("sceneTemplateId", 8L)
                .containsEntry("knowledgeCount", 2)
                .containsEntry("queuedTaskCount", 1)
                .containsEntry("skippedActiveTaskCount", 1);
        verify(tasks).enqueueRebuild(15L);
        verify(tasks).enqueueRebuild(16L);
    }

    @Test
    void rejectsRebuildOutsideUsersScopedScenes() {
        KnowledgeMapper knowledge = mock(KnowledgeMapper.class);
        AiKnowledgeSyncTaskService tasks = mock(AiKnowledgeSyncTaskService.class);
        CurrentUserService currentUsers = mock(CurrentUserService.class);
        when(currentUsers.current()).thenReturn(scopedUser(8L));
        AiKnowledgeRebuildService service = service(knowledge, tasks, currentUsers);

        assertThatThrownBy(() -> service.enqueue(9L))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("没有管理该场景");
        verify(knowledge, never()).selectList(any(QueryWrapper.class));
    }

    @Test
    void disabledAiRejectsRebuildBeforeReadingUserOrKnowledge() {
        AiProperties properties = new AiProperties();
        KnowledgeMapper knowledge = mock(KnowledgeMapper.class);
        AiKnowledgeSyncTaskService tasks = mock(AiKnowledgeSyncTaskService.class);
        CurrentUserService currentUsers = mock(CurrentUserService.class);
        AiKnowledgeRebuildService service = new AiKnowledgeRebuildService(
                properties, knowledge, mock(AiKnowledgeSyncTaskMapper.class),
                mock(AiKnowledgeDocumentMapper.class), tasks, currentUsers
        );

        assertThatThrownBy(() -> service.enqueue(null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("尚未启用");
        verify(currentUsers, never()).current();
    }

    private static AiKnowledgeRebuildService service(KnowledgeMapper knowledge,
                                                      AiKnowledgeSyncTaskService tasks,
                                                      CurrentUserService currentUsers) {
        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        return new AiKnowledgeRebuildService(
                properties, knowledge, mock(AiKnowledgeSyncTaskMapper.class),
                mock(AiKnowledgeDocumentMapper.class), tasks, currentUsers
        );
    }

    private static CurrentUser scopedUser(Long sceneId) {
        return new CurrentUser(
                1L,
                "tester",
                Set.of(1L),
                false,
                Set.of(),
                Set.of(sceneId),
                List.of(),
                Map.of(PermissionCodes.AI_KNOWLEDGE_SYNC, Set.of(sceneId)),
                Map.of()
        );
    }

    private static KnowledgeEntity knowledge(Long id, Long sceneId) {
        KnowledgeEntity row = new KnowledgeEntity();
        row.id = id;
        row.sceneTemplateId = sceneId;
        row.del = 0;
        return row;
    }
}
