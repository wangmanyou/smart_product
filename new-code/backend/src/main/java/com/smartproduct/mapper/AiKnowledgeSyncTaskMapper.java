package com.smartproduct.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;

public interface AiKnowledgeSyncTaskMapper extends BaseMapper<AiKnowledgeSyncTaskEntity> {

    @Select("""
            SELECT *
            FROM ai_knowledge_sync_task
            WHERE task_status IN ('PENDING', 'PARSING')
              AND (next_retry_at IS NULL OR next_retry_at <= #{dueBefore})
            ORDER BY CASE WHEN task_status = 'PARSING' THEN 0 ELSE 1 END, id
            LIMIT 1
            FOR UPDATE SKIP LOCKED
            """)
    AiKnowledgeSyncTaskEntity selectNextForUpdate(@Param("dueBefore") LocalDateTime dueBefore);
}
