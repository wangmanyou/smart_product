package com.smartproduct.controller;

import com.smartproduct.service.DictService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DictController {
    private final DictService service;

    public DictController(DictService service) {
        this.service = service;
    }

    @GetMapping("/v1/data/dict/list")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> list(@RequestParam(defaultValue = "1") int pageNumber,
                                    @RequestParam(defaultValue = "10") int pageSize,
                                    @RequestParam(required = false) String searchDictName,
                                    @RequestParam(required = false) String searchDictType,
                                    @RequestParam(required = false) String searchDictDisabled) {
        return service.list(pageNumber, pageSize, searchDictName, searchDictType, searchDictDisabled);
    }

    @PostMapping("/v1/data/dict/create")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> create(@RequestBody Map<String, Object> request,
                                      @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.create(request, authorization);
    }

    @PostMapping("/v1/data/dict/edit")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> edit(@RequestBody Map<String, Object> request) {
        service.edit(request);
        return Map.of();
    }

    @PostMapping("/v1/data/dict/edit/status")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> editStatus(@RequestBody Map<String, Object> request) {
        service.editStatus(request);
        return Map.of();
    }

    @PostMapping("/v1/data/dict/delete")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> delete(@RequestBody Map<String, Object> request) {
        service.deleteTemplate(((Number) request.get("dictTemplateId")).longValue());
        return Map.of();
    }

    @PostMapping("/v1/data/dict/directory/edit/name")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> editDirectoryName(@RequestBody Map<String, Object> request) {
        service.editDirectoryName(request);
        return Map.of();
    }

    @PostMapping("/v1/data/dict/directory/edit/status")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> editDirectoryStatus(@RequestBody Map<String, Object> request) {
        service.editDirectoryStatus(request);
        return Map.of();
    }

    @DeleteMapping("/v1/data/dict/directory/delete")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> deleteDirectory(@RequestParam Long dictDirectoryId) {
        service.deleteDirectory(dictDirectoryId);
        return Map.of();
    }

    @GetMapping("/v1/data/dict/detail")
    @PreAuthorize("hasAuthority('system:dict:manage')")
    public Map<String, Object> detail(@RequestParam Long dictTemplateId) {
        return service.detail(dictTemplateId);
    }
}
