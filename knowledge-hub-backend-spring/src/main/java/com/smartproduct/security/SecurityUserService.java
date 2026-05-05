package com.smartproduct.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.mapper.RoleMapper;
import com.smartproduct.mapper.SysPermissionMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class SecurityUserService {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final UserMapper users;
    private final RoleMapper roles;
    private final SysPermissionMapper permissions;

    public SecurityUserService(UserMapper users, RoleMapper roles, SysPermissionMapper permissions) {
        this.users = users;
        this.roles = roles;
        this.permissions = permissions;
    }

    public CurrentUser load(Long userId) {
        UserEntity user = users.selectOne(new LambdaQueryWrapper<UserEntity>()
                .eq(UserEntity::getId, userId)
                .eq(UserEntity::getDel, 0)
                .eq(UserEntity::getDisabled, false));
        if (user == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "请重新登录");
        }
        RoleEntity role = user.getRoleId() == null ? null : roles.selectById(user.getRoleId());
        RoleSetting setting = parseSetting(role == null ? null : role.settingJson);
        boolean admin = setting.admin || Boolean.TRUE.equals(user.getBuiltin()) || user.getRoleId() != null && user.getRoleId() == 1L;

        Set<String> permissions = new LinkedHashSet<>(setting.operationPermissions);
        if (admin) {
            permissions.add(PermissionCodes.ADMIN);
            permissions.addAll(enabledPermissionCodes());
        }
        List<String> approvalRequired = setting.approvalRequired.entrySet().stream()
                .filter(entry -> Boolean.TRUE.equals(entry.getValue()))
                .map(java.util.Map.Entry::getKey)
                .toList();
        return new CurrentUser(
                user.getId(),
                user.getAccount(),
                user.getRoleId(),
                admin,
                permissions,
                new LinkedHashSet<>(setting.sceneTemplateIds),
                approvalRequired
        );
    }

    private Set<String> enabledPermissionCodes() {
        Set<String> codes = new LinkedHashSet<>(PermissionCodes.allOperationPermissions());
        permissions.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<com.smartproduct.entity.SysPermissionEntity>()
                        .eq("status", "ENABLED"))
                .forEach(permission -> codes.add(permission.code));
        return codes;
    }

    private static RoleSetting parseSetting(String json) {
        if (json == null || json.isBlank()) {
            return new RoleSetting();
        }
        try {
            return JSON.readValue(json, RoleSetting.class);
        } catch (Exception ignored) {
            return new RoleSetting();
        }
    }
}
