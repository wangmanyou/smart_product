package com.smartproduct.controller;

import com.smartproduct.service.AccessLogService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class AccessLogController {
    private final AccessLogService service;

    public AccessLogController(AccessLogService service) {
        this.service = service;
    }

    @GetMapping("/v1/data/system/access-log/list")
    @PreAuthorize("hasAuthority('system:log:view')")
    public Map<String, Object> list(
            @RequestParam(defaultValue = "1") int pageNumber,
            @RequestParam(defaultValue = "10") int pageSize,
            @RequestParam(required = false) String userAccount,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String result,
            @RequestParam(required = false) String bizType,
            @RequestParam(required = false) Long bizId,
            @RequestParam(required = false) Long sceneTemplateId,
            @RequestParam(required = false) List<String> searchTime,
            @RequestParam(defaultValue = "desc") String order
    ) {
        return service.list(pageNumber, pageSize, userAccount, module, action, result, bizType, bizId,
                sceneTemplateId, searchTime, order);
    }
}
