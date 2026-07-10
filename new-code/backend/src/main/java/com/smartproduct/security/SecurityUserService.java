package com.smartproduct.security;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.entity.UserRoleEntity;
import com.smartproduct.mapper.RoleMapper;
import com.smartproduct.mapper.SysPermissionMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.mapper.UserRoleMapper;
import com.smartproduct.service.RoleSettingRepository;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Service
public class SecurityUserService {
    private final UserMapper users;
    private final RoleMapper roles;
    private final UserRoleMapper userRoles;
    private final SysPermissionMapper permissions;
    private final RoleSettingRepository roleSettings;

    public SecurityUserService(UserMapper users, RoleMapper roles, UserRoleMapper userRoles, SysPermissionMapper permissions, RoleSettingRepository roleSettings) {
        this.users = users;
        this.roles = roles;
        this.userRoles = userRoles;
        this.permissions = permissions;
        this.roleSettings = roleSettings;
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
                .map(roleSettings::load)
                .toList();
        boolean admin = Boolean.TRUE.equals(user.getBuiltin())
                || roleIds.contains(1L);

        Set<String> permissions = settings.stream()
                .flatMap(setting -> setting.operationPermissions.stream())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        Map<String, Set<Long>> directPermissionSceneIds = new LinkedHashMap<>();
        Map<String, Set<Long>> approvalRequiredPermissionSceneIds = new LinkedHashMap<>();
        for (RoleSetting setting : settings) {
            for (String permission : setting.operationPermissions) {
                boolean requiresApproval = Boolean.TRUE.equals(setting.approvalRequired.get(permission));
                Map<String, Set<Long>> target = requiresApproval ? approvalRequiredPermissionSceneIds : directPermissionSceneIds;
                target.computeIfAbsent(permission, ignored -> new LinkedHashSet<>()).addAll(setting.sceneTemplateIds);
            }
        }
        if (admin) {
            permissions.add(PermissionCodes.ADMIN);
            permissions.addAll(enabledPermissionCodes());
        }
        List<String> approvalRequired = approvalRequiredPermissionSceneIds.entrySet().stream()
                .filter(entry -> {
                    Set<Long> directScenes = directPermissionSceneIds.getOrDefault(entry.getKey(), Set.of());
                    return entry.getValue().stream().anyMatch(sceneId -> !directScenes.contains(sceneId));
                })
                .map(Map.Entry::getKey)
                .distinct()
                .toList();
        if (!approvalRequired.isEmpty()) {
            permissions.add(PermissionCodes.CHANGE_REQUEST_VIEW_OWN);
        }
        Set<Long> sceneTemplateIds = settings.stream()
                .flatMap(setting -> setting.sceneTemplateIds.stream())
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        return new CurrentUser(
                user.getId(),
                user.getAccount(),
                roleIds,
                admin,
                permissions,
                sceneTemplateIds,
                approvalRequired,
                directPermissionSceneIds,
                approvalRequiredPermissionSceneIds
        );
    }

    private Set<Long> roleIds(UserEntity user) {
        Set<Long> ids = userRoles.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserRoleEntity>()
                        .eq("user_id", user.getId()))
                .stream()
                .map(row -> row.roleId)
                .filter(id -> id != null && id > 0)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        return ids;
    }

    private Set<String> enabledPermissionCodes() {
        Set<String> codes = new LinkedHashSet<>(PermissionCodes.allOperationPermissions());
        permissions.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<com.smartproduct.entity.SysPermissionEntity>()
                        .eq("status", "ENABLED"))
                .forEach(permission -> codes.add(permission.code));
        return codes;
    }

}
