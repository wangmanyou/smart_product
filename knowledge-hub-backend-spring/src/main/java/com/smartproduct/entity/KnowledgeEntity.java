package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("knowledge")
public class KnowledgeEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    @TableField("view_time")
    public Long viewTime;
    @TableField("view_at")
    public LocalDateTime viewAt;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
    @TableField("creator_id")
    public Long creatorId;
    @TableField("creator_name")
    public String creatorName;
    public Integer del;
}
