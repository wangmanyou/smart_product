package com.smartproduct.controller;

import com.smartproduct.service.KnowledgeChangeRequestService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class KnowledgeChangeRequestController {
    private final KnowledgeChangeRequestService service;

    public KnowledgeChangeRequestController(KnowledgeChangeRequestService service) {
        this.service = service;
    }

    @PreAuthorize("hasAuthority('knowledge:change-request:view-own')")
    @GetMapping("/v1/data/business/knowledge/change-request/my")
    public Map<String, Object> listMine(@RequestParam(defaultValue = "1") int pageNumber,
                                        @RequestParam(defaultValue = "10") int pageSize,
                                        @RequestParam(required = false) String status) {
        return service.listMine(pageNumber, pageSize, status);
    }

    @PreAuthorize("hasAnyAuthority('knowledge:change-request:view-all','knowledge:change-request:approve','knowledge:change-request:reject','system:approval:manage')")
    @GetMapping("/v1/data/business/knowledge/change-request/list")
    public Map<String, Object> listAll(@RequestParam(defaultValue = "1") int pageNumber,
                                       @RequestParam(defaultValue = "10") int pageSize,
                                       @RequestParam(required = false) String status) {
        return service.listAll(pageNumber, pageSize, status);
    }

    @PreAuthorize("hasAuthority('knowledge:change-request:view-own')")
    @PostMapping("/v1/data/business/knowledge/change-request/update")
    public Map<String, Object> update(@RequestBody Map<String, Object> request) {
        service.updatePending(num(request.get("changeRequestId")), map(request.get("payload")));
        return Map.of();
    }

    @PreAuthorize("hasAuthority('knowledge:change-request:view-own')")
    @PostMapping("/v1/data/business/knowledge/change-request/withdraw")
    public Map<String, Object> withdraw(@RequestBody Map<String, Object> request) {
        service.withdraw(num(request.get("changeRequestId")));
        return Map.of();
    }

    @PreAuthorize("hasAuthority('knowledge:change-request:view-own')")
    @PostMapping("/v1/data/business/knowledge/change-request/delete")
    public Map<String, Object> deleteRecord(@RequestBody Map<String, Object> request) {
        service.deleteRecord(num(request.get("changeRequestId")));
        return Map.of();
    }

    @PreAuthorize("hasAnyAuthority('knowledge:change-request:approve','system:approval:manage')")
    @PostMapping("/v1/data/business/knowledge/change-request/approve")
    public Map<String, Object> approve(@RequestBody Map<String, Object> request) {
        service.approve(num(request.get("changeRequestId")), str(request.get("reviewComment")));
        return Map.of();
    }

    @PreAuthorize("hasAnyAuthority('knowledge:change-request:reject','system:approval:manage')")
    @PostMapping("/v1/data/business/knowledge/change-request/reject")
    public Map<String, Object> reject(@RequestBody Map<String, Object> request) {
        service.reject(num(request.get("changeRequestId")), str(request.get("reviewComment")));
        return Map.of();
    }

    private static Long num(Object value) {
        return value instanceof Number number ? number.longValue() : Long.valueOf(String.valueOf(value));
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object value) {
        return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of();
    }
}
