package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("user_role")
public class UserRoleEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("user_id")
    public Long userId;
    @TableField("role_id")
    public Long roleId;
    @TableField("create_at")
    public LocalDateTime createAt;
}
