package com.smartproduct.security;

import java.util.List;
import java.util.Set;

public record CurrentUser(
        Long userId,
        String account,
        Long roleId,
        java.util.Set<Long> roleIds,
        boolean admin,
        Set<String> permissions,
        Set<Long> sceneTemplateIds,
        List<String> approvalRequiredPermissions
) {
    public boolean hasPermission(String permission) {
        return admin || permissions.contains(permission);
    }

    public boolean canAccessScene(Long sceneTemplateId) {
        return admin || sceneTemplateId == null || sceneTemplateIds.contains(sceneTemplateId);
    }

    public boolean requiresApproval(String permission) {
        return !admin && approvalRequiredPermissions.contains(permission);
    }
}
