package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("knowledge_change_request")
public class KnowledgeChangeRequestEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("request_type")
    public String requestType;
    public String status;
    @TableField("knowledge_id")
    public Long knowledgeId;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    @TableField("payload_json")
    public String payloadJson;
    @TableField("before_json")
    public String beforeJson;
    public String reason;
    @TableField("applicant_id")
    public Long applicantId;
    @TableField("applicant_name")
    public String applicantName;
    @TableField("reviewer_id")
    public Long reviewerId;
    @TableField("reviewer_name")
    public String reviewerName;
    @TableField("review_comment")
    public String reviewComment;
    @TableField("reviewed_at")
    public LocalDateTime reviewedAt;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
    public Integer del;
}
