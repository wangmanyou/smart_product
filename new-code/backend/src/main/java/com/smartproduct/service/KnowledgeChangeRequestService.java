package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.KnowledgeChangeRequestEntity;
import com.smartproduct.mapper.KnowledgeChangeRequestMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@Service
public class KnowledgeChangeRequestService {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final KnowledgeChangeRequestMapper requests;
    private final CurrentUserService currentUsers;
    private final BusinessService businessService;
    private final NotificationService notificationService;

    public KnowledgeChangeRequestService(KnowledgeChangeRequestMapper requests, CurrentUserService currentUsers,
                                         BusinessService businessService, NotificationService notificationService) {
        this.requests = requests;
        this.currentUsers = currentUsers;
        this.businessService = businessService;
        this.notificationService = notificationService;
    }

    public Map<String, Object> listMine(int pageNumber, int pageSize, String status) {
        CurrentUser user = currentUsers.current();
        QueryWrapper<KnowledgeChangeRequestEntity> query = baseQuery(status).eq("applicant_id", user.userId());
        return page(pageNumber, pageSize, query);
    }

    public Map<String, Object> listAll(int pageNumber, int pageSize, String status) {
        CurrentUser user = currentUsers.current();
        QueryWrapper<KnowledgeChangeRequestEntity> query = baseQuery(status)
                .ne("applicant_id", user.userId());
        applyReviewSceneScope(query, user);
        return page(pageNumber, pageSize, query);
    }

    @Transactional
    public void updatePending(Long requestId, Map<String, Object> payload) {
        CurrentUser user = currentUsers.current();
        KnowledgeChangeRequestEntity row = requirePendingOwner(requestId, user);
        try {
            requests.update(new UpdateWrapper<KnowledgeChangeRequestEntity>()
                    .eq("id", row.id)
                    .eq("status", KnowledgeChangeRequestStatus.PENDING)
                    .set("payload_json", JSON.writeValueAsString(payload == null ? Map.of() : payload))
                    .set("update_at", LocalDateTime.now()));
        } catch (Exception ex) {
            throw new IllegalStateException("更新知识审批申请失败", ex);
        }
    }

    @Transactional
    public void withdraw(Long requestId) {
        CurrentUser user = currentUsers.current();
        KnowledgeChangeRequestEntity row = requirePendingOwner(requestId, user);
        requests.update(new UpdateWrapper<KnowledgeChangeRequestEntity>()
                .eq("id", row.id)
                .eq("status", KnowledgeChangeRequestStatus.PENDING)
                .set("status", KnowledgeChangeRequestStatus.WITHDRAWN)
                .set("update_at", LocalDateTime.now()));
        notificationService.archiveApprovalPending(row.id);
    }

    @Transactional
    public void deleteRecord(Long requestId) {
        CurrentUser user = currentUsers.current();
        KnowledgeChangeRequestEntity row = requireExisting(requestId);
        if (!row.applicantId.equals(user.userId()) && !user.admin()) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "只能删除自己的审批申请记录");
        }
        if (!KnowledgeChangeRequestStatus.REJECTED.equals(row.status)
                && !KnowledgeChangeRequestStatus.WITHDRAWN.equals(row.status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "只有已驳回或已撤回的申请记录可以删除");
        }
        requests.update(new UpdateWrapper<KnowledgeChangeRequestEntity>()
                .eq("id", row.id)
                .set("del", 1)
                .set("update_at", LocalDateTime.now()));
    }

    @Transactional
    public void approve(Long requestId, String reviewComment) {
        CurrentUser reviewer = currentUsers.current();
        KnowledgeChangeRequestEntity row = requirePending(requestId);
        requireReviewAccess(reviewer, row, PermissionCodes.CHANGE_REQUEST_APPROVE);
        Map<String, Object> payload = parsePayload(row.payloadJson);
        LocalDateTime now = LocalDateTime.now();
        int updated = requests.update(new UpdateWrapper<KnowledgeChangeRequestEntity>()
                .eq("id", row.id)
                .eq("status", KnowledgeChangeRequestStatus.PENDING)
                .set("status", KnowledgeChangeRequestStatus.APPROVED)
                .set("reviewer_id", reviewer.userId())
                .set("reviewer_name", reviewer.account())
                .set("review_comment", reviewComment == null ? "" : reviewComment)
                .set("reviewed_at", now)
                .set("update_at", now));
        if (updated == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "该审批申请已被其他审批人处理");
        }
        if (KnowledgeChangeRequestStatus.CREATE.equals(row.requestType)) {
            businessService.addKnowledgeDirect(payload, row.applicantId, row.applicantName);
        } else if (KnowledgeChangeRequestStatus.UPDATE.equals(row.requestType)) {
            businessService.editKnowledgeDirect(payload);
        } else if (KnowledgeChangeRequestStatus.DELETE.equals(row.requestType)) {
            businessService.deleteKnowledgeDirect(row.knowledgeId);
        }
        notificationService.archiveApprovalPending(row.id);
        notificationService.createApprovalResult(approvalNotice(row, reviewer, reviewComment, true));
    }

    @Transactional
    public void reject(Long requestId, String reviewComment) {
        CurrentUser reviewer = currentUsers.current();
        KnowledgeChangeRequestEntity row = requirePending(requestId);
        requireReviewAccess(reviewer, row, PermissionCodes.CHANGE_REQUEST_REJECT);
        LocalDateTime now = LocalDateTime.now();
        int updated = requests.update(new UpdateWrapper<KnowledgeChangeRequestEntity>()
                .eq("id", row.id)
                .eq("status", KnowledgeChangeRequestStatus.PENDING)
                .set("status", KnowledgeChangeRequestStatus.REJECTED)
                .set("reviewer_id", reviewer.userId())
                .set("reviewer_name", reviewer.account())
                .set("review_comment", reviewComment == null ? "" : reviewComment)
                .set("reviewed_at", now)
                .set("update_at", now));
        if (updated == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "该审批申请已被其他审批人处理");
        }
        notificationService.archiveApprovalPending(row.id);
        notificationService.createApprovalResult(approvalNotice(row, reviewer, reviewComment, false));
    }

    private NotificationService.ApprovalNotice approvalNotice(KnowledgeChangeRequestEntity row, CurrentUser reviewer,
                                                              String reviewComment, boolean approved) {
        NotificationService.ApprovalNotice notice = new NotificationService.ApprovalNotice();
        notice.changeRequestId = row.id;
        notice.applicantId = row.applicantId;
        notice.reviewerId = reviewer.userId();
        notice.reviewerName = reviewer.account();
        notice.reviewComment = reviewComment == null ? "" : reviewComment;
        notice.approved = approved;
        return notice;
    }

    private QueryWrapper<KnowledgeChangeRequestEntity> baseQuery(String status) {
        QueryWrapper<KnowledgeChangeRequestEntity> query = new QueryWrapper<KnowledgeChangeRequestEntity>().eq("del", 0);
        if (status != null && !status.isBlank()) {
            query.eq("status", status);
        }
        query.orderByDesc("update_at").orderByDesc("id");
        return query;
    }

    private void applyReviewSceneScope(QueryWrapper<KnowledgeChangeRequestEntity> query, CurrentUser user) {
        if (user.admin()) {
            return;
        }
        Set<Long> sceneIds = user.sceneIdsForAnyPermission(
                PermissionCodes.CHANGE_REQUEST_VIEW_ALL,
                PermissionCodes.CHANGE_REQUEST_APPROVE,
                PermissionCodes.CHANGE_REQUEST_REJECT,
                PermissionCodes.SYSTEM_APPROVAL_MANAGE
        );
        if (sceneIds.isEmpty()) {
            query.eq("scene_template_id", -1L);
            return;
        }
        query.in("scene_template_id", sceneIds);
    }

    private void requireReviewAccess(CurrentUser reviewer, KnowledgeChangeRequestEntity row, String permission) {
        if (row.applicantId != null && row.applicantId.equals(reviewer.userId())) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "不能审批自己提交的申请");
        }
        if (!reviewer.hasScenePermission(permission, row.sceneTemplateId)
                && !reviewer.hasScenePermission(PermissionCodes.SYSTEM_APPROVAL_MANAGE, row.sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "只能审批已授权场景下的知识变更申请");
        }
    }

    private Map<String, Object> page(int pageNumber, int pageSize, QueryWrapper<KnowledgeChangeRequestEntity> query) {
        Page<KnowledgeChangeRequestEntity> page = requests.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(this::dto).toList());
        result.put("totalElements", page.getTotal());
        return result;
    }

    private KnowledgeChangeRequestEntity requireExisting(Long requestId) {
        KnowledgeChangeRequestEntity row = requests.selectOne(new QueryWrapper<KnowledgeChangeRequestEntity>()
                .eq("id", requestId)
                .eq("del", 0));
        if (row == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "审批申请不存在");
        }
        return row;
    }

    private KnowledgeChangeRequestEntity requirePending(Long requestId) {
        KnowledgeChangeRequestEntity row = requireExisting(requestId);
        if (!KnowledgeChangeRequestStatus.PENDING.equals(row.status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "只有待审批申请可以审核");
        }
        return row;
    }

    private KnowledgeChangeRequestEntity requirePendingOwner(Long requestId, CurrentUser user) {
        KnowledgeChangeRequestEntity row = requirePending(requestId);
        if (!row.applicantId.equals(user.userId())) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "只能操作自己的待审批申请");
        }
        return row;
    }

    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            if (payloadJson == null || payloadJson.isBlank()) {
                return Map.of();
            }
            return JSON.readValue(payloadJson, new TypeReference<>() {
            });
        } catch (Exception ex) {
            throw new IllegalStateException("解析知识审批申请内容失败", ex);
        }
    }

    private Map<String, Object> dto(KnowledgeChangeRequestEntity row) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("changeRequestId", row.id);
        dto.put("requestType", row.requestType);
        dto.put("status", row.status);
        dto.put("knowledgeId", row.knowledgeId);
        dto.put("sceneTemplateId", row.sceneTemplateId);
        dto.put("payload", parsePayload(row.payloadJson));
        dto.put("before", parsePayload(row.beforeJson));
        dto.put("reason", row.reason);
        dto.put("applicantId", row.applicantId);
        dto.put("applicantName", row.applicantName);
        dto.put("reviewerId", row.reviewerId);
        dto.put("reviewerName", row.reviewerName);
        dto.put("reviewComment", row.reviewComment);
        dto.put("reviewedAt", epoch(row.reviewedAt));
        dto.put("createTime", epoch(row.createAt));
        dto.put("updateTime", epoch(row.updateAt));
        return dto;
    }

    private static Long epoch(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toEpochSecond();
    }
}
