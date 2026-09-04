package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("ai_knowledge_sync_task")
public class AiKnowledgeSyncTaskEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("knowledge_id")
    public Long knowledgeId;
    @TableField("knowledge_version")
    public Integer knowledgeVersion;
    @TableField("task_type")
    public String taskType;
    @TableField("task_status")
    public String taskStatus;
    @TableField("retry_count")
    public Integer retryCount;
    @TableField("next_retry_at")
    public LocalDateTime nextRetryAt;
    @TableField("error_message")
    public String errorMessage;
    @TableField("rerun_required")
    public Boolean rerunRequired;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("started_at")
    public LocalDateTime startedAt;
    @TableField("finished_at")
    public LocalDateTime finishedAt;
}

