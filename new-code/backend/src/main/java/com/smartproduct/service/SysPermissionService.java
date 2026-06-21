package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.smartproduct.entity.SysPermissionEntity;
import com.smartproduct.mapper.SysPermissionMapper;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class SysPermissionService {
    private final SysPermissionMapper permissions;

    public SysPermissionService(SysPermissionMapper permissions) {
        this.permissions = permissions;
    }

    public Map<String, Object> list() {
        var rows = permissions.selectList(new QueryWrapper<SysPermissionEntity>()
                .eq("status", "ENABLED")
                .orderByAsc("sort_number")
                .orderByAsc("id"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", rows);
        result.put("totalElements", rows.size());
        return result;
    }

    public Map<String, Object> add(Map<String, Object> request) {
        LocalDateTime now = LocalDateTime.now();
        SysPermissionEntity row = new SysPermissionEntity();
        row.code = str(request.get("code"));
        row.name = str(request.get("name"));
        row.type = str(request.get("type"));
        row.module = str(request.get("module"));
        row.description = str(request.get("description"));
        row.status = "ENABLED";
        row.sortNumber = request.get("sortNumber") instanceof Number number ? number.intValue() : 0;
        row.createAt = now;
        row.updateAt = now;
        permissions.insert(row);
        return Map.of("permissionId", row.id);
    }

    public void edit(Map<String, Object> request) {
        permissions.update(new UpdateWrapper<SysPermissionEntity>()
                .eq("id", num(request.get("permissionId")))
                .set("code", str(request.get("code")))
                .set("name", str(request.get("name")))
                .set("type", str(request.get("type")))
                .set("module", str(request.get("module")))
                .set("description", str(request.get("description")))
                .set("sort_number", request.get("sortNumber") instanceof Number number ? number.intValue() : 0)
                .set("update_at", LocalDateTime.now()));
    }

    public void editStatus(Map<String, Object> request) {
        permissions.update(new UpdateWrapper<SysPermissionEntity>()
                .eq("id", num(request.get("permissionId")))
                .set("status", Boolean.TRUE.equals(request.get("enabled")) ? "ENABLED" : "DISABLED")
                .set("update_at", LocalDateTime.now()));
    }

    public void delete(Long permissionId) {
        permissions.update(new UpdateWrapper<SysPermissionEntity>()
                .eq("id", permissionId)
                .set("status", "DEPRECATED")
                .set("update_at", LocalDateTime.now()));
    }

    private static Long num(Object value) {
        return value instanceof Number number ? number.longValue() : Long.valueOf(String.valueOf(value));
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
