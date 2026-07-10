package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.dto.UserDto;
import com.smartproduct.dto.UserRequests;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.entity.UserRoleEntity;
import com.smartproduct.mapper.RoleMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.mapper.UserRoleMapper;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class UserService {
    private static final String PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~";
    private static final String KNOWLEDGE_PAGE_CODE = "page:knowledge";

    private final UserMapper users;
    private final RoleMapper roles;
    private final UserRoleMapper userRoles;
    private final TokenService tokens;
    private final RoleSettingRepository roleSettings;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final Random random = new SecureRandom();

    public UserService(UserMapper users, RoleMapper roles, UserRoleMapper userRoles, TokenService tokens, RoleSettingRepository roleSettings) {
        this.users = users;
        this.roles = roles;
        this.userRoles = userRoles;
        this.tokens = tokens;
        this.roleSettings = roleSettings;
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
        fillRoles(dto, user);
        return dto;
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String account, String nickname, String email, String phone, String sex, String disabled, String keyword) {
        List<Long> keywordRoleIds = roleIdsByKeyword(keyword);
        Page<UserEntity> page = users.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query(account, nickname, email, phone, sex, disabled, keyword, keywordRoleIds)
                .orderByAsc(UserEntity::getAccount)
                .orderByDesc(UserEntity::getId));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(row -> {
            UserDto dto = UserDto.fromEntity(row);
            fillRoles(dto, row);
            return dto;
        }).toList());
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
        List<Long> roleIds = normalizeRoleIds(request.roleIds);
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
        saveUserRoles(user.getId(), roleIds);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("userId", user.getId());
        return result;
    }

    public void edit(UserRequests.EditUserRequest request) {
        List<Long> roleIds = normalizeRoleIds(request.roleIds);
        users.update(new LambdaUpdateWrapper<UserEntity>()
                .eq(UserEntity::getId, request.userId)
                .eq(UserEntity::getDel, 0)
                .set(UserEntity::getNickname, empty(request.userNickname))
                .set(UserEntity::getEmail, empty(request.userEmail))
                .set(UserEntity::getPhoneNum, empty(request.userPhoneNum))
                .set(UserEntity::getSex, empty(request.userSex))
                .set(UserEntity::getPicture, empty(request.userPicture))
                .set(UserEntity::getUpdateAt, LocalDateTime.now()));
        if (request.roleIds != null) {
            saveUserRoles(request.userId, roleIds);
        }
    }

    public UserDto editCurrent(UserRequests.EditCurrentUserRequest request, String authorization) {
        if (request == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请填写个人资料");
        }
        Long userId = tokens.resolve(authorization).userId();
        users.update(new LambdaUpdateWrapper<UserEntity>()
                .eq(UserEntity::getId, userId)
                .eq(UserEntity::getDel, 0)
                .set(UserEntity::getNickname, empty(request.userNickname))
                .set(UserEntity::getEmail, empty(request.userEmail))
                .set(UserEntity::getPhoneNum, empty(request.userPhoneNum))
                .set(UserEntity::getSex, empty(request.userSex))
                .set(UserEntity::getPicture, empty(request.userPicture))
                .set(UserEntity::getUpdateAt, LocalDateTime.now()));
        return detail(userId);
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

    private static LambdaQueryWrapper<UserEntity> query(String account, String nickname, String email, String phone, String sex, String disabled, String keyword, List<Long> keywordRoleIds) {
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
        if (keyword != null && !keyword.isBlank()) {
            String word = keyword.trim();
            wrapper.and(group -> {
                group.like(UserEntity::getAccount, word)
                        .or().like(UserEntity::getNickname, word)
                        .or().like(UserEntity::getEmail, word)
                        .or().like(UserEntity::getPhoneNum, word);
                if (keywordRoleIds != null && !keywordRoleIds.isEmpty()) {
                    String roleIds = commaIds(keywordRoleIds);
                    group.or().inSql(UserEntity::getId, "select user_id from user_role where role_id in (" + roleIds + ")");
                }
            });
        }
        return wrapper;
    }

    private List<Long> roleIdsByKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }
        return roles.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<RoleEntity>()
                        .eq("del", 0)
                        .like("name", keyword.trim()))
                .stream()
                .map(role -> role.id)
                .filter(id -> id != null && id > 0)
                .toList();
    }

    private static String commaIds(List<Long> ids) {
        return ids.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    private static String empty(String value) {
        return value == null ? "" : value;
    }

    private void fillRoles(UserDto dto, UserEntity user) {
        List<Long> roleIds = roleIds(user);
        dto.roleIds = roleIds;
        List<RoleEntity> roleList = roleIds.isEmpty() ? List.of() : roles.selectBatchIds(roleIds);
        dto.roleNames = roleList.stream().map(role -> role.name).toList();
        dto.setting = mergeSettings(roleList);
    }

    private List<Long> roleIds(UserEntity user) {
        Set<Long> ids = userRoles.selectList(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserRoleEntity>()
                        .eq("user_id", user.getId()))
                .stream()
                .map(row -> row.roleId)
                .filter(id -> id != null && id > 0)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));
        return List.copyOf(ids);
    }

    private void saveUserRoles(Long userId, List<Long> roleIds) {
        userRoles.delete(new com.baomidou.mybatisplus.core.conditions.query.QueryWrapper<UserRoleEntity>().eq("user_id", userId));
        LocalDateTime now = LocalDateTime.now();
        for (Long roleId : roleIds) {
            UserRoleEntity row = new UserRoleEntity();
            row.userId = userId;
            row.roleId = roleId;
            row.createAt = now;
            userRoles.insert(row);
        }
    }

    private static List<Long> normalizeRoleIds(List<Long> roleIds) {
        Set<Long> ids = new LinkedHashSet<>();
        if (roleIds != null) {
            roleIds.stream().filter(id -> id != null && id > 0).forEach(ids::add);
        }
        return List.copyOf(ids);
    }

    private Map<String, Object> mergeSettings(List<RoleEntity> roleList) {
        boolean admin = false;
        Set<String> pagePermissions = new LinkedHashSet<>();
        Set<String> operationPermissions = new LinkedHashSet<>();
        Set<Long> sceneTemplateIds = new LinkedHashSet<>();
        Map<String, Set<Long>> directPermissionScenes = new LinkedHashMap<>();
        Map<String, Set<Long>> approvalRequiredScenes = new LinkedHashMap<>();
        for (RoleEntity role : roleList) {
            com.smartproduct.security.RoleSetting setting = roleSettings.load(role);
            admin = admin || setting.admin;
            pagePermissions.addAll(setting.pagePermissions);
            operationPermissions.addAll(setting.operationPermissions);
            sceneTemplateIds.addAll(setting.sceneTemplateIds);
            for (String permission : setting.operationPermissions) {
                boolean requiresApproval = Boolean.TRUE.equals(setting.approvalRequired.get(permission));
                Map<String, Set<Long>> target = requiresApproval ? approvalRequiredScenes : directPermissionScenes;
                target.computeIfAbsent(permission, ignored -> new LinkedHashSet<>()).addAll(setting.sceneTemplateIds);
            }
        }
        Map<String, Boolean> approvalRequired = new LinkedHashMap<>();
        approvalRequiredScenes.forEach((permission, requiredScenes) -> {
            Set<Long> directScenes = directPermissionScenes.getOrDefault(permission, Set.of());
            boolean hasSceneStillRequiringApproval = requiredScenes.stream().anyMatch(sceneId -> !directScenes.contains(sceneId));
            if (hasSceneStillRequiringApproval) {
                approvalRequired.put(permission, true);
            }
        });
        if (admin) {
            approvalRequired.clear();
        }
        if (!sceneTemplateIds.isEmpty()) {
            pagePermissions.add(KNOWLEDGE_PAGE_CODE);
        }
        if (!approvalRequired.isEmpty()) {
            pagePermissions.add("page:system:approvals");
            operationPermissions.add(com.smartproduct.security.PermissionCodes.CHANGE_REQUEST_VIEW_OWN);
        }
        Map<String, Object> merged = new LinkedHashMap<>();
        merged.put("admin", admin);
        merged.put("pagePermissions", List.copyOf(pagePermissions));
        merged.put("operationPermissions", List.copyOf(operationPermissions));
        merged.put("sceneTemplateIds", List.copyOf(sceneTemplateIds));
        merged.put("approvalRequired", approvalRequired);
        return merged;
    }
}
