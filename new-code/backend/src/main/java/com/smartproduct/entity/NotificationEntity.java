package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("notification")
public class NotificationEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("recipient_id")
    public Long recipientId;
    @TableField("sender_id")
    public Long senderId;
    @TableField("sender_name")
    public String senderName;
    public String type;
    public String title;
    public String content;
    @TableField("biz_type")
    public String bizType;
    @TableField("biz_id")
    public Long bizId;
    @TableField("link_url")
    public String linkUrl;
    @TableField("payload_json")
    public String payloadJson;
    public String level;
    @TableField("read_at")
    public LocalDateTime readAt;
    public Integer archived;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
}
