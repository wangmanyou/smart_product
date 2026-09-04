package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("ai_knowledge_document")
public class AiKnowledgeDocumentEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("knowledge_id")
    public Long knowledgeId;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    @TableField("knowledge_version")
    public Integer knowledgeVersion;
    @TableField("source_type")
    public String sourceType;
    @TableField("source_key")
    public String sourceKey;
    @TableField("ragflow_dataset_id")
    public String ragflowDatasetId;
    @TableField("ragflow_document_id")
    public String ragflowDocumentId;
    @TableField("content_hash")
    public String contentHash;
    @TableField("pending_ragflow_dataset_id")
    public String pendingRagflowDatasetId;
    @TableField("pending_ragflow_document_id")
    public String pendingRagflowDocumentId;
    @TableField("pending_content_hash")
    public String pendingContentHash;
    @TableField("pending_knowledge_version")
    public Integer pendingKnowledgeVersion;
    @TableField("sync_status")
    public String syncStatus;
    @TableField("sync_error")
    public String syncError;
    @TableField("last_sync_at")
    public LocalDateTime lastSyncAt;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
}
