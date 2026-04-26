package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("dict_template")
public class DictTemplateEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String name;
    public String type;
    @TableField("is_builtin")
    public Boolean isBuiltin;
    @TableField("is_disabled")
    public Boolean isDisabled;
    @TableField("is_used")
    public Boolean isUsed;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
    @TableField("user_id")
    public Long creatorId;
    @TableField("user_name")
    public String creatorName;
    public Integer del;
}
