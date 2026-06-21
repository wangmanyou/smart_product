package com.smartproduct.controller;

import com.smartproduct.service.NotificationService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class NotificationController {
    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping("/v1/notifications")
    public Map<String, Object> listMine(@RequestParam(defaultValue = "1") int pageNumber,
                                        @RequestParam(defaultValue = "10") int pageSize,
                                        @RequestParam(required = false) Boolean unreadOnly) {
        return service.listMine(pageNumber, pageSize, unreadOnly);
    }

    @GetMapping("/v1/notifications/unread-count")
    public Map<String, Object> unreadCount() {
        return service.unreadCount();
    }

    @PostMapping("/v1/notifications/read")
    public Map<String, Object> markRead(@RequestBody Map<String, Object> request) {
        service.markRead(num(request.get("notificationId")));
        return Map.of();
    }

    @PostMapping("/v1/notifications/read-all")
    public Map<String, Object> markAllRead() {
        service.markAllRead();
        return Map.of();
    }

    private static Long num(Object value) {
        return value instanceof Number number ? number.longValue() : Long.valueOf(String.valueOf(value));
    }
}
