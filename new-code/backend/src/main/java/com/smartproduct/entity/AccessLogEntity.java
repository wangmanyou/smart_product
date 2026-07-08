package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("access_log")
public class AccessLogEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("user_id")
    public Long userId;
    @TableField("user_account")
    public String userAccount;
    public String module;
    public String action;
    @TableField("biz_type")
    public String bizType;
    @TableField("biz_id")
    public Long bizId;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    public String description;
    @TableField("request_method")
    public String requestMethod;
    @TableField("request_path")
    public String requestPath;
    @TableField("ip_address")
    public String ipAddress;
    @TableField("user_agent")
    public String userAgent;
    public String result;
    @TableField("error_message")
    public String errorMessage;
    @TableField("create_at")
    public LocalDateTime createAt;
}
