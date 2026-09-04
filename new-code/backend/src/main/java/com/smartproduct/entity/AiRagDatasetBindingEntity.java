package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("ai_rag_dataset_binding")
public class AiRagDatasetBindingEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    @TableField("ragflow_dataset_id")
    public String ragflowDatasetId;
    @TableField("dataset_name")
    public String datasetName;
    public String status;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
}
