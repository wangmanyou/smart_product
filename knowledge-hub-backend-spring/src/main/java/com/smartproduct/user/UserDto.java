package com.smartproduct.user;

import java.time.LocalDateTime;

public class UserDto {
    public Long userId;
    public String userAccount;
    public String userNickname;
    public String userEmail;
    public String userPhoneNum;
    public String userSex;
    public String userPicture;
    public Boolean isDisabled;
    public Boolean isBuiltin;
    public Long createTime;
    public Long updateTime;

    static UserDto fromRow(UserRow row) {
        UserDto dto = new UserDto();
        dto.userId = row.id();
        dto.userAccount = row.account();
        dto.userNickname = row.nickname();
        dto.userEmail = row.email();
        dto.userPhoneNum = row.phoneNum();
        dto.userSex = row.sex();
        dto.userPicture = row.picture();
        dto.isDisabled = row.disabled();
        dto.isBuiltin = row.builtin();
        dto.createTime = toEpoch(row.createAt());
        dto.updateTime = toEpoch(row.updateAt());
        return dto;
    }

    private static Long toEpoch(LocalDateTime time) {
        return time == null ? null : time.atZone(java.time.ZoneId.systemDefault()).toEpochSecond();
    }
}
