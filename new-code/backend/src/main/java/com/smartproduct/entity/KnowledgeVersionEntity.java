package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("knowledge_version")
public class KnowledgeVersionEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("knowledge_id")
    public Long knowledgeId;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    @TableField("version_no")
    public Integer versionNo;
    @TableField("operation_type")
    public String operationType;
    @TableField("operator_id")
    public Long operatorId;
    @TableField("operator_name")
    public String operatorName;
    @TableField("change_summary")
    public String changeSummary;
    @TableField("before_snapshot_json")
    public String beforeSnapshotJson;
    @TableField("after_snapshot_json")
    public String afterSnapshotJson;
    @TableField("create_at")
    public LocalDateTime createAt;
}
