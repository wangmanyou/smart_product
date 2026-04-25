package com.smartproduct.user;

import com.smartproduct.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;

@Service
public class UserService {
    private static final String PASSWORD_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    private final UserRepository users;
    private final TokenService tokens;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Random random = new SecureRandom();

    public UserService(UserRepository users, TokenService tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    public Map<String, Object> login(String account, String password) {
        UserRow user = users.findByAccount(account)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST.value(), "用户不存在"));
        if (Boolean.TRUE.equals(user.disabled())) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "账号已停用");
        }
        if (!passwordEncoder.matches(password, user.password())) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "密码错误");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", tokens.issue(user.id()));
        return result;
    }

    public UserDto current(String authorization) {
        return detail(tokens.resolve(authorization));
    }

    public UserDto detail(Long userId) {
        return users.findById(userId)
                .map(UserDto::fromRow)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND.value(), "用户不存在"));
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String account, String nickname, String email, String phone, String sex, String disabled) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", users.list(pageNumber, pageSize, account, nickname, email, phone, sex, disabled).stream().map(UserDto::fromRow).toList());
        result.put("totalElements", users.count(account, nickname, email, phone, sex, disabled));
        return result;
    }

    public Map<String, Object> add(UserRequests.AddUserRequest request) {
        if (request.userAccount == null || request.userAccount.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请输入用户账号");
        }
        if (request.userPassword == null || !request.userPassword.matches("[A-Za-z0-9]{6,50}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "密码只能包含数字、大小写字母，至少6位长度");
        }
        users.findByAccount(request.userAccount).ifPresent(u -> {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "用户账号已存在");
        });
        Long userId = users.insert(request, passwordEncoder.encode(request.userPassword));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", userId);
        return result;
    }

    public void edit(UserRequests.EditUserRequest request) {
        users.update(request);
    }

    public void editStatus(UserRequests.EditStatusRequest request) {
        users.updateDisabled(request.userId, Boolean.TRUE.equals(request.isDisabled));
    }

    public void delete(Long userId) {
        users.softDelete(userId);
    }

    public void resetPassword(UserRequests.ResetPasswordRequest request) {
        if (request.userPassword == null || !request.userPassword.matches("[A-Za-z0-9]{6,50}")) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "密码只能包含数字、大小写字母，至少6位长度");
        }
        users.updatePassword(request.userId, passwordEncoder.encode(request.userPassword));
    }

    public Map<String, Object> randomPassword() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < 12; i++) {
            builder.append(PASSWORD_CHARS.charAt(random.nextInt(PASSWORD_CHARS.length())));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("randomPassword", builder.toString());
        return result;
    }
}
