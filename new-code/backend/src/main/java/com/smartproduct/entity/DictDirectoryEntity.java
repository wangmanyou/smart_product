package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("dict_directory")
public class DictDirectoryEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("dict_template_id")
    public Long dictTemplateId;
    @TableField("is_disabled")
    public Boolean isDisabled;
    @TableField("is_used")
    public Boolean isUsed;
    public String name;
    @TableField("parent_id")
    public Long parentId;
    public Long level;
    @TableField("sort_number")
    public Long sortNumber;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
    public Integer del;
}
