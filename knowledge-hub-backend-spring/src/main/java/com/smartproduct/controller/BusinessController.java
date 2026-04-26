package com.smartproduct.controller;

import com.smartproduct.service.BusinessService;
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
    public Map<String, Object> detail(@RequestParam Long sceneTemplateId) {
        return service.businessDetail(sceneTemplateId);
    }

    @PostMapping("/v1/data/business/knowledge/add")
    public Map<String, Object> add(@RequestBody Map<String, Object> request,
                                   @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.addKnowledge(request, authorization);
    }

    @GetMapping("/v1/data/business/knowledge/detail")
    public Map<String, Object> knowledgeDetail(@RequestParam Long knowledgeId) {
        return service.detail(knowledgeId);
    }

    @PostMapping("/v1/data/business/knowledge/edit")
    public Map<String, Object> edit(@RequestBody Map<String, Object> request) {
        service.editKnowledge(request);
        return Map.of();
    }

    @PostMapping("/v1/data/business/knowledge/delete")
    public Map<String, Object> delete(@RequestBody Map<String, Object> request) {
        service.deleteKnowledge(((Number) request.get("knowledgeId")).longValue());
        return Map.of();
    }

    @PostMapping("/v1/data/business/knowledge/setting")
    public Map<String, Object> setting(@RequestBody Map<String, Object> request) {
        service.setting(request);
        return Map.of();
    }

    @PostMapping("/v1/data/business/knowledge/list")
    public Map<String, Object> list(@RequestBody Map<String, Object> request) {
        return service.list(request);
    }

    @GetMapping("/v1/data/business/knowledge/template/export")
    public Map<String, Object> templateExport(@RequestParam Long sceneTemplateId) {
        return service.templateExport(sceneTemplateId);
    }

    @GetMapping("/v1/data/business/knowledge/data/export")
    public Map<String, Object> dataExport(@RequestParam Long sceneTemplateId) {
        return service.dataExport(sceneTemplateId);
    }

    @PostMapping("/v1/data/business/knowledge/data/import")
    public Map<String, Object> dataImport(@RequestBody Map<String, Object> request,
                                          @RequestHeader(value = "Authorization", required = false) String authorization) {
        service.dataImport(request, authorization);
        return Map.of();
    }

    @GetMapping("/v1/data/business/statistics/knowledge")
    public Map<String, Object> statisticsKnowledge(@RequestParam(required = false) List<String> searchCreateTime) {
        return service.statisticsKnowledge(searchCreateTime);
    }

    @GetMapping("/v1/data/business/statistics/creator")
    public Map<String, Object> statisticsCreator(@RequestParam Long sceneTemplateId) {
        return service.statisticsCreator(sceneTemplateId);
    }
}
