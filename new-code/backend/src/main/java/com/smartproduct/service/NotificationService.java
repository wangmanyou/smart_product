package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.NotificationEntity;
import com.smartproduct.entity.UserEntity;
import com.smartproduct.mapper.NotificationMapper;
import com.smartproduct.mapper.UserMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.security.SecurityUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class NotificationService {
    private static final ObjectMapper JSON = new ObjectMapper();

    public static final String BIZ_CHANGE_REQUEST = "CHANGE_REQUEST";
    public static final String BIZ_IMPORT_RESULT = "IMPORT_RESULT";
    public static final String TYPE_APPROVAL_APPROVED = "APPROVAL_APPROVED";
    public static final String TYPE_APPROVAL_REJECTED = "APPROVAL_REJECTED";
    public static final String TYPE_APPROVAL_PENDING = "APPROVAL_PENDING";
    public static final String TYPE_IMPORT_RESULT = "IMPORT_RESULT";

    private final NotificationMapper notifications;
    private final CurrentUserService currentUsers;
    private final UserMapper users;
    private final SecurityUserService securityUsers;

    public NotificationService(NotificationMapper notifications, CurrentUserService currentUsers,
                               UserMapper users, SecurityUserService securityUsers) {
        this.notifications = notifications;
        this.currentUsers = currentUsers;
        this.users = users;
        this.securityUsers = securityUsers;
    }

    public Map<String, Object> listMine(int pageNumber, int pageSize, Boolean unreadOnly) {
        CurrentUser user = currentUsers.current();
        QueryWrapper<NotificationEntity> query = new QueryWrapper<NotificationEntity>()
                .eq("recipient_id", user.userId())
                .eq("archived", 0);
        if (Boolean.TRUE.equals(unreadOnly)) {
            query.isNull("read_at");
            query.orderByDesc("create_at").orderByDesc("id");
        } else {
            query.orderByAsc("case when read_at is null then 0 else 1 end")
                    .orderByDesc("create_at")
                    .orderByDesc("id");
        }
        Page<NotificationEntity> page = notifications.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(this::dto).toList());
        result.put("totalElements", page.getTotal());
        return result;
    }

    public Map<String, Object> unreadCount() {
        CurrentUser user = currentUsers.current();
        Long count = notifications.selectCount(new QueryWrapper<NotificationEntity>()
                .eq("recipient_id", user.userId())
                .eq("archived", 0)
                .isNull("read_at"));
        return Map.of("count", count == null ? 0 : count);
    }

    @Transactional
    public void markRead(Long notificationId) {
        CurrentUser user = currentUsers.current();
        notifications.update(new UpdateWrapper<NotificationEntity>()
                .eq("id", notificationId)
                .eq("recipient_id", user.userId())
                .isNull("read_at")
                .set("read_at", LocalDateTime.now())
                .set("update_at", LocalDateTime.now()));
    }

    @Transactional
    public void markAllRead() {
        CurrentUser user = currentUsers.current();
        notifications.update(new UpdateWrapper<NotificationEntity>()
                .eq("recipient_id", user.userId())
                .eq("archived", 0)
                .isNull("read_at")
                .set("read_at", LocalDateTime.now())
                .set("update_at", LocalDateTime.now()));
    }

    @Transactional
    public void create(Long recipientId, Long senderId, String senderName, String type, String title, String content,
                       String bizType, Long bizId, String linkUrl, String level, Map<String, Object> payload) {
        if (recipientId == null) {
            return;
        }
        NotificationEntity row = new NotificationEntity();
        row.recipientId = recipientId;
        row.senderId = senderId;
        row.senderName = senderName;
        row.type = type;
        row.title = title;
        row.content = content;
        row.bizType = bizType;
        row.bizId = bizId;
        row.linkUrl = linkUrl;
        row.level = level == null || level.isBlank() ? "INFO" : level;
        row.payloadJson = toJson(payload);
        row.archived = 0;
        row.createAt = LocalDateTime.now();
        row.updateAt = row.createAt;
        notifications.insert(row);
    }

    public void createApprovalResult(NotificationService.ApprovalNotice notice) {
        String type = notice.approved ? TYPE_APPROVAL_APPROVED : TYPE_APPROVAL_REJECTED;
        String title = notice.approved ? "\u4f60\u7684\u77e5\u8bc6\u53d8\u66f4\u7533\u8bf7\u5df2\u901a\u8fc7" : "\u4f60\u7684\u77e5\u8bc6\u53d8\u66f4\u7533\u8bf7\u88ab\u9a73\u56de";
        String action = notice.approved ? "\u901a\u8fc7" : "\u9a73\u56de";
        String comment = notice.reviewComment == null || notice.reviewComment.isBlank() ? "\u65e0" : notice.reviewComment;
        String status = notice.approved ? KnowledgeChangeRequestStatus.APPROVED : KnowledgeChangeRequestStatus.REJECTED;
        String content = "\u5ba1\u6279\u4eba\uff1a" + nullToDefault(notice.reviewerName, "-") + "\u3002\u5ba1\u6279\u7ed3\u679c\uff1a" + action + "\u3002\u5ba1\u6279\u610f\u89c1\uff1a" + comment;
        create(
                notice.applicantId,
                notice.reviewerId,
                notice.reviewerName,
                type,
                title,
                content,
                BIZ_CHANGE_REQUEST,
                notice.changeRequestId,
                "/system/approvals?tab=mine&status=" + status + "&changeRequestId=" + notice.changeRequestId,
                notice.approved ? "SUCCESS" : "WARNING",
                Map.of(
                        "changeRequestId", notice.changeRequestId,
                        "status", status,
                        "reviewComment", comment
                )
        );
    }

    @Transactional
    public void archiveApprovalPending(Long changeRequestId) {
        if (changeRequestId == null) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        notifications.update(new UpdateWrapper<NotificationEntity>()
                .eq("biz_type", BIZ_CHANGE_REQUEST)
                .eq("biz_id", changeRequestId)
                .eq("type", TYPE_APPROVAL_PENDING)
                .eq("archived", 0)
                .set("archived", 1)
                .set("read_at", now)
                .set("update_at", now));
    }

    public void createApprovalPending(ApprovalPendingNotice notice) {
        List<UserEntity> candidates = users.selectList(new QueryWrapper<UserEntity>()
                .eq("del", 0)
                .eq("is_disabled", false));
        String requestText = switch (notice.requestType) {
            case KnowledgeChangeRequestStatus.CREATE -> "\u65b0\u589e\u77e5\u8bc6";
            case KnowledgeChangeRequestStatus.UPDATE -> "\u7f16\u8f91\u77e5\u8bc6";
            case KnowledgeChangeRequestStatus.DELETE -> "\u5220\u9664\u77e5\u8bc6";
            default -> "\u77e5\u8bc6\u53d8\u66f4";
        };
        for (UserEntity candidate : candidates) {
            if (candidate.getId() == null || candidate.getId().equals(notice.applicantId)) {
                continue;
            }
            CurrentUser reviewer;
            try {
                reviewer = securityUsers.load(candidate.getId());
            } catch (Exception ex) {
                continue;
            }
            boolean canReview = reviewer.hasScenePermission(PermissionCodes.CHANGE_REQUEST_VIEW_ALL, notice.sceneTemplateId)
                    || reviewer.hasScenePermission(PermissionCodes.CHANGE_REQUEST_APPROVE, notice.sceneTemplateId)
                    || reviewer.hasScenePermission(PermissionCodes.CHANGE_REQUEST_REJECT, notice.sceneTemplateId)
                    || reviewer.hasScenePermission(PermissionCodes.SYSTEM_APPROVAL_MANAGE, notice.sceneTemplateId)
                    || reviewer.hasPermission(PermissionCodes.ADMIN);
            if (!canReview) {
                continue;
            }
            create(
                    reviewer.userId(),
                    notice.applicantId,
                    notice.applicantName,
                    TYPE_APPROVAL_PENDING,
                    "\u6709\u65b0\u7684\u77e5\u8bc6\u53d8\u66f4\u5f85\u5ba1\u6279",
                    "\u7533\u8bf7\u4eba\uff1a" + nullToDefault(notice.applicantName, "-") + "\u3002\u7533\u8bf7\u7c7b\u578b\uff1a" + requestText + "\u3002",
                    BIZ_CHANGE_REQUEST,
                    notice.changeRequestId,
                    "/system/approvals?tab=all&status=" + KnowledgeChangeRequestStatus.PENDING + "&changeRequestId=" + notice.changeRequestId,
                    "INFO",
                    Map.of(
                            "changeRequestId", notice.changeRequestId,
                            "status", KnowledgeChangeRequestStatus.PENDING,
                            "requestType", notice.requestType
                    )
            );
        }
    }

    public void createImportResult(ImportResultNotice notice) {
        if (notice == null) {
            return;
        }
        String sceneName = nullToDefault(notice.sceneName, "当前场景");
        String title = sceneName + " 批量导入完成";
        String content = "读取 " + notice.totalRows + " 行，直接导入 " + notice.importedRows
                + " 条，提交审批 " + notice.pendingRows + " 条，跳过 " + notice.skippedRows + " 行。";
        String level = notice.skippedRows > 0 ? "WARNING" : "SUCCESS";
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sceneTemplateId", notice.sceneTemplateId);
        payload.put("totalRows", notice.totalRows);
        payload.put("importedRows", notice.importedRows);
        payload.put("pendingRows", notice.pendingRows);
        payload.put("skippedRows", notice.skippedRows);
        payload.put("warnings", notice.warnings == null ? List.of() : notice.warnings);
        create(
                notice.recipientId,
                notice.senderId,
                notice.senderName,
                TYPE_IMPORT_RESULT,
                title,
                content,
                BIZ_IMPORT_RESULT,
                notice.sceneTemplateId,
                null,
                level,
                payload
        );
    }

    private Map<String, Object> dto(NotificationEntity row) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("notificationId", row.id);
        dto.put("type", row.type);
        dto.put("title", row.title);
        dto.put("content", row.content);
        dto.put("bizType", row.bizType);
        dto.put("bizId", row.bizId);
        dto.put("linkUrl", row.linkUrl);
        dto.put("level", row.level);
        dto.put("payload", parsePayload(row.payloadJson));
        dto.put("read", row.readAt != null);
        dto.put("readAt", epoch(row.readAt));
        dto.put("createTime", epoch(row.createAt));
        return dto;
    }

    private static String toJson(Map<String, Object> payload) {
        if (payload == null || payload.isEmpty()) {
            return null;
        }
        try {
            return JSON.writeValueAsString(payload);
        } catch (Exception ex) {
            return null;
        }
    }

    private static Map<String, Object> parsePayload(String payloadJson) {
        if (payloadJson == null || payloadJson.isBlank()) {
            return Map.of();
        }
        try {
            return JSON.readValue(payloadJson, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private static Long epoch(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toEpochSecond();
    }

    private static String nullToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    public static class ApprovalNotice {
        public Long changeRequestId;
        public Long applicantId;
        public Long reviewerId;
        public String reviewerName;
        public String reviewComment;
        public boolean approved;
    }

    public static class ApprovalPendingNotice {
        public Long changeRequestId;
        public String requestType;
        public Long sceneTemplateId;
        public Long applicantId;
        public String applicantName;
    }

    public static class ImportResultNotice {
        public Long sceneTemplateId;
        public String sceneName;
        public Long recipientId;
        public Long senderId;
        public String senderName;
        public int totalRows;
        public int importedRows;
        public int pendingRows;
        public int skippedRows;
        public List<String> warnings;
    }
}
