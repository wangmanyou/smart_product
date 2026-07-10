package com.smartproduct.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.security.RoleSetting;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Repository
public class RoleSettingRepository {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };
    private static final String KNOWLEDGE_PAGE_CODE = "page:knowledge";

    private final JdbcTemplate jdbc;

    public RoleSettingRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public RoleSetting load(RoleEntity role) {
        RoleSetting setting = new RoleSetting();
        if (role == null || role.id == null) {
            return setting;
        }
        setting.admin = role.id == 1 || Boolean.TRUE.equals(role.isBuiltin);
        List<PermissionRow> permissions = jdbc.query("""
                        select p.code, p.type
                        from role_permission rp
                        join sys_permission p on p.id = rp.permission_id
                        where rp.role_id = ?
                        order by p.sort_number, p.id
                        """,
                (rs, rowNum) -> new PermissionRow(rs.getString("code"), rs.getString("type")),
                role.id);
        if (!permissions.isEmpty()) {
            setting.pagePermissions = permissions.stream()
                    .filter(row -> "PAGE".equals(row.type))
                    .map(row -> row.code)
                    .toList();
            setting.operationPermissions = permissions.stream()
                    .filter(row -> "ACTION".equals(row.type))
                    .map(row -> row.code)
                    .toList();
        }
        List<Long> sceneIds = jdbc.queryForList("""
                        select scene_template_id
                        from role_scene
                        where role_id = ?
                        order by scene_template_id
                        """,
                Long.class,
                role.id);
        if (!sceneIds.isEmpty()) {
            setting.sceneTemplateIds = sceneIds;
        }
        Map<String, Boolean> approvalRequired = new LinkedHashMap<>();
        jdbc.query("""
                        select p.code, rpa.approval_required
                        from role_permission_approval rpa
                        join sys_permission p on p.id = rpa.permission_id
                        where rpa.role_id = ?
                        order by p.sort_number, p.id
                        """,
                (RowCallbackHandler) rs -> approvalRequired.put(rs.getString("code"), rs.getBoolean("approval_required")),
                role.id);
        if (!approvalRequired.isEmpty()) {
            setting.approvalRequired = approvalRequired;
        }
        applyDerivedPermissions(setting);
        return setting;
    }

    public Map<String, Object> loadAsMap(RoleEntity role) {
        RoleSetting setting = load(role);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("admin", setting.admin);
        result.put("pagePermissions", setting.pagePermissions);
        result.put("operationPermissions", setting.operationPermissions);
        result.put("sceneTemplateIds", setting.sceneTemplateIds);
        result.put("approvalRequired", setting.approvalRequired);
        return result;
    }

    public void save(Long roleId, Object value) {
        if (roleId == null || value == null) {
            return;
        }
        Map<String, Object> setting = normalize(value);
        jdbc.update("delete from role_permission where role_id = ?", roleId);
        jdbc.update("delete from role_scene where role_id = ?", roleId);
        jdbc.update("delete from role_permission_approval where role_id = ?", roleId);

        Set<String> permissionCodes = new LinkedHashSet<>();
        list(setting.get("pagePermissions")).forEach(item -> permissionCodes.add(String.valueOf(item)));
        list(setting.get("operationPermissions")).forEach(item -> permissionCodes.add(String.valueOf(item)));
        List<?> sceneItems = list(setting.get("sceneTemplateIds"));
        if (!sceneItems.isEmpty()) {
            permissionCodes.add(KNOWLEDGE_PAGE_CODE);
        }
        for (String code : permissionCodes) {
            jdbc.update("""
                            insert ignore into role_permission (role_id, permission_id, create_at)
                            select ?, id, now()
                            from sys_permission
                            where code = ?
                            """,
                    roleId, code);
        }
        for (Object item : sceneItems) {
            Long sceneId = number(item);
            if (sceneId != null && sceneId > 0) {
                jdbc.update("insert ignore into role_scene (role_id, scene_template_id, create_at) values (?, ?, now())", roleId, sceneId);
            }
        }
        if (setting.get("approvalRequired") instanceof Map<?, ?> approvalMap) {
            approvalMap.forEach((key, required) -> {
                if (Boolean.TRUE.equals(required)) {
                    jdbc.update("""
                                    insert into role_permission_approval (role_id, permission_id, approval_required, create_at, update_at)
                                    select ?, id, true, now(), now()
                                    from sys_permission
                                    where code = ?
                                    on duplicate key update approval_required = values(approval_required), update_at = now()
                                    """,
                            roleId, String.valueOf(key));
                }
            });
        }
    }

    public void delete(Long roleId) {
        if (roleId == null) {
            return;
        }
        jdbc.update("delete from role_permission where role_id = ?", roleId);
        jdbc.update("delete from role_scene where role_id = ?", roleId);
        jdbc.update("delete from role_permission_approval where role_id = ?", roleId);
    }

    private static Map<String, Object> normalize(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> normalized = new LinkedHashMap<>();
            map.forEach((key, item) -> normalized.put(String.valueOf(key), item));
            return normalized;
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return JSON.readValue(text, MAP_TYPE);
            } catch (Exception ignored) {
                return Map.of();
            }
        }
        return JSON.convertValue(value, MAP_TYPE);
    }

    private static void applyDerivedPermissions(RoleSetting setting) {
        if (setting == null || setting.sceneTemplateIds == null || setting.sceneTemplateIds.isEmpty()) {
            return;
        }
        if (setting.pagePermissions != null && setting.pagePermissions.contains(KNOWLEDGE_PAGE_CODE)) {
            return;
        }
        List<String> pages = new ArrayList<>(setting.pagePermissions == null ? List.of() : setting.pagePermissions);
        pages.add(KNOWLEDGE_PAGE_CODE);
        setting.pagePermissions = pages;
    }

    private static List<?> list(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }

    private static Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.valueOf(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    private record PermissionRow(String code, String type) {
    }
}
