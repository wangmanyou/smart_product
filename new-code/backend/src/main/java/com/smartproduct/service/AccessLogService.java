package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.entity.AccessLogEntity;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.mapper.AccessLogMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AccessLogService {
    public static final String RESULT_SUCCESS = "SUCCESS";
    public static final String RESULT_FAIL = "FAIL";

    private final AccessLogMapper logs;
    private final UserMapper users;
    private final CurrentUserService currentUsers;

    public AccessLogService(AccessLogMapper logs, UserMapper users, CurrentUserService currentUsers) {
        this.logs = logs;
        this.users = users;
        this.currentUsers = currentUsers;
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String userAccount, String module,
                                    String action, String result, String bizType, Long bizId,
                                    Long sceneTemplateId, List<String> searchTime, String order) {
        CurrentUser user = currentUsers.current();
        if (!user.admin()) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "仅超级管理员可查看系统审计日志");
        }
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<>();
        if (userAccount != null && !userAccount.isBlank()) {
            query.like("user_account", userAccount);
        }
        if (module != null && !module.isBlank()) {
            query.eq("module", module);
        }
        if (action != null && !action.isBlank()) {
            query.eq("action", action);
        }
        if (result != null && !result.isBlank()) {
            query.eq("result", result);
        }
        if (bizType != null && !bizType.isBlank()) {
            query.eq("biz_type", bizType);
        }
        if (bizId != null && bizId > 0) {
            query.eq("biz_id", bizId);
        }
        if (sceneTemplateId != null && sceneTemplateId > 0) {
            query.eq("scene_template_id", sceneTemplateId);
        }
        applyTimeRange(query, searchTime);
        applyTimeOrder(query, order);
        Page<AccessLogEntity> page = logs.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        return Map.of(
                "content", page.getRecords().stream().map(this::dto).toList(),
                "totalElements", page.getTotal()
        );
    }

    public Map<String, Object> myLoginLogs(int pageNumber, int pageSize, String order) {
        CurrentUser user = currentUsers.current();
        return page(loginLogQuery(user.userId(), user.account()), pageNumber, pageSize, order);
    }

    public Map<String, Object> userLoginLogs(Long userId, int pageNumber, int pageSize, String order) {
        CurrentUser current = currentUsers.current();
        if (!current.hasPermission(PermissionCodes.SYSTEM_USER_MANAGE)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有查看用户登录记录的权限");
        }
        UserEntity user = userId == null ? null : users.selectById(userId);
        if (user == null || user.getDel() != null && user.getDel() != 0) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "用户不存在");
        }
        return page(loginLogQuery(user.getId(), user.getAccount()), pageNumber, pageSize, order);
    }

    public Map<String, Object> knowledgeLogs(Long knowledgeId, Long visibleUserId, Long operatorId, String action,
                                             int pageNumber, int pageSize, String order) {
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<AccessLogEntity>()
                .eq("biz_type", "KNOWLEDGE")
                .eq("biz_id", knowledgeId);
        applyKnowledgeActionFilter(query, action, List.of("VIEW", "UPDATE", "UPDATE_REQUEST"));
        if (visibleUserId != null) {
            query.eq("user_id", visibleUserId);
        } else if (operatorId != null && operatorId > 0) {
            query.eq("user_id", operatorId);
        }
        return page(query, pageNumber, pageSize, order);
    }

    public List<Map<String, Object>> knowledgeLogOperators(Long knowledgeId, Long visibleUserId) {
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<AccessLogEntity>()
                .eq("biz_type", "KNOWLEDGE")
                .eq("biz_id", knowledgeId);
        applyKnowledgeActionFilter(query, null, List.of("VIEW", "UPDATE", "UPDATE_REQUEST"));
        if (visibleUserId != null) {
            query.eq("user_id", visibleUserId);
        }
        return operatorOptions(query);
    }

    public Map<String, Object> sceneKnowledgeLogs(Long sceneTemplateId, Long visibleUserId, Long operatorId,
                                                  String action, int pageNumber, int pageSize, String order) {
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<AccessLogEntity>()
                .eq("module", "知识库")
                .eq("scene_template_id", sceneTemplateId);
        applyKnowledgeActionFilter(query, action, List.of(
                "VIEW", "CREATE", "CREATE_REQUEST", "UPDATE", "UPDATE_REQUEST", "DELETE", "DELETE_REQUEST"
        ));
        if (visibleUserId != null) {
            query.eq("user_id", visibleUserId);
        } else if (operatorId != null && operatorId > 0) {
            query.eq("user_id", operatorId);
        }
        return page(query, pageNumber, pageSize, order);
    }

    public List<Map<String, Object>> sceneKnowledgeLogOperators(Long sceneTemplateId, Long visibleUserId) {
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<AccessLogEntity>()
                .eq("module", "知识库")
                .eq("scene_template_id", sceneTemplateId);
        applyKnowledgeActionFilter(query, null, List.of(
                "VIEW", "CREATE", "CREATE_REQUEST", "UPDATE", "UPDATE_REQUEST", "DELETE", "DELETE_REQUEST"
        ));
        if (visibleUserId != null) {
            query.eq("user_id", visibleUserId);
        }
        return operatorOptions(query);
    }

    public Map<String, Object> sceneLogs(String action, int pageNumber, int pageSize, String order) {
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<AccessLogEntity>()
                .eq("module", "场景管理");
        applySceneActionFilter(query, action);
        return page(query, pageNumber, pageSize, order);
    }

    public void success(String module, String action, String bizType, Long bizId, Long sceneTemplateId, String description) {
        CurrentUser user = currentUserOrNull();
        record(user == null ? null : user.userId(), user == null ? null : user.account(),
                module, action, bizType, bizId, sceneTemplateId, description, RESULT_SUCCESS, null);
    }

    public void fail(String module, String action, String bizType, Long bizId, Long sceneTemplateId,
                     String description, String errorMessage) {
        CurrentUser user = currentUserOrNull();
        record(user == null ? null : user.userId(), user == null ? null : user.account(),
                module, action, bizType, bizId, sceneTemplateId, description, RESULT_FAIL, errorMessage);
    }

    public void login(String account, boolean success, String errorMessage) {
        try {
            Long userId = null;
            UserEntity user = account == null || account.isBlank() ? null : users.selectOne(new QueryWrapper<UserEntity>()
                    .eq("account", account)
                    .eq("del", 0)
                    .last("limit 1"));
            if (user != null) {
                userId = user.getId();
            }
            record(userId, user == null ? account : user.getAccount(), "用户认证", "LOGIN", "USER", userId, null,
                    success ? "用户登录成功" : "用户登录失败", success ? RESULT_SUCCESS : RESULT_FAIL, errorMessage);
        } catch (Exception ignored) {
            // Logging must not block the authentication flow.
        }
    }

    private void record(Long userId, String userAccount, String module, String action, String bizType, Long bizId,
                        Long sceneTemplateId, String description, String result, String errorMessage) {
        try {
            HttpServletRequest request = currentRequest();
            AccessLogEntity row = new AccessLogEntity();
            row.userId = userId;
            row.userAccount = trimTo(userAccount, 100);
            row.module = trimTo(module, 100);
            row.action = trimTo(action, 100);
            row.bizType = trimTo(bizType, 100);
            row.bizId = bizId;
            row.sceneTemplateId = sceneTemplateId;
            row.description = trimTo(description, 1000);
            row.requestMethod = request == null ? null : trimTo(request.getMethod(), 20);
            row.requestPath = request == null ? null : trimTo(request.getRequestURI(), 500);
            row.ipAddress = request == null ? null : trimTo(clientIp(request), 100);
            row.userAgent = request == null ? null : trimTo(request.getHeader("User-Agent"), 500);
            row.result = result == null || result.isBlank() ? RESULT_SUCCESS : result;
            row.errorMessage = trimTo(errorMessage, 1000);
            row.createAt = LocalDateTime.now();
            logs.insert(row);
        } catch (Exception ignored) {
            // Logging must not block the business action.
        }
    }

    private CurrentUser currentUserOrNull() {
        try {
            return currentUsers.current();
        } catch (Exception ignored) {
            return null;
        }
    }

    private Map<String, Object> dto(AccessLogEntity row) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("accessLogId", row.id);
        dto.put("userId", row.userId);
        dto.put("userAccount", row.userAccount);
        dto.put("module", row.module);
        dto.put("action", row.action);
        dto.put("bizType", row.bizType);
        dto.put("bizId", row.bizId);
        dto.put("sceneTemplateId", row.sceneTemplateId);
        dto.put("description", row.description);
        dto.put("requestMethod", row.requestMethod);
        dto.put("requestPath", row.requestPath);
        dto.put("ipAddress", row.ipAddress);
        dto.put("userAgent", row.userAgent);
        dto.put("result", row.result);
        dto.put("errorMessage", row.errorMessage);
        dto.put("createTime", row.createAt == null ? null : row.createAt.atZone(ZoneId.systemDefault()).toEpochSecond());
        return dto;
    }

    private QueryWrapper<AccessLogEntity> loginLogQuery(Long userId, String account) {
        QueryWrapper<AccessLogEntity> query = new QueryWrapper<AccessLogEntity>()
                .eq("biz_type", "USER")
                .in("action", List.of("LOGIN", "LOGOUT"));
        if (userId != null && account != null && !account.isBlank()) {
            query.and(wrapper -> wrapper.eq("user_id", userId).or().eq("user_account", account));
        } else if (userId != null) {
            query.eq("user_id", userId);
        } else if (account != null && !account.isBlank()) {
            query.eq("user_account", account);
        } else {
            query.eq("id", -1);
        }
        return query;
    }

    private static void applyKnowledgeActionFilter(QueryWrapper<AccessLogEntity> query, String action,
                                                   List<String> defaultActions) {
        if (action == null || action.isBlank()) {
            query.in("action", defaultActions);
            return;
        }
        List<String> actions = switch (action) {
            case "CREATE" -> List.of("CREATE", "CREATE_REQUEST");
            case "UPDATE" -> List.of("UPDATE", "UPDATE_REQUEST");
            case "DELETE" -> List.of("DELETE", "DELETE_REQUEST");
            default -> List.of(action);
        };
        List<String> effectiveActions = actions.stream().filter(defaultActions::contains).toList();
        if (effectiveActions.isEmpty()) {
            query.eq("id", -1);
            return;
        }
        query.in("action", effectiveActions);
    }

    private static void applySceneActionFilter(QueryWrapper<AccessLogEntity> query, String action) {
        List<String> defaultActions = List.of(
                "SCENE_CREATE", "SCENE_COPY", "SCENE_UPDATE", "SCENE_STATUS", "SCENE_ITEM_DELETE"
        );
        if (action == null || action.isBlank()) {
            query.in("action", defaultActions);
            return;
        }
        List<String> actions = switch (action) {
            case "CREATE" -> List.of("SCENE_CREATE", "SCENE_COPY");
            case "UPDATE" -> List.of("SCENE_UPDATE");
            case "STATUS" -> List.of("SCENE_STATUS");
            case "DELETE" -> List.of("SCENE_ITEM_DELETE");
            default -> List.of(action);
        };
        List<String> effectiveActions = actions.stream().filter(defaultActions::contains).toList();
        if (effectiveActions.isEmpty()) {
            query.eq("id", -1);
            return;
        }
        query.in("action", effectiveActions);
    }

    private Map<String, Object> page(QueryWrapper<AccessLogEntity> query, int pageNumber, int pageSize, String order) {
        applyTimeOrder(query, order);
        Page<AccessLogEntity> page = logs.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        return Map.of(
                "content", page.getRecords().stream().map(this::dto).toList(),
                "totalElements", page.getTotal()
        );
    }

    private List<Map<String, Object>> operatorOptions(QueryWrapper<AccessLogEntity> query) {
        query.select("user_id", "user_account")
                .isNotNull("user_id")
                .groupBy("user_id", "user_account")
                .orderByAsc("user_account");
        Map<Long, String> operators = new LinkedHashMap<>();
        for (AccessLogEntity row : logs.selectList(query)) {
            if (row.userId != null) {
                operators.putIfAbsent(row.userId, row.userAccount);
            }
        }
        return operators.entrySet().stream().map(entry -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("operatorId", entry.getKey());
            item.put("operatorName", entry.getValue());
            return item;
        }).toList();
    }

    private static void applyTimeRange(QueryWrapper<AccessLogEntity> query, List<String> searchTime) {
        if (searchTime == null || searchTime.isEmpty()) {
            return;
        }
        if (!DictService.str(searchTime.get(0)).isBlank()) {
            query.ge("create_at", searchTime.get(0));
        }
        if (searchTime.size() > 1 && !DictService.str(searchTime.get(1)).isBlank()) {
            query.le("create_at", searchTime.get(1));
        }
    }

    private static void applyTimeOrder(QueryWrapper<AccessLogEntity> query, String order) {
        if ("asc".equalsIgnoreCase(order)) {
            query.orderByAsc("create_at").orderByAsc("id");
            return;
        }
        query.orderByDesc("create_at").orderByDesc("id");
    }

    private static HttpServletRequest currentRequest() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs
                ? attrs.getRequest()
                : null;
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        return realIp == null || realIp.isBlank() ? request.getRemoteAddr() : realIp;
    }

    private static String trimTo(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
