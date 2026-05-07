package com.smartproduct.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.entity.UserRoleEntity;
import com.smartproduct.mapper.RoleMapper;
import com.smartproduct.mapper.SysPermissionMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.mapper.UserRoleMapper;
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
    private final UserRoleMapper userRoles;
    private final SysPermissionMapper permissions;

    public SecurityUserService(UserMapper users, RoleMapper roles, UserRoleMapper userRoles, SysPermissionMapper permissions) {
        this.users = users;
        this.roles = roles;
        this.userRoles = userRoles;
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
        Set<Long> roleIds = roleIds(user);
        List<RoleSetting> settings = roleIds.isEmpty() ? List.of() : roles.selectBatchIds(roleIds).stream()
                .filter(role -> role != null && !Boolean.TRUE.equals(role.isDisabled) && role.del != null && role.del == 0)
                .map(role -> parseSetting(role.settingJson))
                .toList();
        boolean admin = Boolean.TRUE.equals(user.getBuiltin())
                || roleIds.contains(1L)
                || settings.stream().anyMatch(setting -> setting.admin);

        Set<String> permissions = settings.stream()
                .flatMap(setting -> setting.operationPermissions.stream())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (admin) {
            permissions.add(PermissionCodes.ADMIN);
            permissions.addAll(enabledPermissionCodes());
        }
        List<String> approvalRequired = settings.stream()
                .flatMap(setting -> setting.approvalRequired.entrySet().stream())
                .filter(entry -> Boolean.TRUE.equals(entry.getValue()))
                .map(java.util.Map.Entry::getKey)
                .distinct()
                .toList();
        Set<Long> sceneTemplateIds = settings.stream()
                .flatMap(setting -> setting.sceneTemplateIds.stream())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        return new CurrentUser(
                user.getId(),
                user.getAccount(),
                user.getRoleId(),
                roleIds,
                admin,
                permissions,
                sceneTemplateIds,
                approvalRequired
        );
    }

    private Set<Long> roleIds(UserEntity user) {
        Set<Long> ids = userRoles.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserRoleEntity>()
                        .eq("user_id", user.getId()))
                .stream()
                .map(row -> row.roleId)
                .filter(id -> id != null && id > 0)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        if (ids.isEmpty() && user.getRoleId() != null && user.getRoleId() > 0) {
            ids.add(user.getRoleId());
        }
        return ids;
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
