package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("ai_chat_message")
public class AiChatMessageEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("session_id")
    public Long sessionId;
    @TableField("user_id")
    public Long userId;
    public String role;
    public String content;
    @TableField("reference_json")
    public String referenceJson;
    @TableField("model_name")
    public String modelName;
    @TableField("latency_ms")
    public Long latencyMs;
    public String feedback;
    @TableField("create_at")
    public LocalDateTime createAt;
}
