package com.smartproduct.dto;

import com.smartproduct.entity.UserEntity;

import java.time.LocalDateTime;

public class UserDto {
    public Long userId;
    public String userAccount;
    public String userNickname;
    public String userEmail;
    public String userPhoneNum;
    public String userSex;
    public String userPicture;
    public Long roleId;
    public Boolean isDisabled;
    public Boolean isBuiltin;
    public Object setting;
    public Long createTime;
    public Long updateTime;

    public static UserDto fromEntity(UserEntity user) {
        UserDto dto = new UserDto();
        dto.userId = user.getId();
        dto.userAccount = user.getAccount();
        dto.userNickname = user.getNickname();
        dto.userEmail = user.getEmail();
        dto.userPhoneNum = user.getPhoneNum();
        dto.userSex = user.getSex();
        dto.userPicture = user.getPicture();
        dto.roleId = user.getRoleId();
        dto.isDisabled = user.getDisabled();
        dto.isBuiltin = user.getBuiltin();
        dto.createTime = toEpoch(user.getCreateAt());
        dto.updateTime = toEpoch(user.getUpdateAt());
        return dto;
    }

    private static Long toEpoch(LocalDateTime time) {
        return time == null ? null : time.atZone(java.time.ZoneId.systemDefault()).toEpochSecond();
    }
}
