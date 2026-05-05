package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.entity.RoleEntity;
import com.smartproduct.mapper.RoleMapper;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class RoleService {
    private final RoleMapper roles;

    public RoleService(RoleMapper roles) {
        this.roles = roles;
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

    public Map<String, Object> add(Map<String, Object> request) {
        RoleEntity role = new RoleEntity();
        role.name = str(request.get("roleName"));
        role.remark = str(request.get("roleRemark"));
        role.settingJson = settingJson(request.get("setting"));
        role.isDisabled = false;
        role.isBuiltin = false;
        role.isUsed = false;
        role.del = 0;
        roles.insert(role);
        return Map.of("roleId", role.id);
    }

    public void edit(Map<String, Object> request) {
        roles.update(new UpdateWrapper<RoleEntity>()
                .eq("id", num(request.get("roleId")))
                .eq("del", 0)
                .set("name", str(request.get("roleName")))
                .set("remark", str(request.get("roleRemark")))
                .set(request.containsKey("setting"), "setting_json", settingJson(request.get("setting"))));
    }

    public void editStatus(Map<String, Object> request) {
        roles.update(new UpdateWrapper<RoleEntity>()
                .eq("id", num(request.get("roleId")))
                .set("is_disabled", bool(request.get("isDisabled"))));
    }

    public void delete(Long roleId) {
        roles.deleteById(roleId);
    }

    private Map<String, Object> dto(RoleEntity role) {
        if (role == null) {
            return Map.of();
        }
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("roleName", role.name);
        dto.put("roleRemark", role.remark);
        dto.put("setting", parseSetting(role.settingJson));
        dto.put("isUsed", Boolean.TRUE.equals(role.isUsed));
        dto.put("isBuiltin", Boolean.TRUE.equals(role.isBuiltin));
        dto.put("isDisabled", Boolean.TRUE.equals(role.isDisabled));
        dto.put("roleId", role.id);
        dto.put("updateTime", role.updateAt == null ? null : role.updateAt.atZone(ZoneId.systemDefault()).toEpochSecond());
        dto.put("createTime", role.createAt == null ? null : role.createAt.atZone(ZoneId.systemDefault()).toEpochSecond());
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

    private static String settingJson(Object value) {
        if (value == null) {
            return "{}";
        }
        if (value instanceof String text) {
            return text.isBlank() ? "{}" : text;
        }
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(value);
        } catch (Exception ex) {
            return "{}";
        }
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
