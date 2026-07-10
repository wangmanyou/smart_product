package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("role")
public class RoleEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("is_disabled")
    public Boolean isDisabled;
    @TableField("is_builtin")
    public Boolean isBuiltin;
    @TableField("is_used")
    public Boolean isUsed;
    public String name;
    public String remark;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
    public Integer del;
}
