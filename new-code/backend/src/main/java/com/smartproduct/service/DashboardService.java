package com.smartproduct.service;

import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class DashboardService {
    private static final DateTimeFormatter SECOND_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter ISO_SECOND_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final int MAX_RANGE_DAYS = 731;

    private final NamedParameterJdbcTemplate jdbc;
    private final CurrentUserService currentUsers;

    public DashboardService(NamedParameterJdbcTemplate jdbc, CurrentUserService currentUsers) {
        this.jdbc = jdbc;
        this.currentUsers = currentUsers;
    }

    public Map<String, Object> overview(String startTime, String endTime, List<Long> requestedSceneIds,
                                        String granularityValue, boolean comparePrevious) {
        DashboardRange range = resolveRange(startTime, endTime, granularityValue);
        CurrentUser user = currentUsers.current();
        List<SceneOption> availableScenes = loadAvailableScenes(user);
        List<Long> selectedSceneIds = selectSceneIds(availableScenes, requestedSceneIds);
        WorkMode workMode = workMode(user);

        if (selectedSceneIds.isEmpty()) {
            return emptyOverview(range, availableScenes, selectedSceneIds, workMode, comparePrevious);
        }

        Map<String, Object> summary = loadSummary(selectedSceneIds, range, comparePrevious);
        Map<String, Object> approvalGovernance = loadApprovalGovernance(selectedSceneIds, range, user, workMode);
        summary.put("pendingApprovalCount", approvalGovernance.get("pendingCount"));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("range", rangeMap(range));
        result.put("availableScenes", availableScenes.stream().map(SceneOption::toMap).toList());
        result.put("selectedSceneTemplateIds", selectedSceneIds);
        result.put("summary", summary);
        result.put("trend", loadTrend(selectedSceneIds, range));
        result.put("scenePerformance", loadScenePerformance(selectedSceneIds, range, user, workMode));
        result.put("popularKnowledge", loadPopularKnowledge(selectedSceneIds, range));
        result.put("approvalGovernance", approvalGovernance);
        result.put("myWork", loadMyWork(selectedSceneIds, user, workMode, approvalGovernance));
        result.put("riskSummary", loadRiskSummary(selectedSceneIds, range, approvalGovernance));
        return result;
    }

    private Map<String, Object> loadSummary(List<Long> sceneIds, DashboardRange range, boolean comparePrevious) {
        MapSqlParameterSource current = rangeParams(sceneIds, range.start(), range.endExclusive());
        long totalKnowledge = count("""
                SELECT COUNT(*)
                FROM knowledge
                WHERE COALESCE(del, 0) = 0
                  AND scene_template_id IN (:sceneIds)
                """, current);
        long newKnowledge = count("""
                SELECT COUNT(*)
                FROM knowledge
                WHERE COALESCE(del, 0) = 0
                  AND scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                """, current);
        long viewCount = count("""
                SELECT COUNT(*)
                FROM access_log
                WHERE action = 'VIEW'
                  AND result = 'SUCCESS'
                  AND biz_type = 'KNOWLEDGE'
                  AND scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                """, current);
        long activeUserCount = count("""
                SELECT COUNT(DISTINCT CASE WHEN user_id > 0 THEN user_id END)
                FROM access_log
                WHERE result = 'SUCCESS'
                  AND scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                """, current);
        long changeCount = count("""
                SELECT COUNT(*)
                FROM knowledge_version
                WHERE scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                """, current);

        Map<String, Object> comparisons = new LinkedHashMap<>();
        if (comparePrevious) {
            MapSqlParameterSource previous = rangeParams(sceneIds, range.previousStart(), range.start());
            long previousNewKnowledge = count("""
                    SELECT COUNT(*)
                    FROM knowledge
                    WHERE COALESCE(del, 0) = 0
                      AND scene_template_id IN (:sceneIds)
                      AND create_at >= :startTime
                      AND create_at < :endTime
                    """, previous);
            long previousViewCount = count("""
                    SELECT COUNT(*)
                    FROM access_log
                    WHERE action = 'VIEW'
                      AND result = 'SUCCESS'
                      AND biz_type = 'KNOWLEDGE'
                      AND scene_template_id IN (:sceneIds)
                      AND create_at >= :startTime
                      AND create_at < :endTime
                    """, previous);
            long previousActiveUsers = count("""
                    SELECT COUNT(DISTINCT CASE WHEN user_id > 0 THEN user_id END)
                    FROM access_log
                    WHERE result = 'SUCCESS'
                      AND scene_template_id IN (:sceneIds)
                      AND create_at >= :startTime
                      AND create_at < :endTime
                    """, previous);
            long previousChanges = count("""
                    SELECT COUNT(*)
                    FROM knowledge_version
                    WHERE scene_template_id IN (:sceneIds)
                      AND create_at >= :startTime
                      AND create_at < :endTime
                    """, previous);
            comparisons.put("newKnowledge", comparison(newKnowledge, previousNewKnowledge));
            comparisons.put("viewCount", comparison(viewCount, previousViewCount));
            comparisons.put("activeUserCount", comparison(activeUserCount, previousActiveUsers));
            comparisons.put("changeCount", comparison(changeCount, previousChanges));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sceneCount", sceneIds.size());
        result.put("totalKnowledge", totalKnowledge);
        result.put("newKnowledge", newKnowledge);
        result.put("viewCount", viewCount);
        result.put("activeUserCount", activeUserCount);
        result.put("changeCount", changeCount);
        result.put("pendingApprovalCount", 0L);
        result.put("comparisonEnabled", comparePrevious);
        result.put("comparison", comparisons);
        return result;
    }

    private List<Map<String, Object>> loadTrend(List<Long> sceneIds, DashboardRange range) {
        MapSqlParameterSource params = rangeParams(sceneIds, range.start(), range.endExclusive());
        String knowledgeBucket = range.granularity().bucketExpression("create_at");
        String accessBucket = range.granularity().bucketExpression("create_at");
        String versionBucket = range.granularity().bucketExpression("create_at");

        Map<String, Long> views = metricByBucket("""
                SELECT %s AS bucket_start, COUNT(*) AS metric_count
                FROM access_log
                WHERE action = 'VIEW'
                  AND result = 'SUCCESS'
                  AND biz_type = 'KNOWLEDGE'
                  AND scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                GROUP BY bucket_start
                ORDER BY bucket_start
                """.formatted(accessBucket), params);
        Map<String, Long> additions = metricByBucket("""
                SELECT %s AS bucket_start, COUNT(*) AS metric_count
                FROM knowledge
                WHERE COALESCE(del, 0) = 0
                  AND scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                GROUP BY bucket_start
                ORDER BY bucket_start
                """.formatted(knowledgeBucket), params);
        Map<String, Long> changes = metricByBucket("""
                SELECT %s AS bucket_start, COUNT(*) AS metric_count
                FROM knowledge_version
                WHERE scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                GROUP BY bucket_start
                ORDER BY bucket_start
                """.formatted(versionBucket), params);

        List<Map<String, Object>> trend = new ArrayList<>();
        for (LocalDate bucket : range.bucketStarts()) {
            String key = DATE_FORMAT.format(bucket);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("bucketStart", key);
            item.put("label", range.granularity().label(bucket));
            item.put("viewCount", views.getOrDefault(key, 0L));
            item.put("newKnowledge", additions.getOrDefault(key, 0L));
            item.put("changeCount", changes.getOrDefault(key, 0L));
            trend.add(item);
        }
        return trend;
    }

    private List<Map<String, Object>> loadScenePerformance(List<Long> sceneIds, DashboardRange range,
                                                            CurrentUser user, WorkMode workMode) {
        MapSqlParameterSource params = rangeParams(sceneIds, range.start(), range.endExclusive())
                .addValue("currentUserId", user.userId());
        String applicantFilter = workMode == WorkMode.OWN ? " AND applicant_id = :currentUserId" : "";
        String pendingJoin = workMode == WorkMode.NONE ? "" : """
                LEFT JOIN (
                    SELECT scene_template_id, COUNT(*) AS pending_count
                    FROM knowledge_change_request
                    WHERE COALESCE(del, 0) = 0
                      AND status = 'PENDING'
                      AND scene_template_id IN (:sceneIds)
                      %s
                    GROUP BY scene_template_id
                ) pending ON pending.scene_template_id = scene.id
                """.formatted(applicantFilter);
        String pendingColumn = workMode == WorkMode.NONE ? "0" : "COALESCE(pending.pending_count, 0)";

        String sql = """
                SELECT scene.id AS scene_id,
                       scene.name AS scene_name,
                       COALESCE(knowledge_stats.knowledge_count, 0) AS knowledge_count,
                       COALESCE(knowledge_stats.new_knowledge_count, 0) AS new_knowledge_count,
                       COALESCE(access_stats.view_count, 0) AS view_count,
                       COALESCE(access_stats.active_user_count, 0) AS active_user_count,
                       COALESCE(version_stats.change_count, 0) AS change_count,
                       %s AS pending_approval_count
                FROM scene_template scene
                LEFT JOIN (
                    SELECT scene_template_id,
                           COUNT(*) AS knowledge_count,
                           SUM(CASE WHEN create_at >= :startTime AND create_at < :endTime THEN 1 ELSE 0 END) AS new_knowledge_count
                    FROM knowledge
                    WHERE COALESCE(del, 0) = 0
                      AND scene_template_id IN (:sceneIds)
                    GROUP BY scene_template_id
                ) knowledge_stats ON knowledge_stats.scene_template_id = scene.id
                LEFT JOIN (
                    SELECT scene_template_id,
                           COUNT(*) AS view_count,
                           COUNT(DISTINCT CASE WHEN user_id > 0 THEN user_id END) AS active_user_count
                    FROM access_log
                    WHERE action = 'VIEW'
                      AND result = 'SUCCESS'
                      AND biz_type = 'KNOWLEDGE'
                      AND scene_template_id IN (:sceneIds)
                      AND create_at >= :startTime
                      AND create_at < :endTime
                    GROUP BY scene_template_id
                ) access_stats ON access_stats.scene_template_id = scene.id
                LEFT JOIN (
                    SELECT scene_template_id, COUNT(*) AS change_count
                    FROM knowledge_version
                    WHERE scene_template_id IN (:sceneIds)
                      AND create_at >= :startTime
                      AND create_at < :endTime
                    GROUP BY scene_template_id
                ) version_stats ON version_stats.scene_template_id = scene.id
                %s
                WHERE COALESCE(scene.del, 0) = 0
                  AND scene.id IN (:sceneIds)
                ORDER BY view_count DESC, knowledge_count DESC, scene.id ASC
                """.formatted(pendingColumn, pendingJoin);

        return jdbc.query(sql, params, (rs, rowNum) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("sceneTemplateId", rs.getLong("scene_id"));
            item.put("sceneName", rs.getString("scene_name"));
            item.put("knowledgeCount", rs.getLong("knowledge_count"));
            item.put("newKnowledge", rs.getLong("new_knowledge_count"));
            item.put("viewCount", rs.getLong("view_count"));
            item.put("activeUserCount", rs.getLong("active_user_count"));
            item.put("changeCount", rs.getLong("change_count"));
            item.put("pendingApprovalCount", rs.getLong("pending_approval_count"));
            return item;
        });
    }

    private List<Map<String, Object>> loadPopularKnowledge(List<Long> sceneIds, DashboardRange range) {
        MapSqlParameterSource params = rangeParams(sceneIds, range.start(), range.endExclusive());
        return jdbc.query("""
                SELECT log.biz_id AS knowledge_id,
                       knowledge.scene_template_id AS scene_id,
                       scene.name AS scene_name,
                       MAX(knowledge.creator_name) AS creator_name,
                       COUNT(DISTINCT log.id) AS view_count,
                       COUNT(DISTINCT CASE WHEN log.user_id > 0 THEN log.user_id END) AS viewer_count,
                       MAX(log.create_at) AS last_view_at,
                       MAX(CASE
                           WHEN item_definition.type = 'title'
                            AND NULLIF(TRIM(item.scene_item_value), '') IS NOT NULL
                           THEN LEFT(item.scene_item_value, 120)
                           ELSE NULL
                       END) AS preview_value
                FROM access_log log
                INNER JOIN knowledge knowledge
                        ON knowledge.id = log.biz_id
                       AND COALESCE(knowledge.del, 0) = 0
                INNER JOIN scene_template scene
                        ON scene.id = knowledge.scene_template_id
                       AND COALESCE(scene.del, 0) = 0
                LEFT JOIN knowledge_item item ON item.knowledge_id = knowledge.id
                LEFT JOIN scene_item item_definition
                       ON item_definition.id = item.scene_item_id
                      AND COALESCE(item_definition.del, 0) = 0
                      AND COALESCE(item_definition.is_hide, 0) = 0
                WHERE log.action = 'VIEW'
                  AND log.result = 'SUCCESS'
                  AND log.biz_type = 'KNOWLEDGE'
                  AND log.scene_template_id IN (:sceneIds)
                  AND log.create_at >= :startTime
                  AND log.create_at < :endTime
                GROUP BY log.biz_id, knowledge.scene_template_id, scene.name
                ORDER BY view_count DESC, last_view_at DESC
                LIMIT 10
                """, params, (rs, rowNum) -> {
            long knowledgeId = rs.getLong("knowledge_id");
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("knowledgeId", knowledgeId);
            item.put("sceneTemplateId", rs.getLong("scene_id"));
            item.put("sceneName", rs.getString("scene_name"));
            item.put("displayName", cleanPreview(rs.getString("preview_value"), knowledgeId));
            item.put("creatorName", rs.getString("creator_name"));
            item.put("viewCount", rs.getLong("view_count"));
            item.put("viewerCount", rs.getLong("viewer_count"));
            item.put("lastViewAt", formatDateTime(rs.getObject("last_view_at", LocalDateTime.class)));
            return item;
        });
    }

    private Map<String, Object> loadApprovalGovernance(List<Long> sceneIds, DashboardRange range,
                                                        CurrentUser user, WorkMode workMode) {
        Map<String, Object> empty = emptyApprovalGovernance(workMode);
        if (workMode == WorkMode.NONE) {
            return empty;
        }
        MapSqlParameterSource params = rangeParams(sceneIds, range.start(), range.endExclusive())
                .addValue("currentUserId", user.userId());
        String applicantFilter = workMode == WorkMode.OWN ? " AND applicant_id = :currentUserId" : "";
        Map<String, Object> row = jdbc.queryForMap("""
                SELECT SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending_count,
                       SUM(CASE WHEN status = 'PENDING' AND create_at < DATE_SUB(NOW(), INTERVAL 24 HOUR) THEN 1 ELSE 0 END) AS overdue_count,
                       SUM(CASE WHEN status = 'APPROVED' AND reviewed_at >= :startTime AND reviewed_at < :endTime THEN 1 ELSE 0 END) AS approved_count,
                       SUM(CASE WHEN status = 'REJECTED' AND reviewed_at >= :startTime AND reviewed_at < :endTime THEN 1 ELSE 0 END) AS rejected_count,
                       AVG(CASE
                           WHEN status IN ('APPROVED', 'REJECTED')
                            AND reviewed_at >= :startTime
                            AND reviewed_at < :endTime
                           THEN TIMESTAMPDIFF(MINUTE, create_at, reviewed_at) / 60.0
                           ELSE NULL
                       END) AS average_review_hours
                FROM knowledge_change_request
                WHERE COALESCE(del, 0) = 0
                  AND scene_template_id IN (:sceneIds)
                  %s
                """.formatted(applicantFilter), params);

        long pending = number(row.get("pending_count"));
        long overdue = number(row.get("overdue_count"));
        long approved = number(row.get("approved_count"));
        long rejected = number(row.get("rejected_count"));
        long reviewed = approved + rejected;
        double approvalRate = reviewed == 0 ? 0 : roundOne(approved * 100.0 / reviewed);
        double averageHours = row.get("average_review_hours") instanceof Number value ? roundOne(value.doubleValue()) : 0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", workMode.name());
        result.put("pendingCount", pending);
        result.put("overdue24hCount", overdue);
        result.put("approvedCount", approved);
        result.put("rejectedCount", rejected);
        result.put("approvalRate", approvalRate);
        result.put("averageReviewHours", averageHours);
        return result;
    }

    private Map<String, Object> loadMyWork(List<Long> sceneIds, CurrentUser user, WorkMode workMode,
                                            Map<String, Object> governance) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", workMode.name());
        result.put("pendingCount", governance.getOrDefault("pendingCount", 0L));
        result.put("overdue24hCount", governance.getOrDefault("overdue24hCount", 0L));
        if (workMode == WorkMode.NONE) {
            result.put("items", List.of());
            return result;
        }

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("sceneIds", sceneIds)
                .addValue("currentUserId", user.userId());
        String applicantFilter = workMode == WorkMode.OWN ? " AND request.applicant_id = :currentUserId" : "";
        List<Map<String, Object>> items = jdbc.query("""
                SELECT request.id,
                       request.request_type,
                       request.knowledge_id,
                       request.scene_template_id,
                       request.applicant_name,
                       request.reason,
                       request.create_at,
                       TIMESTAMPDIFF(HOUR, request.create_at, NOW()) AS waiting_hours,
                       scene.name AS scene_name
                FROM knowledge_change_request request
                LEFT JOIN scene_template scene ON scene.id = request.scene_template_id
                WHERE COALESCE(request.del, 0) = 0
                  AND request.status = 'PENDING'
                  AND request.scene_template_id IN (:sceneIds)
                  %s
                ORDER BY request.create_at ASC, request.id ASC
                LIMIT 6
                """.formatted(applicantFilter), params, (rs, rowNum) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            long waitingHours = rs.getLong("waiting_hours");
            item.put("changeRequestId", rs.getLong("id"));
            item.put("requestType", rs.getString("request_type"));
            item.put("knowledgeId", nullableLong(rs.getObject("knowledge_id")));
            item.put("sceneTemplateId", nullableLong(rs.getObject("scene_template_id")));
            item.put("sceneName", rs.getString("scene_name"));
            item.put("applicantName", rs.getString("applicant_name"));
            item.put("reason", rs.getString("reason"));
            item.put("createdAt", formatDateTime(rs.getObject("create_at", LocalDateTime.class)));
            item.put("waitingHours", waitingHours);
            item.put("overdue", waitingHours >= 24);
            return item;
        });
        result.put("items", items);
        return result;
    }

    private Map<String, Object> loadRiskSummary(List<Long> sceneIds, DashboardRange range,
                                                 Map<String, Object> approvalGovernance) {
        MapSqlParameterSource params = rangeParams(sceneIds, range.start(), range.endExclusive());
        long failedOperations = count("""
                SELECT COUNT(*)
                FROM access_log
                WHERE result = 'FAIL'
                  AND scene_template_id IN (:sceneIds)
                  AND create_at >= :startTime
                  AND create_at < :endTime
                """, params);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("failedOperationCount", failedOperations);
        result.put("overdueApprovalCount", approvalGovernance.getOrDefault("overdue24hCount", 0L));
        result.put("hasRisk", failedOperations > 0 || number(approvalGovernance.get("overdue24hCount")) > 0);
        return result;
    }

    private List<SceneOption> loadAvailableScenes(CurrentUser user) {
        if (!user.admin() && (user.sceneTemplateIds() == null || user.sceneTemplateIds().isEmpty())) {
            return List.of();
        }
        MapSqlParameterSource params = new MapSqlParameterSource();
        String scope = "";
        if (!user.admin()) {
            scope = " AND id IN (:allowedSceneIds)";
            params.addValue("allowedSceneIds", user.sceneTemplateIds());
        }
        return jdbc.query("""
                SELECT id, name, COALESCE(is_disabled, 0) AS disabled
                FROM scene_template
                WHERE COALESCE(del, 0) = 0
                %s
                ORDER BY disabled ASC, id ASC
                """.formatted(scope), params, (rs, rowNum) -> new SceneOption(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getBoolean("disabled")
        ));
    }

    private Map<String, Long> metricByBucket(String sql, MapSqlParameterSource params) {
        Map<String, Long> result = new LinkedHashMap<>();
        jdbc.query(sql, params, rs -> {
            result.put(rs.getString("bucket_start"), rs.getLong("metric_count"));
        });
        return result;
    }

    private long count(String sql, MapSqlParameterSource params) {
        Long value = jdbc.queryForObject(sql, params, Long.class);
        return value == null ? 0 : value;
    }

    private static List<Long> selectSceneIds(List<SceneOption> availableScenes, List<Long> requestedSceneIds) {
        List<Long> availableIds = availableScenes.stream().map(SceneOption::id).toList();
        if (requestedSceneIds == null || requestedSceneIds.isEmpty()) {
            return availableIds;
        }
        Set<Long> requested = requestedSceneIds.stream()
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        return availableIds.stream().filter(requested::contains).toList();
    }

    private static WorkMode workMode(CurrentUser user) {
        boolean reviewer = user.hasPermission(PermissionCodes.SYSTEM_APPROVAL_MANAGE)
                || user.hasPermission(PermissionCodes.CHANGE_REQUEST_VIEW_ALL)
                || user.hasPermission(PermissionCodes.CHANGE_REQUEST_APPROVE)
                || user.hasPermission(PermissionCodes.CHANGE_REQUEST_REJECT);
        if (reviewer) {
            return WorkMode.REVIEW;
        }
        boolean own = user.hasPermission(PermissionCodes.CHANGE_REQUEST_VIEW_OWN)
                || user.approvalRequiredPermissions() != null && !user.approvalRequiredPermissions().isEmpty();
        return own ? WorkMode.OWN : WorkMode.NONE;
    }

    private static MapSqlParameterSource rangeParams(Collection<Long> sceneIds, LocalDateTime start, LocalDateTime end) {
        return new MapSqlParameterSource()
                .addValue("sceneIds", sceneIds)
                .addValue("startTime", start)
                .addValue("endTime", end);
    }

    private static Map<String, Object> comparison(long current, long previous) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("current", current);
        result.put("previous", previous);
        result.put("delta", current - previous);
        result.put("rate", previous == 0 ? null : roundOne((current - previous) * 100.0 / previous));
        return result;
    }

    private static Map<String, Object> rangeMap(DashboardRange range) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("startTime", formatDateTime(range.start()));
        result.put("endTime", formatDateTime(range.endExclusive().minusNanos(1)));
        result.put("startDate", DATE_FORMAT.format(range.start().toLocalDate()));
        result.put("endDate", DATE_FORMAT.format(range.endExclusive().minusNanos(1).toLocalDate()));
        result.put("previousStartTime", formatDateTime(range.previousStart()));
        result.put("previousEndTime", formatDateTime(range.start().minusNanos(1)));
        result.put("granularity", range.granularity().name());
        return result;
    }

    private static Map<String, Object> emptyOverview(DashboardRange range, List<SceneOption> availableScenes,
                                                      List<Long> selectedSceneIds, WorkMode workMode,
                                                      boolean comparePrevious) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("sceneCount", 0);
        summary.put("totalKnowledge", 0L);
        summary.put("newKnowledge", 0L);
        summary.put("viewCount", 0L);
        summary.put("activeUserCount", 0L);
        summary.put("changeCount", 0L);
        summary.put("pendingApprovalCount", 0L);
        summary.put("comparisonEnabled", comparePrevious);
        summary.put("comparison", Map.of());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("range", rangeMap(range));
        result.put("availableScenes", availableScenes.stream().map(SceneOption::toMap).toList());
        result.put("selectedSceneTemplateIds", selectedSceneIds);
        result.put("summary", summary);
        result.put("trend", List.of());
        result.put("scenePerformance", List.of());
        result.put("popularKnowledge", List.of());
        result.put("approvalGovernance", emptyApprovalGovernance(workMode));
        result.put("myWork", Map.of("mode", workMode.name(), "pendingCount", 0L, "overdue24hCount", 0L, "items", List.of()));
        result.put("riskSummary", Map.of("failedOperationCount", 0L, "overdueApprovalCount", 0L, "hasRisk", false));
        return result;
    }

    private static Map<String, Object> emptyApprovalGovernance(WorkMode mode) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("mode", mode.name());
        result.put("pendingCount", 0L);
        result.put("overdue24hCount", 0L);
        result.put("approvedCount", 0L);
        result.put("rejectedCount", 0L);
        result.put("approvalRate", 0D);
        result.put("averageReviewHours", 0D);
        return result;
    }

    static DashboardRange resolveRange(String startValue, String endValue, String granularityValue) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = startValue == null || startValue.isBlank()
                ? today.minusDays(29).atStartOfDay()
                : parseBoundary(startValue, false);
        LocalDateTime endExclusive = endValue == null || endValue.isBlank()
                ? today.plusDays(1).atStartOfDay()
                : parseBoundary(endValue, true);
        if (!start.isBefore(endExclusive)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "开始时间必须早于结束时间");
        }
        long days = Math.max(1, Duration.between(start, endExclusive).toDays());
        if (days > MAX_RANGE_DAYS) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "数据看板单次查询范围不能超过 731 天");
        }
        Granularity granularity = Granularity.resolve(granularityValue, days);
        Duration duration = Duration.between(start, endExclusive);
        return new DashboardRange(start, endExclusive, start.minus(duration), granularity);
    }

    private static LocalDateTime parseBoundary(String value, boolean endBoundary) {
        String text = value == null ? "" : value.trim();
        try {
            if (text.length() == 10) {
                LocalDate date = LocalDate.parse(text, DATE_FORMAT);
                return endBoundary ? date.plusDays(1).atStartOfDay() : date.atStartOfDay();
            }
            LocalDateTime parsed;
            try {
                parsed = LocalDateTime.parse(text, ISO_SECOND_FORMAT);
            } catch (DateTimeParseException ignored) {
                parsed = LocalDateTime.parse(text, SECOND_FORMAT);
            }
            return endBoundary ? parsed.plusSeconds(1) : parsed;
        } catch (DateTimeParseException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "时间格式不正确，请使用 YYYY-MM-DD 或 YYYY-MM-DD HH:mm:ss");
        }
    }

    static String cleanPreview(String value, long knowledgeId) {
        if (value == null || value.isBlank()) {
            return "未设置标题 · 知识 #" + knowledgeId;
        }
        String plain = value.replaceAll("<[^>]+>", " ")
                .replace("&nbsp;", " ")
                .replaceAll("\s+", " ")
                .trim();
        if (plain.isBlank()) {
            return "未设置标题 · 知识 #" + knowledgeId;
        }
        return plain.length() > 42 ? plain.substring(0, 42) + "…" : plain;
    }

    private static Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static long number(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private static double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static String formatDateTime(LocalDateTime value) {
        return value == null ? null : SECOND_FORMAT.format(value);
    }

    enum WorkMode {
        REVIEW,
        OWN,
        NONE
    }

    enum Granularity {
        DAY {
            @Override
            String bucketExpression(String column) {
                return "DATE_FORMAT(" + column + ", '%Y-%m-%d')";
            }

            @Override
            LocalDate firstBucket(LocalDate date) {
                return date;
            }

            @Override
            LocalDate nextBucket(LocalDate date) {
                return date.plusDays(1);
            }

            @Override
            String label(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("MM-dd"));
            }
        },
        WEEK {
            @Override
            String bucketExpression(String column) {
                return "DATE_FORMAT(DATE_SUB(DATE(" + column + "), INTERVAL WEEKDAY(" + column + ") DAY), '%Y-%m-%d')";
            }

            @Override
            LocalDate firstBucket(LocalDate date) {
                return date.with(TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
            }

            @Override
            LocalDate nextBucket(LocalDate date) {
                return date.plusWeeks(1);
            }

            @Override
            String label(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("MM-dd")) + " 周";
            }
        },
        MONTH {
            @Override
            String bucketExpression(String column) {
                return "DATE_FORMAT(" + column + ", '%Y-%m-01')";
            }

            @Override
            LocalDate firstBucket(LocalDate date) {
                return YearMonth.from(date).atDay(1);
            }

            @Override
            LocalDate nextBucket(LocalDate date) {
                return date.plusMonths(1);
            }

            @Override
            String label(LocalDate date) {
                return date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            }
        };

        abstract String bucketExpression(String column);

        abstract LocalDate firstBucket(LocalDate date);

        abstract LocalDate nextBucket(LocalDate date);

        abstract String label(LocalDate date);

        static Granularity resolve(String value, long days) {
            if (value != null && !value.isBlank()) {
                try {
                    return valueOf(value.trim().toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    throw new ApiException(HttpStatus.BAD_REQUEST.value(), "统计粒度仅支持 DAY、WEEK、MONTH");
                }
            }
            if (days <= 45) {
                return DAY;
            }
            return days <= 180 ? WEEK : MONTH;
        }
    }

    static record DashboardRange(
            LocalDateTime start,
            LocalDateTime endExclusive,
            LocalDateTime previousStart,
            Granularity granularity
    ) {
        List<LocalDate> bucketStarts() {
            List<LocalDate> result = new ArrayList<>();
            LocalDate cursor = granularity.firstBucket(start.toLocalDate());
            LocalDate lastDate = endExclusive.minusNanos(1).toLocalDate();
            while (!cursor.isAfter(lastDate)) {
                result.add(cursor);
                cursor = granularity.nextBucket(cursor);
            }
            return result;
        }
    }

    private record SceneOption(long id, String name, boolean disabled) {
        Map<String, Object> toMap() {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("sceneTemplateId", id);
            result.put("sceneName", name == null || name.isBlank() ? "未命名场景" : name);
            result.put("disabled", disabled);
            return result;
        }
    }
}
