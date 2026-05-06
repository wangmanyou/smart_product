package com.smartproduct.controller;

import com.smartproduct.service.SysPermissionService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SysPermissionController {
    private final SysPermissionService service;

    public SysPermissionController(SysPermissionService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('system:manage')")
    @GetMapping("/v1/data/permission/list")
    public Map<String, Object> list() {
        return service.list();
    }

    @PreAuthorize("hasAuthority('system:manage')")
    @PostMapping("/v1/data/permission/add")
    public Map<String, Object> add(@RequestBody Map<String, Object> request) {
        return service.add(request);
    }

    @PreAuthorize("hasAuthority('system:manage')")
    @PostMapping("/v1/data/permission/edit")
    public Map<String, Object> edit(@RequestBody Map<String, Object> request) {
        service.edit(request);
        return Map.of();
    }

    @PreAuthorize("hasAuthority('system:manage')")
    @PostMapping("/v1/data/permission/edit/status")
    public Map<String, Object> editStatus(@RequestBody Map<String, Object> request) {
        service.editStatus(request);
        return Map.of();
    }

    @PreAuthorize("hasAuthority('system:manage')")
    @PostMapping("/v1/data/permission/delete")
    public Map<String, Object> delete(@RequestBody Map<String, Object> request) {
        service.delete(((Number) request.get("permissionId")).longValue());
        return Map.of();
    }
}
