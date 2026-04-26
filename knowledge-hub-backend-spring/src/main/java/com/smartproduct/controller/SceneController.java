package com.smartproduct.controller;

import com.smartproduct.service.SceneService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class SceneController {
    private final SceneService service;

    public SceneController(SceneService service) {
        this.service = service;
    }

    @GetMapping("/v1/data/scene/list")
    public Map<String, Object> list(@RequestParam(defaultValue = "1") int pageNumber,
                                    @RequestParam(defaultValue = "10") int pageSize,
                                    @RequestParam(required = false) String searchSceneName,
                                    @RequestParam(required = false) String searchSceneDisabled) {
        return service.list(pageNumber, pageSize, searchSceneName, searchSceneDisabled);
    }

    @GetMapping("/v1/data/scene/detail")
    public Map<String, Object> detail(@RequestParam Long sceneTemplateId) {
        return service.detail(sceneTemplateId);
    }

    @PostMapping("/v1/data/scene/create")
    public Map<String, Object> create(@RequestBody Map<String, Object> request,
                                      @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.create(request, authorization);
    }

    @PostMapping("/v1/data/scene/copy")
    public Map<String, Object> copy(@RequestBody Map<String, Object> request,
                                    @RequestHeader(value = "Authorization", required = false) String authorization) {
        return service.copy(request, authorization);
    }

    @PostMapping("/v1/data/scene/edit")
    public Map<String, Object> edit(@RequestBody Map<String, Object> request) {
        service.edit(request);
        return Map.of();
    }

    @PostMapping("/v1/data/scene/edit/status")
    public Map<String, Object> editStatus(@RequestBody Map<String, Object> request) {
        service.editStatus(request);
        return Map.of();
    }

    @DeleteMapping("/v1/data/scene/item/delete")
    public Map<String, Object> deleteItem(@RequestParam Long sceneItemId) {
        service.deleteItem(sceneItemId);
        return Map.of();
    }
}
