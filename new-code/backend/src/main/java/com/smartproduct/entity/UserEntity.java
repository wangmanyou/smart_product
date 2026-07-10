package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

import java.time.LocalDateTime;

@TableName("`user`")
public class UserEntity {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("is_disabled")
    private Boolean disabled;
    @TableField("is_builtin")
    private Boolean builtin;
    private String account;
    private String nickname;
    private String email;
    @TableField("phone_num")
    private String phoneNum;
    private String sex;
    private String password;
    private String picture;
    @TableField("create_at")
    private LocalDateTime createAt;
    @TableField("update_at")
    private LocalDateTime updateAt;
    private Integer del;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Boolean getDisabled() { return disabled; }
    public void setDisabled(Boolean disabled) { this.disabled = disabled; }
    public Boolean getBuiltin() { return builtin; }
    public void setBuiltin(Boolean builtin) { this.builtin = builtin; }
    public String getAccount() { return account; }
    public void setAccount(String account) { this.account = account; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhoneNum() { return phoneNum; }
    public void setPhoneNum(String phoneNum) { this.phoneNum = phoneNum; }
    public String getSex() { return sex; }
    public void setSex(String sex) { this.sex = sex; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getPicture() { return picture; }
    public void setPicture(String picture) { this.picture = picture; }
    public LocalDateTime getCreateAt() { return createAt; }
    public void setCreateAt(LocalDateTime createAt) { this.createAt = createAt; }
    public LocalDateTime getUpdateAt() { return updateAt; }
    public void setUpdateAt(LocalDateTime updateAt) { this.updateAt = updateAt; }
    public Integer getDel() { return del; }
    public void setDel(Integer del) { this.del = del; }
}
