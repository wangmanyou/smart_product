package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.dto.UserDto;
import com.smartproduct.dto.UserRequests;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.mapper.RoleMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Random;

@Service
public class UserService {
    private static final String PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~";

    private final UserMapper users;
    private final RoleMapper roles;
    private final TokenService tokens;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Random random = new SecureRandom();

    public UserService(UserMapper users, RoleMapper roles, TokenService tokens) {
        this.users = users;
        this.roles = roles;
        this.tokens = tokens;
    }

    public Map<String, Object> login(String account, String password) {
        UserEntity user = users.selectOne(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getAccount, account)
                .eq(UserEntity::getDel, 0)
                .eq(UserEntity::getDisabled, false));
        if (user == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "用户不存在");
        }
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "密码错误");
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("token", tokens.issue(user.getId(), user.getAccount()));
        return result;
    }

    public UserDto current(String authorization) {
        return detail(tokens.resolve(authorization).userId());
    }

    public UserDto detail(Long userId) {
        UserEntity user = users.selectOne(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getId, userId)
                .eq(UserEntity::getDel, 0));
        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "用户不存在");
        }
        UserDto dto = UserDto.fromEntity(user);
        RoleEntity role = user.getRoleId() == null ? null : roles.selectById(user.getRoleId());
        dto.setting = parseSetting(role == null ? null : role.settingJson);
        return dto;
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String account, String nickname, String email, String phone, String sex, String disabled) {
        Page<UserEntity> page = users.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query(account, nickname, email, phone, sex, disabled)
                .orderByDesc(UserEntity::getUpdateAt)
                .orderByDesc(UserEntity::getId));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(UserDto::fromEntity).toList());
        result.put("totalElements", page.getTotal());
        return result;
    }

    public Map<String, Object> add(UserRequests.AddUserRequest request) {
        if (request.userAccount == null || request.userAccount.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请输入用户账号");
        }
        if (request.userPassword == null || request.userPassword.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请输入用户密码");
        }
        UserEntity existing = users.selectOne(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getAccount, request.userAccount)
                .eq(UserEntity::getDel, 0));
        if (existing != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "用户账号已存在");
        }

        LocalDateTime now = LocalDateTime.now();
        UserEntity user = new UserEntity();
        user.setBuiltin(false);
        user.setAccount(request.userAccount);
        user.setNickname(empty(request.userNickname));
        user.setRoleId(request.roleId == null ? 0L : request.roleId);
        user.setPassword(passwordEncoder.encode(request.userPassword));
        user.setEmail(empty(request.userEmail));
        user.setDisabled(false);
        user.setPhoneNum(empty(request.userPhoneNum));
        user.setSex(empty(request.userSex));
        user.setPicture(empty(request.userPicture));
        user.setDel(0);
        user.setCreateAt(now);
        user.setUpdateAt(now);
        users.insert(user);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", user.getId());
        return result;
    }

    public void edit(UserRequests.EditUserRequest request) {
        users.update(new LambdaUpdateWrapper<UserEntity>()
                .eq(UserEntity::getId, request.userId)
                .eq(UserEntity::getDel, 0)
                .set(UserEntity::getNickname, empty(request.userNickname))
                .set(UserEntity::getEmail, empty(request.userEmail))
                .set(UserEntity::getPhoneNum, empty(request.userPhoneNum))
                .set(UserEntity::getSex, empty(request.userSex))
                .set(UserEntity::getPicture, empty(request.userPicture))
                .set(request.roleId != null, UserEntity::getRoleId, request.roleId)
                .set(UserEntity::getUpdateAt, LocalDateTime.now()));
    }

    public void editStatus(UserRequests.EditStatusRequest request) {
        users.update(new LambdaUpdateWrapper<UserEntity>()
                .eq(UserEntity::getId, request.userId)
                .set(UserEntity::getDisabled, Boolean.TRUE.equals(request.isDisabled))
                .set(UserEntity::getUpdateAt, LocalDateTime.now()));
    }

    public void delete(Long userId) {
        users.deleteById(userId);
    }

    public void resetPassword(UserRequests.ResetPasswordRequest request) {
        if (request.userPassword == null || request.userPassword.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请输入用户密码");
        }
        users.update(new LambdaUpdateWrapper<UserEntity>()
                .eq(UserEntity::getId, request.userId)
                .set(UserEntity::getPassword, passwordEncoder.encode(request.userPassword))
                .set(UserEntity::getUpdateAt, LocalDateTime.now()));
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

    private static LambdaQueryWrapper<UserEntity> query(String account, String nickname, String email, String phone, String sex, String disabled) {
        LambdaQueryWrapper<UserEntity> wrapper = new LambdaQueryWrapper<UserEntity>().eq(UserEntity::getDel, 0);
        if (account != null && !account.isBlank()) {
            wrapper.like(UserEntity::getAccount, account);
        }
        if (nickname != null && !nickname.isBlank()) {
            wrapper.like(UserEntity::getNickname, nickname);
        }
        if (email != null && !email.isBlank()) {
            wrapper.like(UserEntity::getEmail, email);
        }
        if (phone != null && !phone.isBlank()) {
            wrapper.like(UserEntity::getPhoneNum, phone);
        }
        if (sex != null && !sex.isBlank()) {
            wrapper.eq(UserEntity::getSex, sex);
        }
        if ("enabled".equals(disabled)) {
            wrapper.eq(UserEntity::getDisabled, false);
        } else if ("disabled".equals(disabled)) {
            wrapper.eq(UserEntity::getDisabled, true);
        }
        return wrapper;
    }

    private static String empty(String value) {
        return value == null ? "" : value;
    }

    private static Object parseSetting(String value) {
        if (value == null || value.isBlank()) {
            return Map.of();
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(value, Object.class);
        } catch (Exception ex) {
            return Map.of();
        }
    }
}
