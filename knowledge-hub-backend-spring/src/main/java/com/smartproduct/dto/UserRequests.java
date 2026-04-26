package com.smartproduct.dto;

public final class UserRequests {
    private UserRequests() {
    }

    public static class AddUserRequest {
        public String userAccount;
        public String userNickname;
        public String userPassword;
        public String userEmail;
        public String userPhoneNum;
        public String userSex;
        public String userPicture;
    }

    public static class EditUserRequest {
        public Long userId;
        public String userNickname;
        public String userEmail;
        public String userPhoneNum;
        public String userSex;
        public String userPicture;
    }

    public static class UserIdRequest {
        public Long userId;
    }

    public static class EditStatusRequest {
        public Long userId;
        public Boolean isDisabled;
    }

    public static class ResetPasswordRequest {
        public Long userId;
        public String userPassword;
    }
}
