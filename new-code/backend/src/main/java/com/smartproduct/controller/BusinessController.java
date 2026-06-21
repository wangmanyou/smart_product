package com.smartproduct.controller;

import com.smartproduct.service.BusinessService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class BusinessController {
    private final BusinessService service;

    public BusinessController(BusinessService service) {
        this.service = service;
    }

    @GetMapping("/v1/data/business/detail")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> detail(@RequestParam("sceneTemplateId") Long sceneTemplateId) {
        return service.businessDetail(sceneTemplateId);
    }

    @PostMapping("/v1/data/business/knowledge/add")
    @PreAuthorize("hasAuthority('knowledge:create')")
    public Map<String, Object> add(@RequestBody Map<String, Object> request,
                                   @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.addKnowledge(request, authorization);
    }

    @GetMapping("/v1/data/business/knowledge/detail")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> knowledgeDetail(@RequestParam("knowledgeId") Long knowledgeId) {
        return service.detail(knowledgeId);
    }

    @PostMapping("/v1/data/business/knowledge/edit")
    @PreAuthorize("hasAuthority('knowledge:update')")
    public Map<String, Object> edit(@RequestBody Map<String, Object> request) {
        service.editKnowledge(request);
        return Map.of();
    }

    @PostMapping("/v1/data/business/knowledge/delete")
    @PreAuthorize("hasAuthority('knowledge:delete')")
    public Map<String, Object> delete(@RequestBody Map<String, Object> request) {
        service.deleteKnowledge(((Number) request.get("knowledgeId")).longValue());
        return Map.of();
    }

    @PostMapping("/v1/data/business/knowledge/setting")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> setting(@RequestBody Map<String, Object> request) {
        service.setting(request);
        return Map.of();
    }

    @PostMapping("/v1/data/business/knowledge/list")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> list(@RequestBody Map<String, Object> request) {
        return service.list(request);
    }

    @GetMapping("/v1/data/business/knowledge/template/export")
    @PreAuthorize("hasAuthority('knowledge:import')")
    public Map<String, Object> templateExport(@RequestParam("sceneTemplateId") Long sceneTemplateId) {
        return service.templateExport(sceneTemplateId);
    }

    @GetMapping("/v1/data/business/knowledge/data/export")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> dataExport(@RequestParam("sceneTemplateId") Long sceneTemplateId) {
        return service.dataExport(sceneTemplateId);
    }

    @PostMapping("/v1/data/business/knowledge/data/import")
    @PreAuthorize("hasAuthority('knowledge:import')")
    public Map<String, Object> dataImport(@RequestBody Map<String, Object> request,
                                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.dataImport(request, authorization);
    }

    @GetMapping("/v1/data/business/statistics/knowledge")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> statisticsKnowledge(@RequestParam(required = false) List<String> searchCreateTime) {
        return service.statisticsKnowledge(searchCreateTime);
    }

    @GetMapping("/v1/data/business/statistics/creator")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> statisticsCreator(@RequestParam(value = "sceneTemplateId", required = false) Long sceneTemplateId,
                                                 @RequestParam(required = false) List<String> searchCreateTime) {
        return service.statisticsCreator(sceneTemplateId, searchCreateTime);
    }
}
