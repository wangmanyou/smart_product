package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("ai_chat_session")
public class AiChatSessionEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("user_id")
    public Long userId;
    public String title;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
}
