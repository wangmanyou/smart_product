package com.smartproduct.controller;

import com.smartproduct.ai.service.AiKnowledgeRebuildService;
import com.smartproduct.ai.service.AiRagDatasetService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/data/ai")
@PreAuthorize("isAuthenticated()")
public class AiKnowledgeSyncController {
    private final AiRagDatasetService datasets;
    private final AiKnowledgeRebuildService rebuilds;

    public AiKnowledgeSyncController(AiRagDatasetService datasets, AiKnowledgeRebuildService rebuilds) {
        this.datasets = datasets;
        this.rebuilds = rebuilds;
    }

    @PostMapping("/dataset/bind")
    public Map<String, Object> bindDataset(@RequestBody DatasetBindingRequest request) {
        return datasets.bind(request.sceneTemplateId(), request.ragflowDatasetId(), request.datasetName());
    }

    @GetMapping("/dataset/list")
    public List<Map<String, Object>> listDatasets() {
        return datasets.list();
    }

    @PostMapping("/knowledge/rebuild")
    public Map<String, Object> rebuild(@RequestParam(required = false) Long sceneTemplateId) {
        return rebuilds.enqueue(sceneTemplateId);
    }

    @GetMapping("/knowledge/sync/summary")
    public Map<String, Object> syncSummary() {
        return rebuilds.summary();
    }

    public record DatasetBindingRequest(Long sceneTemplateId, String ragflowDatasetId, String datasetName) {
    }
}
