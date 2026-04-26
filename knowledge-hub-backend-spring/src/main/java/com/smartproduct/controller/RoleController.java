package com.smartproduct.controller;

import com.smartproduct.service.RoleService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class RoleController {
    private final RoleService service;

    public RoleController(RoleService service) {
        this.service = service;
    }

    @GetMapping("/v1/data/role/list")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String searchRoleName,
            @RequestParam(required = false) String searchRoleRemark,
            @RequestParam(required = false) String searchRoleDisabled) {
        return service.list(pageNumber, pageSize, searchRoleName, searchRoleRemark, searchRoleDisabled);
    }

    @GetMapping("/v1/data/role/detail")
    public Map<String, Object> detail(@RequestParam Long roleId) {
        return service.detail(roleId);
    }

    @PostMapping("/v1/data/role/add")
    public Map<String, Object> add(@RequestBody Map<String, Object> request) {
        return service.add(request);
    }

    @PostMapping("/v1/data/role/edit")
    public Map<String, Object> edit(@RequestBody Map<String, Object> request) {
        service.edit(request);
        return Map.of();
    }

    @PostMapping("/v1/data/role/edit/status")
    public Map<String, Object> editStatus(@RequestBody Map<String, Object> request) {
        service.editStatus(request);
        return Map.of();
    }

    @PostMapping("/v1/data/role/delete")
    public Map<String, Object> delete(@RequestBody Map<String, Object> request) {
        service.delete(((Number) request.get("roleId")).longValue());
        return Map.of();
    }
}
