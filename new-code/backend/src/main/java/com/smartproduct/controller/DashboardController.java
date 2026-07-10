package com.smartproduct.controller;

import com.smartproduct.service.DashboardService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class DashboardController {
    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/v1/data/business/dashboard/overview")
    @PreAuthorize("hasAuthority('knowledge:view')")
    public Map<String, Object> overview(
            @RequestParam(required = false) String startTime,
            @RequestParam(required = false) String endTime,
            @RequestParam(required = false) List<Long> sceneTemplateIds,
            @RequestParam(required = false) String granularity,
            @RequestParam(defaultValue = "true") boolean comparePrevious) {
        return dashboardService.overview(
                startTime,
                endTime,
                sceneTemplateIds,
                granularity,
                comparePrevious
        );
    }
}
