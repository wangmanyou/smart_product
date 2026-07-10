package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.mapper.RoleMapper;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RoleService {
    private final RoleMapper roles;
    private final RoleSettingRepository roleSettings;
    private final JdbcTemplate jdbc;

    public RoleService(RoleMapper roles, RoleSettingRepository roleSettings, JdbcTemplate jdbc) {
        this.roles = roles;
        this.roleSettings = roleSettings;
        this.jdbc = jdbc;
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String name, String remark, String disabled) {
        QueryWrapper<RoleEntity> query = new QueryWrapper<RoleEntity>().eq("del", 0);
        if (name != null && !name.isBlank()) {
            query.like("name", name);
        }
        if (remark != null && !remark.isBlank()) {
            query.like("remark", remark);
        }
        if ("enabled".equals(disabled)) {
            query.eq("is_disabled", false);
        } else if ("disabled".equals(disabled)) {
            query.eq("is_disabled", true);
        }
        query.orderByDesc("update_at").orderByDesc("id");
        Page<RoleEntity> page = roles.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(this::dto).toList());
        result.put("totalElements", page.getTotal());
        return result;
    }

    public Map<String, Object> detail(Long roleId) {
        RoleEntity role = roles.selectOne(new QueryWrapper<RoleEntity>().eq("id", roleId).eq("del", 0));
        return dto(role);
    }

    public Map<String, Object> options() {
        QueryWrapper<RoleEntity> query = new QueryWrapper<RoleEntity>()
                .eq("del", 0)
                .orderByDesc("update_at")
                .orderByDesc("id");
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", roles.selectList(query).stream().map(this::optionDto).toList());
        return result;
    }

    public Map<String, Object> add(Map<String, Object> request) {
        RoleEntity role = new RoleEntity();
        role.name = str(request.get("roleName"));
        role.remark = str(request.get("roleRemark"));
        role.isDisabled = false;
        role.isBuiltin = false;
        role.isUsed = false;
        role.del = 0;
        roles.insert(role);
        roleSettings.save(role.id, request.get("setting"));
        return Map.of("roleId", role.id);
    }

    public void edit(Map<String, Object> request) {
        requireEditableRole(num(request.get("roleId")));
        roles.update(new UpdateWrapper<RoleEntity>()
                .eq("id", num(request.get("roleId")))
                .eq("del", 0)
                .set("name", str(request.get("roleName")))
                .set("remark", str(request.get("roleRemark"))));
        if (request.containsKey("setting")) {
            roleSettings.save(num(request.get("roleId")), request.get("setting"));
        }
    }

    public void editStatus(Map<String, Object> request) {
        requireEditableRole(num(request.get("roleId")));
        roles.update(new UpdateWrapper<RoleEntity>()
                .eq("id", num(request.get("roleId")))
                .set("is_disabled", bool(request.get("isDisabled"))));
    }

    @Transactional
    public void delete(Long roleId) {
        RoleEntity role = roles.selectOne(new QueryWrapper<RoleEntity>()
                .eq("id", roleId)
                .eq("del", 0));
        if (role == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "角色不存在或已删除");
        }
        if (Boolean.TRUE.equals(role.isBuiltin)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "内置角色不能删除");
        }
        if (isReferencedByUser(roleId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "该角色仍有关联用户，不能删除，请先调整用户角色");
        }
        roleSettings.delete(roleId);
        roles.update(new UpdateWrapper<RoleEntity>()
                .eq("id", roleId)
                .eq("del", 0)
                .set("del", 1)
                .set("update_at", LocalDateTime.now()));
    }

    private Map<String, Object> dto(RoleEntity role) {
        if (role == null) {
            return Map.of();
        }
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("roleName", role.name);
        dto.put("roleRemark", role.remark);
        dto.put("setting", roleSettings.loadAsMap(role));
        dto.put("isUsed", Boolean.TRUE.equals(role.isUsed) || isReferencedByUser(role.id));
        dto.put("isBuiltin", Boolean.TRUE.equals(role.isBuiltin));
        dto.put("isDisabled", Boolean.TRUE.equals(role.isDisabled));
        dto.put("roleId", role.id);
        dto.put("updateTime", role.updateAt == null ? null : role.updateAt.atZone(ZoneId.systemDefault()).toEpochSecond());
        dto.put("createTime", role.createAt == null ? null : role.createAt.atZone(ZoneId.systemDefault()).toEpochSecond());
        return dto;
    }

    private Map<String, Object> optionDto(RoleEntity role) {
        if (role == null) {
            return Map.of();
        }
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("roleName", role.name);
        dto.put("roleRemark", role.remark);
        dto.put("isBuiltin", Boolean.TRUE.equals(role.isBuiltin));
        dto.put("isDisabled", Boolean.TRUE.equals(role.isDisabled));
        dto.put("roleId", role.id);
        return dto;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static Long num(Object value) {
        return value instanceof Number number ? number.longValue() : Long.valueOf(String.valueOf(value));
    }

    private static boolean bool(Object value) {
        return value instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(value));
    }

    private boolean isReferencedByUser(Long roleId) {
        if (roleId == null) {
            return false;
        }
        Long count = jdbc.queryForObject("""
                select count(distinct u.id)
                from `user` u
                join user_role ur on ur.user_id = u.id
                where u.del = 0
                    and ur.role_id = ?
                """, Long.class, roleId);
        return count != null && count > 0;
    }

    private void requireEditableRole(Long roleId) {
        RoleEntity role = roles.selectOne(new QueryWrapper<RoleEntity>()
                .eq("id", roleId)
                .eq("del", 0));
        if (role == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "Role not found");
        }
        if (Boolean.TRUE.equals(role.isBuiltin)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "Built-in role cannot be modified");
        }
    }

}
