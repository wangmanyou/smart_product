package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.ai.service.AiKnowledgeSyncTaskService;
import com.smartproduct.entity.KnowledgeVersionEntity;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.KnowledgeVersionMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.security.CurrentUserService;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class KnowledgeVersionServiceAiSyncTest {

    @Test
    void deletingKnowledgeCreatesADeleteOutboxTaskForTheRecordedVersion() {
        KnowledgeVersionMapper versions = mock(KnowledgeVersionMapper.class);
        when(versions.selectOne(any(QueryWrapper.class))).thenReturn(null);
        AiKnowledgeSyncTaskService syncTasks = mock(AiKnowledgeSyncTaskService.class);
        KnowledgeVersionService service = new KnowledgeVersionService(
                versions,
                mock(KnowledgeMapper.class),
                mock(KnowledgeItemMapper.class),
                mock(SceneItemMapper.class),
                mock(DictDirectoryMapper.class),
                mock(CurrentUserService.class),
                syncTasks
        );

        service.recordDelete(99L, 1L, "admin", Map.of("sceneTemplateId", 8L));

        verify(versions).insert(any(KnowledgeVersionEntity.class));
        verify(syncTasks).enqueueDelete(99L, 1);
    }
}
