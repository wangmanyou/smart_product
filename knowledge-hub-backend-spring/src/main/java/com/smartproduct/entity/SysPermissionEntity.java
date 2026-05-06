package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("sys_permission")
public class SysPermissionEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String code;
    public String name;
    public String type;
    public String module;
    public String description;
    public String status;
    @TableField("sort_number")
    public Integer sortNumber;
    @TableField("create_at")
    public LocalDateTime createAt;
    @TableField("update_at")
    public LocalDateTime updateAt;
}
