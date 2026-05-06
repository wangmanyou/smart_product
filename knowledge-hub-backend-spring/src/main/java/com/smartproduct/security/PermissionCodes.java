package com.smartproduct.security;

import java.util.List;

public final class PermissionCodes {
    private PermissionCodes() {
    }

    public static final String ADMIN = "ADMIN";
    public static final String KNOWLEDGE_VIEW = "knowledge:view";
    public static final String KNOWLEDGE_CREATE = "knowledge:create";
    public static final String KNOWLEDGE_UPDATE = "knowledge:update";
    public static final String KNOWLEDGE_DELETE = "knowledge:delete";
    public static final String KNOWLEDGE_IMPORT = "knowledge:import";
    public static final String CHANGE_REQUEST_VIEW_OWN = "knowledge:change-request:view-own";
    public static final String CHANGE_REQUEST_VIEW_ALL = "knowledge:change-request:view-all";
    public static final String CHANGE_REQUEST_APPROVE = "knowledge:change-request:approve";
    public static final String CHANGE_REQUEST_REJECT = "knowledge:change-request:reject";
    public static final String SYSTEM_MANAGE = "system:manage";

    public static List<String> allOperationPermissions() {
        return List.of(
                KNOWLEDGE_VIEW,
                KNOWLEDGE_CREATE,
                KNOWLEDGE_UPDATE,
                KNOWLEDGE_DELETE,
                KNOWLEDGE_IMPORT,
                CHANGE_REQUEST_VIEW_OWN,
                CHANGE_REQUEST_VIEW_ALL,
                CHANGE_REQUEST_APPROVE,
                CHANGE_REQUEST_REJECT,
                SYSTEM_MANAGE
        );
    }
}
