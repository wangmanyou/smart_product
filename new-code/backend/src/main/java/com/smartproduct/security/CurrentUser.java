package com.smartproduct.security;

import java.util.List;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;

public record CurrentUser(
        Long userId,
        String account,
        java.util.Set<Long> roleIds,
        boolean admin,
        Set<String> permissions,
        Set<Long> sceneTemplateIds,
        List<String> approvalRequiredPermissions,
        Map<String, Set<Long>> directPermissionSceneIds,
        Map<String, Set<Long>> approvalRequiredPermissionSceneIds
) {
    public boolean hasPermission(String permission) {
        return admin || permissions.contains(permission);
    }

    public boolean hasScenePermission(String permission, Long sceneTemplateId) {
        return admin || hasScopedPermission(directPermissionSceneIds, permission, sceneTemplateId)
                || hasScopedPermission(approvalRequiredPermissionSceneIds, permission, sceneTemplateId);
    }

    public boolean canAccessScene(Long sceneTemplateId) {
        return admin || sceneTemplateId == null || sceneTemplateIds.contains(sceneTemplateId);
    }

    public boolean requiresApproval(String permission) {
        return !admin && approvalRequiredPermissions.contains(permission)
                && !hasScopedPermission(directPermissionSceneIds, permission, null);
    }

    public boolean requiresApproval(String permission, Long sceneTemplateId) {
        if (admin || hasScopedPermission(directPermissionSceneIds, permission, sceneTemplateId)) {
            return false;
        }
        return hasScopedPermission(approvalRequiredPermissionSceneIds, permission, sceneTemplateId);
    }

    public Set<Long> sceneIdsForAnyPermission(String... permissionCodes) {
        Set<Long> result = new LinkedHashSet<>();
        if (permissionCodes == null) {
            return result;
        }
        for (String permission : permissionCodes) {
            addAll(result, directPermissionSceneIds.get(permission));
            addAll(result, approvalRequiredPermissionSceneIds.get(permission));
        }
        return result;
    }

    private static boolean hasScopedPermission(Map<String, Set<Long>> scopes, String permission, Long sceneTemplateId) {
        Set<Long> sceneIds = scopes == null ? null : scopes.get(permission);
        if (sceneIds == null || sceneIds.isEmpty()) {
            return false;
        }
        return sceneTemplateId == null || sceneIds.contains(sceneTemplateId);
    }

    private static void addAll(Set<Long> target, Set<Long> source) {
        if (source != null) {
            target.addAll(source);
        }
    }
}
