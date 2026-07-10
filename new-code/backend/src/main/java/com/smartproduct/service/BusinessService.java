package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.DictDirectoryEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.KnowledgeChangeRequestEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.KnowledgeChangeRequestMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import com.smartproduct.infrastructure.config.UploadStorageProperties;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataValidation;
import org.apache.poi.ss.usermodel.DataValidationConstraint;
import org.apache.poi.ss.usermodel.DataValidationHelper;
import org.apache.poi.ss.usermodel.Name;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddressList;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class BusinessService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String FILE_PREFIX = "/data";
    private static final Pattern SCENE_ITEM_ID_PATTERN = Pattern.compile("\\((\\d+)\\)");
    private static final DateTimeFormatter SECOND_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Set<String> IMAGE_EXTENSIONS = Set.of(".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg");
    private static final Set<String> VIDEO_EXTENSIONS = Set.of(".mp4", ".webm", ".ogg", ".mov", ".m4v", ".avi", ".mkv");
    private static final Set<String> AUDIO_EXTENSIONS = Set.of(".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac");
    private static final Pattern RICH_TEXT_STYLE_ATTRIBUTE_PATTERN = Pattern.compile("(?is)\\sstyle\\s*=\\s*(\"([^\"]*)\"|'([^']*)')");
    private static final Set<String> RICH_TEXT_ALLOWED_STYLE_NAMES = Set.of(
            "color", "background-color", "font-size", "font-family", "font-weight", "font-style",
            "text-decoration", "text-align", "line-height", "padding", "padding-left", "padding-right",
            "margin", "margin-left", "margin-right", "border", "border-collapse", "width", "height"
    );
    private static final Safelist RICH_TEXT_SAFELIST = richTextSafelist();

    private final KnowledgeMapper knowledge;
    private final KnowledgeItemMapper knowledgeItems;
    private final SceneItemMapper sceneItems;
    private final DictDirectoryMapper dictDirectories;
    private final SceneTemplateMapper scenes;
    private final SceneService sceneService;
    private final DictService dictService;
    private final TokenService tokens;
    private final CurrentUserService currentUsers;
    private final KnowledgeChangeRequestMapper changeRequests;
    private final NotificationService notificationService;
    private final AccessLogService accessLogs;
    private final KnowledgeVersionService knowledgeVersions;
    private final Path fileRoot;
    private final UploadStorageProperties uploadStorage;

    public BusinessService(KnowledgeMapper knowledge, KnowledgeItemMapper knowledgeItems, SceneItemMapper sceneItems,
                           DictDirectoryMapper dictDirectories,
                           SceneTemplateMapper scenes, SceneService sceneService, DictService dictService, TokenService tokens,
                           CurrentUserService currentUsers, KnowledgeChangeRequestMapper changeRequests,
                           NotificationService notificationService, AccessLogService accessLogs,
                           KnowledgeVersionService knowledgeVersions,
                           UploadStorageProperties uploadStorage) {
        this.knowledge = knowledge;
        this.knowledgeItems = knowledgeItems;
        this.sceneItems = sceneItems;
        this.dictDirectories = dictDirectories;
        this.scenes = scenes;
        this.sceneService = sceneService;
        this.dictService = dictService;
        this.tokens = tokens;
        this.currentUsers = currentUsers;
        this.changeRequests = changeRequests;
        this.notificationService = notificationService;
        this.accessLogs = accessLogs;
        this.knowledgeVersions = knowledgeVersions;
        this.uploadStorage = uploadStorage;
        this.fileRoot = uploadStorage.root();
    }

    public Map<String, Object> businessDetail(Long sceneTemplateId) {
        requireSceneAccess(currentUsers.current(), sceneTemplateId);
        Map<String, Object> result = new LinkedHashMap<>();
        Map<String, Object> sceneDetail = sceneService.detail(sceneTemplateId);
        result.put("sceneDetail", sceneDetail);
        List<Map<String, Object>> dictDetails = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                        .eq("scene_template_id", sceneTemplateId)
                        .eq("type", "dict")
                        .eq("del", 0))
                .stream()
                .map(item -> dictService.detail(item.dictTemplateId))
                .toList();
        result.put("dictDetails", dictDetails);
        return result;
    }

    @Transactional
    public Map<String, Object> addKnowledge(Map<String, Object> request, String authorization) {
        CurrentUser user = currentUsers.current();
        Long sceneTemplateId = DictService.num(request.get("sceneTemplateId"));
        requireSceneAccess(user, sceneTemplateId);
        requireKnowledgeActionAccess(user, sceneTemplateId, PermissionCodes.KNOWLEDGE_CREATE);
        validateKnowledgePayload(request.get("knowledge"));
        if (user.requiresApproval(PermissionCodes.KNOWLEDGE_CREATE, sceneTemplateId)) {
            Map<String, Object> result = submitChange(KnowledgeChangeRequestStatus.CREATE, null, sceneTemplateId, request, null, user);
            accessLogs.success("知识库", "CREATE_REQUEST", "CHANGE_REQUEST", DictService.num(result.get("changeRequestId")),
                    sceneTemplateId, "提交新增知识审批");
            return result;
        }
        Map<String, Object> result = addKnowledgeDirect(request, user.userId(), user.account());
        accessLogs.success("知识库", "CREATE", "KNOWLEDGE", DictService.num(result.get("knowledgeId")),
                sceneTemplateId, "新增知识");
        return result;
    }

    @Transactional
    public Map<String, Object> addKnowledgeDirect(Map<String, Object> request, Long userId, String userAccount) {
        LocalDateTime now = LocalDateTime.now();
        KnowledgeEntity row = new KnowledgeEntity();
        row.sceneTemplateId = DictService.num(request.get("sceneTemplateId"));
        row.viewTime = 0L;
        row.creatorId = userId;
        row.creatorName = userAccount;
        row.createAt = now;
        row.updateAt = now;
        row.del = 0;
        knowledge.insert(row);
        saveKnowledgeItems(row.id, row.sceneTemplateId, request.get("knowledge"), true);
        scenes.update(new UpdateWrapper<SceneTemplateEntity>().eq("id", row.sceneTemplateId).set("is_used", true));
        knowledgeVersions.recordCreate(row.id, userId, userAccount);
        return Map.of("knowledgeId", row.id);
    }

    @Transactional
    public void editKnowledge(Map<String, Object> request) {
        Long id = DictService.num(request.get("knowledgeId"));
        KnowledgeEntity row = knowledge.selectById(id);
        CurrentUser user = currentUsers.current();
        requireKnowledge(row);
        requireSceneAccess(user, row.sceneTemplateId);
        requireKnowledgeActionAccess(user, row.sceneTemplateId, PermissionCodes.KNOWLEDGE_UPDATE);
        assertNoPendingChange(id);
        validateKnowledgePayload(request.get("knowledgeItem"));
        if (user.requiresApproval(PermissionCodes.KNOWLEDGE_UPDATE, row.sceneTemplateId)) {
            Map<String, Object> result = submitChange(KnowledgeChangeRequestStatus.UPDATE, id, row.sceneTemplateId, request, detail(id), user);
            accessLogs.success("知识库", "UPDATE_REQUEST", "KNOWLEDGE", id, row.sceneTemplateId, "提交修改知识审批");
            return;
        }
        editKnowledgeDirect(request, user.userId(), user.account());
        accessLogs.success("知识库", "UPDATE", "KNOWLEDGE", id, row.sceneTemplateId, "修改知识");
    }

    @Transactional
    public void editKnowledgeDirect(Map<String, Object> request) {
        CurrentUser user = currentUsers.current();
        editKnowledgeDirect(request, user.userId(), user.account());
    }

    @Transactional
    public void editKnowledgeDirect(Map<String, Object> request, Long operatorId, String operatorName) {
        Long id = DictService.num(request.get("knowledgeId"));
        KnowledgeEntity row = knowledge.selectById(id);
        Map<String, Object> before = knowledgeVersions.snapshot(id);
        knowledge.update(new UpdateWrapper<KnowledgeEntity>().eq("id", id).set("update_at", LocalDateTime.now()));
        saveKnowledgeItems(id, row == null ? null : row.sceneTemplateId, request.get("knowledgeItem"), false);
        knowledgeVersions.recordUpdate(id, operatorId, operatorName, before);
    }

    @Transactional
    public void deleteKnowledge(Long knowledgeId) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        CurrentUser user = currentUsers.current();
        requireKnowledge(row);
        requireSceneAccess(user, row.sceneTemplateId);
        requireKnowledgeActionAccess(user, row.sceneTemplateId, PermissionCodes.KNOWLEDGE_DELETE);
        assertNoPendingChange(knowledgeId);
        if (user.requiresApproval(PermissionCodes.KNOWLEDGE_DELETE, row.sceneTemplateId)) {
            Map<String, Object> result = submitChange(KnowledgeChangeRequestStatus.DELETE, knowledgeId, row.sceneTemplateId,
                    Map.of("knowledgeId", knowledgeId), detail(knowledgeId), user);
            accessLogs.success("知识库", "DELETE_REQUEST", "KNOWLEDGE", knowledgeId, row.sceneTemplateId, "提交删除知识审批");
            return;
        }
        deleteKnowledgeDirect(knowledgeId, user.userId(), user.account());
        accessLogs.success("知识库", "DELETE", "KNOWLEDGE", knowledgeId, row.sceneTemplateId, "删除知识");
    }

    @Transactional
    public void deleteKnowledgeDirect(Long knowledgeId) {
        CurrentUser user = currentUsers.current();
        deleteKnowledgeDirect(knowledgeId, user.userId(), user.account());
    }

    @Transactional
    public void deleteKnowledgeDirect(Long knowledgeId, Long operatorId, String operatorName) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        Map<String, Object> before = knowledgeVersions.snapshot(knowledgeId);
        knowledgeVersions.recordDelete(knowledgeId, operatorId, operatorName, before);
        knowledge.deleteById(knowledgeId);
        knowledgeItems.delete(new QueryWrapper<KnowledgeItemEntity>().eq("knowledge_id", knowledgeId));
        if (row != null) {
            Long count = knowledge.selectCount(new QueryWrapper<KnowledgeEntity>()
                    .eq("scene_template_id", row.sceneTemplateId)
                    .eq("del", 0));
            if (count == 0) {
                scenes.update(new UpdateWrapper<SceneTemplateEntity>().eq("id", row.sceneTemplateId).set("is_used", false));
            }
        }
    }

    public void setting(Map<String, Object> request) {
        Long knowledgeId = DictService.num(request.get("knowledgeId"));
        Number delta = request.get("viewTime") instanceof Number n ? n : 0;
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        long next = Math.max(0, (row.viewTime == null ? 0 : row.viewTime) + delta.longValue());
        knowledge.update(new UpdateWrapper<KnowledgeEntity>()
                .eq("id", knowledgeId)
                .set("view_time", next));
    }

    public Map<String, Object> detail(Long knowledgeId) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        requireKnowledge(row);
        requireSceneAccess(currentUsers.current(), row.sceneTemplateId);
        if (row != null) {
            long next = (row.viewTime == null ? 0 : row.viewTime) + 1;
            knowledge.update(new UpdateWrapper<KnowledgeEntity>()
                    .eq("id", knowledgeId)
                    .set("view_time", next)
                    .set("view_at", LocalDateTime.now()));
        }
        List<KnowledgeItemEntity> values = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>().eq("knowledge_id", knowledgeId));
        return detailDto(row, values);
    }

    public Map<String, Object> knowledgeLogs(Long knowledgeId, String action, int pageNumber, int pageSize, String order) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        CurrentUser user = currentUsers.current();
        requireKnowledge(row);
        requireSceneAccess(user, row.sceneTemplateId);
        Long visibleUserId = user.hasScenePermission(PermissionCodes.KNOWLEDGE_LOG_VIEW_ALL, row.sceneTemplateId)
                ? null
                : user.userId();
        return accessLogs.knowledgeLogs(knowledgeId, visibleUserId, action, pageNumber, pageSize, order);
    }

    public Map<String, Object> knowledgeVersions(Long knowledgeId, int pageNumber, int pageSize) {
        return knowledgeVersions.list(knowledgeId, pageNumber, pageSize);
    }

    public Map<String, Object> knowledgeVersionDetail(Long versionId) {
        return knowledgeVersions.detail(versionId);
    }

    public Map<String, Object> sceneKnowledgeLogs(Long sceneTemplateId, String action, int pageNumber, int pageSize, String order) {
        CurrentUser user = currentUsers.current();
        requireSceneAccess(user, sceneTemplateId);
        Long visibleUserId = user.hasScenePermission(PermissionCodes.KNOWLEDGE_LOG_VIEW_ALL, sceneTemplateId)
                ? null
                : user.userId();
        return accessLogs.sceneKnowledgeLogs(sceneTemplateId, visibleUserId, action, pageNumber, pageSize, order);
    }

    public Map<String, Object> list(Map<String, Object> request) {
        Long sceneTemplateId = DictService.num(request.get("sceneTemplateId"));
        requireSceneAccess(currentUsers.current(), sceneTemplateId);
        QueryWrapper<KnowledgeEntity> query = new QueryWrapper<KnowledgeEntity>()
                .eq("del", 0)
                .eq("scene_template_id", sceneTemplateId);
        if (request.get("searchCreatorId") != null && !DictService.str(request.get("searchCreatorId")).isBlank()) {
            query.eq("creator_id", DictService.num(request.get("searchCreatorId")));
        }
        applyTimeRange(query, "update_at", request.get("searchUpdateTime"));
        applyTimeRange(query, "create_at", request.get("searchCreateTime"));
        List<Long> matchedKnowledgeIds = matchedKnowledgeIds(request.get("searchKnowledgeItem"));
        List<Long> keywordKnowledgeIds = keywordMatchedKnowledgeIds(sceneTemplateId, request.get("keyword"), request.get("searchSceneItemIds"));
        if (matchedKnowledgeIds != null && keywordKnowledgeIds != null) {
            Set<Long> intersection = new HashSet<>(matchedKnowledgeIds);
            intersection.retainAll(keywordKnowledgeIds);
            matchedKnowledgeIds = new ArrayList<>(intersection);
        } else if (keywordKnowledgeIds != null) {
            matchedKnowledgeIds = keywordKnowledgeIds;
        }
        if (matchedKnowledgeIds != null) {
            if (matchedKnowledgeIds.isEmpty()) {
                query.eq("id", -1);
            } else {
                query.in("id", matchedKnowledgeIds);
            }
        }
        String sort = safeColumn(DictService.str(request.get("sort")));
        String order = DictService.str(request.get("order"));
        if (!sort.isBlank() && !order.isBlank()) {
            query.orderBy(true, "asc".equalsIgnoreCase(order), sort);
        } else {
            query.orderByAsc("id");
        }
        int pageNumber = request.get("pageNumber") instanceof Number n ? n.intValue() : 1;
        int pageSize = request.get("pageSize") instanceof Number n ? n.intValue() : 10;
        Page<KnowledgeEntity> page = knowledge.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        List<Map<String, Object>> content = page.getRecords().stream()
                .map(row -> detailDto(row, knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>().eq("knowledge_id", row.id))))
                .toList();
        return Map.of("content", content, "totalElements", page.getTotal());
    }

    private Map<String, Object> submitChange(String requestType, Long knowledgeId, Long sceneTemplateId,
                                             Map<String, Object> payload, Object before, CurrentUser user) {
        try {
            LocalDateTime now = LocalDateTime.now();
            KnowledgeChangeRequestEntity row = new KnowledgeChangeRequestEntity();
            row.requestType = requestType;
            row.status = KnowledgeChangeRequestStatus.PENDING;
            row.knowledgeId = knowledgeId;
            row.sceneTemplateId = sceneTemplateId;
            row.payloadJson = JSON.writeValueAsString(payload == null ? Map.of() : payload);
            row.beforeJson = before == null ? null : JSON.writeValueAsString(before);
            row.applicantId = user.userId();
            row.applicantName = user.account();
            row.createAt = now;
            row.updateAt = now;
            row.del = 0;
            changeRequests.insert(row);
            notificationService.createApprovalPending(approvalPendingNotice(row, user));
            return Map.of("changeRequestId", row.id, "status", row.status);
        } catch (Exception ex) {
            throw new IllegalStateException("保存知识审批申请失败", ex);
        }
    }

    private NotificationService.ApprovalPendingNotice approvalPendingNotice(KnowledgeChangeRequestEntity row, CurrentUser user) {
        NotificationService.ApprovalPendingNotice notice = new NotificationService.ApprovalPendingNotice();
        notice.changeRequestId = row.id;
        notice.requestType = row.requestType;
        notice.sceneTemplateId = row.sceneTemplateId;
        notice.applicantId = user.userId();
        notice.applicantName = user.account();
        return notice;
    }

    private void assertNoPendingChange(Long knowledgeId) {
        Long count = changeRequests.selectCount(new QueryWrapper<KnowledgeChangeRequestEntity>()
                .eq("knowledge_id", knowledgeId)
                .eq("status", KnowledgeChangeRequestStatus.PENDING)
                .eq("del", 0)
                .in("request_type", List.of(KnowledgeChangeRequestStatus.UPDATE, KnowledgeChangeRequestStatus.DELETE)));
        if (count != null && count > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "该知识已有待审批变更，暂不能再次提交修改或删除");
        }
    }

    private static void requireKnowledge(KnowledgeEntity row) {
        if (row == null || row.del != null && row.del != 0) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "知识不存在");
        }
    }

    private static void requireSceneAccess(CurrentUser user, Long sceneTemplateId) {
        if (!user.canAccessScene(sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有该场景的数据权限");
        }
    }

    private static void requireKnowledgeActionAccess(CurrentUser user, Long sceneTemplateId, String permission) {
        if (!user.hasScenePermission(permission, sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有该场景的操作权限");
        }
    }

    public Map<String, Object> templateExport(Long sceneTemplateId, boolean includeDirectory) {
        requireSceneAccess(currentUsers.current(), sceneTemplateId);
        SceneTemplateEntity scene = scenes.selectById(sceneTemplateId);
        boolean effectiveIncludeDirectory = includeDirectory || hasRequiredDirectoryItem(sceneTemplateId);
        List<SceneItemEntity> headers = exportableTemplateHeaders(sceneTemplateId, effectiveIncludeDirectory);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            Map<Long, String> dictOptionRanges = effectiveIncludeDirectory ? createDirectoryOptionSheet(workbook, headers) : Map.of();
            Row headerRow = sheet.createRow(0);
            Row exampleRow = sheet.createRow(1);
            for (int i = 0; i < headers.size(); i++) {
                SceneItemEntity header = headers.get(i);
                headerRow.createCell(i).setCellValue(header.name + "(" + header.id + ")");
                setCellValue(exampleRow.createCell(i), templateExampleValue(header, dictOptionRanges.containsKey(header.id)));
                sheet.setColumnWidth(i, columnWidth(header.name));
                if ("dict".equals(header.type)) {
                    applyDirectoryValidation(sheet, i, dictOptionRanges.get(header.id));
                }
            }
            String suffix = effectiveIncludeDirectory ? "_带目录知识导入模版示例.xlsx" : "_知识导入模版示例.xlsx";
            return Map.of("filePath", writeWorkbook(workbook, (scene == null ? "business" : scene.name) + suffix));
        } catch (IOException ex) {
            throw new IllegalStateException("导出知识模板失败", ex);
        }
    }

    public Map<String, Object> dataExport(Long sceneTemplateId) {
        requireSceneAccess(currentUsers.current(), sceneTemplateId);
        SceneTemplateEntity scene = scenes.selectById(sceneTemplateId);
        List<SceneItemEntity> headers = visibleSceneItems(sceneTemplateId);
        List<KnowledgeEntity> rows = knowledge.selectList(new QueryWrapper<KnowledgeEntity>()
                .eq("scene_template_id", sceneTemplateId)
                .eq("del", 0)
                .orderByDesc("update_at")
                .orderByDesc("id"));
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.size(); i++) {
                SceneItemEntity header = headers.get(i);
                headerRow.createCell(i).setCellValue(header.name + "(" + header.id + ")");
            }
            for (int rowIndex = 0; rowIndex < rows.size(); rowIndex++) {
                KnowledgeEntity one = rows.get(rowIndex);
                Row excelRow = sheet.createRow(rowIndex + 1);
                Map<Long, KnowledgeItemEntity> valueMap = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>().eq("knowledge_id", one.id))
                        .stream()
                        .collect(Collectors.toMap(item -> item.sceneItemId, item -> item, (a, b) -> a));
                for (int col = 0; col < headers.size(); col++) {
                    SceneItemEntity header = headers.get(col);
                    KnowledgeItemEntity item = valueMap.get(header.id);
                    String value = "";
                    if (item != null) {
                        value = "dict".equals(header.type) ? nullToEmpty(item.selectDictTreeIds) : nullToEmpty(item.sceneItemValue);
                    }
                    excelRow.createCell(col).setCellValue(value);
                }
            }
            return Map.of("filePath", writeWorkbook(workbook, (scene == null ? "business" : scene.name) + "_知识导出.xlsx"));
        } catch (IOException ex) {
            throw new IllegalStateException("导出知识数据失败", ex);
        }
    }

    @Transactional
    public Map<String, Object> dataImport(Map<String, Object> request, String authorization) {
        Long sceneTemplateId = DictService.num(request.get("sceneTemplateId"));
        requireSceneAccess(currentUsers.current(), sceneTemplateId);
        Path source = toLocalFile(DictService.str(request.get("filePath")));
        int totalRows = 0;
        int importedRows = 0;
        int pendingRows = 0;
        int skippedRows = 0;
        List<String> warnings = new ArrayList<>();
        List<Map<String, Object>> failedRows = new ArrayList<>();
        try (InputStream input = Files.newInputStream(source); Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheet("Sheet1");
            if (sheet == null) {
                sheet = workbook.getNumberOfSheets() > 0 ? workbook.getSheetAt(0) : null;
                if (sheet == null) {
                    throw new ApiException(HttpStatus.BAD_REQUEST.value(), "导入文件中没有可读取的工作表");
                }
                warnings.add("未找到名为 Sheet1 的工作表，已读取第一个工作表：" + sheet.getSheetName());
            }
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "导入文件第一行必须是模板表头");
            }
            List<Long> sceneItemIds = new ArrayList<>();
            for (int col = 0; col < headerRow.getLastCellNum(); col++) {
                Matcher matcher = SCENE_ITEM_ID_PATTERN.matcher(cellString(headerRow.getCell(col)));
                sceneItemIds.add(matcher.find() ? Long.parseLong(matcher.group(1)) : null);
            }
            if (sceneItemIds.stream().noneMatch(Objects::nonNull)) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "未识别到模板表头，请先下载当前场景的导入模板后再填写");
            }
            Map<Long, SceneItemEntity> itemMap = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                            .eq("scene_template_id", sceneTemplateId)
                            .eq("del", 0))
                    .stream()
                    .collect(Collectors.toMap(item -> item.id, item -> item, (a, b) -> a));
            int unknownHeaderCount = (int) sceneItemIds.stream()
                    .filter(Objects::nonNull)
                    .filter(id -> !itemMap.containsKey(id))
                    .count();
            if (unknownHeaderCount > 0) {
                warnings.add("有 " + unknownHeaderCount + " 个表头字段不属于当前场景，已忽略对应列");
            }
            Map<Long, Map<String, List<DictDirectoryEntity>>> directoryIndexes = directoryPathIndexes(itemMap.values());
            Map<Integer, SceneItemEntity> requiredColumns = new LinkedHashMap<>();
            for (int col = 0; col < sceneItemIds.size(); col++) {
                SceneItemEntity sceneItem = itemMap.get(sceneItemIds.get(col));
                if (sceneItem != null && Boolean.TRUE.equals(sceneItem.isRequired) && !Boolean.TRUE.equals(sceneItem.isHide)) {
                    requiredColumns.put(col, sceneItem);
                }
            }
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row excelRow = sheet.getRow(rowIndex);
                if (excelRow == null || isBlankRow(excelRow, sceneItemIds.size())) {
                    skippedRows++;
                    continue;
                }
                totalRows++;
                List<Map.Entry<Integer, SceneItemEntity>> missingRequired = requiredColumns.entrySet().stream()
                        .filter(entry -> cellString(excelRow.getCell(entry.getKey())).isBlank())
                        .toList();
                if (!missingRequired.isEmpty()) {
                    skippedRows++;
                    for (Map.Entry<Integer, SceneItemEntity> entry : missingRequired) {
                        appendImportFailure(warnings, failedRows, rowIndex + 1, entry.getValue().name, "", "缺少必填字段");
                    }
                    continue;
                }
                List<Map<String, Object>> items = new ArrayList<>();
                boolean rowFailed = false;
                for (int col = 0; col < sceneItemIds.size(); col++) {
                    Long sceneItemId = sceneItemIds.get(col);
                    if (sceneItemId == null) {
                        continue;
                    }
                    SceneItemEntity sceneItem = itemMap.get(sceneItemId);
                    if (sceneItem == null) {
                        continue;
                    }
                    String value = cellString(excelRow.getCell(col));
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("sceneItemId", sceneItemId);
                    if ("dict".equals(sceneItem.type)) {
                        DirectoryImportValue directoryValue = resolveDirectoryImportValue(sceneItem, value, directoryIndexes.get(sceneItem.id));
                        if (!directoryValue.success()) {
                            appendImportFailure(warnings, failedRows, rowIndex + 1, sceneItem.name, value, directoryValue.reason());
                            rowFailed = true;
                            continue;
                        }
                        item.put("sceneItemValue", List.of());
                        item.put("sceneItemSelectDictTreeIds", directoryValue.jsonValue());
                    } else if ("text".equals(sceneItem.type) || "richtext".equals(sceneItem.type)) {
                        item.put("sceneItemValue", value.isEmpty() ? List.of() : List.of(value));
                    } else if ("tag".equals(sceneItem.type)) {
                        item.put("sceneItemValue", splitTagValue(value));
                    } else {
                        item.put("sceneItemValue", splitValue(value));
                    }
                    items.add(item);
                }
                if (rowFailed) {
                    skippedRows++;
                    continue;
                }
                if (!items.isEmpty()) {
                    Map<String, Object> add = new LinkedHashMap<>();
                    add.put("sceneTemplateId", sceneTemplateId);
                    add.put("knowledge", items);
                    try {
                        Map<String, Object> added = addKnowledge(add, authorization);
                        if (added.containsKey("changeRequestId")) {
                            pendingRows++;
                        } else {
                            importedRows++;
                        }
                    } catch (ApiException ex) {
                        skippedRows++;
                        appendImportFailure(warnings, failedRows, rowIndex + 1, "整行", "", ex.getMessage());
                    }
                } else {
                    skippedRows++;
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("导入知识数据失败", ex);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalRows", totalRows);
        result.put("importedRows", importedRows);
        result.put("pendingRows", pendingRows);
        result.put("skippedRows", skippedRows);
        result.put("warnings", warnings);
        result.put("failedRows", failedRows);
        result.put("message", importMessageReadable(importedRows, pendingRows, skippedRows));
        notificationService.createImportResult(importResultNotice(sceneTemplateId, totalRows, importedRows, pendingRows, skippedRows, warnings));
        return result;
    }

    private NotificationService.ImportResultNotice importResultNotice(Long sceneTemplateId, int totalRows,
                                                                      int importedRows, int pendingRows, int skippedRows,
                                                                      List<String> warnings) {
        CurrentUser user = currentUsers.current();
        SceneTemplateEntity scene = sceneTemplateId == null ? null : scenes.selectById(sceneTemplateId);
        NotificationService.ImportResultNotice notice = new NotificationService.ImportResultNotice();
        notice.sceneTemplateId = sceneTemplateId;
        notice.sceneName = scene == null ? "" : scene.name;
        notice.recipientId = user.userId();
        notice.senderId = user.userId();
        notice.senderName = user.account();
        notice.totalRows = totalRows;
        notice.importedRows = importedRows;
        notice.pendingRows = pendingRows;
        notice.skippedRows = skippedRows;
        notice.warnings = List.copyOf(warnings);
        return notice;
    }

    public Map<String, Object> statisticsKnowledge(List<String> searchCreateTime) {
        CurrentUser user = currentUsers.current();
        List<SceneTemplateEntity> sceneList = scenes.selectList(new QueryWrapper<SceneTemplateEntity>().eq("del", 0));
        List<Map<String, Object>> content = sceneList.stream().filter(scene -> user.canAccessScene(scene.id)).map(scene -> {
            QueryWrapper<KnowledgeEntity> query = new QueryWrapper<KnowledgeEntity>().eq("scene_template_id", scene.id).eq("del", 0);
            applyStatisticsRange(query, searchCreateTime);
            Long count = knowledge.selectCount(query);
            QueryWrapper<KnowledgeEntity> listQuery = new QueryWrapper<KnowledgeEntity>().eq("scene_template_id", scene.id).eq("del", 0);
            applyStatisticsRange(listQuery, searchCreateTime);
            List<KnowledgeEntity> rows = knowledge.selectList(listQuery);
            long views = rows.stream().mapToLong(row -> row.viewTime == null ? 0 : row.viewTime).sum();
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("sceneName", scene.name);
            dto.put("knowledgeNum", count);
            dto.put("knowledgeViewTimeCount", views);
            return dto;
        }).toList();
        return Map.of("content", content, "totalElements", content.size());
    }

    public Map<String, Object> statisticsCreator(Long sceneTemplateId, List<String> searchCreateTime) {
        CurrentUser user = currentUsers.current();
        boolean allScenes = sceneTemplateId == null || sceneTemplateId == 0;
        if (!allScenes) {
            requireSceneAccess(user, sceneTemplateId);
        }
        QueryWrapper<KnowledgeEntity> query = new QueryWrapper<KnowledgeEntity>().eq("del", 0);
        if (allScenes) {
            if (!user.admin()) {
                if (user.sceneTemplateIds().isEmpty()) {
                    query.eq("scene_template_id", -1);
                } else {
                    query.in("scene_template_id", user.sceneTemplateIds());
                }
            }
        } else {
            query.eq("scene_template_id", sceneTemplateId);
        }
        applyStatisticsRange(query, searchCreateTime);
        List<KnowledgeEntity> rows = knowledge.selectList(query);
        Map<String, Long> grouped = rows.stream().collect(java.util.stream.Collectors.groupingBy(row -> row.creatorName == null ? "" : row.creatorName, java.util.stream.Collectors.counting()));
        List<Map<String, Object>> content = grouped.entrySet().stream().map(entry -> {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("creatorName", entry.getKey());
            dto.put("knowledgeNum", entry.getValue());
            return dto;
        }).toList();
        return Map.of("content", content, "totalElements", content.size());
    }

    private void saveKnowledgeItems(Long knowledgeId, Long sceneTemplateId, Object value, boolean fillMissing) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        Set<Long> touched = new HashSet<>();
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map)) {
                continue;
            }
            if (map.get("sceneItemId") == null) {
                continue;
            }
            Long sceneItemId = DictService.num(map.get("sceneItemId"));
            if (sceneItemId == null) {
                continue;
            }
            SceneItemEntity sceneItem = sceneItems.selectById(sceneItemId);
            Object sceneItemValue = normalizeSceneItemValue(sceneItem, map.get("sceneItemValue"));
            validateMediaFiles(sceneItem, sceneItemValue);
            Object dictIds = map.get("sceneItemSelectDictTreeIds");
            if (dictIds == null) {
                dictIds = map.get("sceneItemSelectDictIds");
            }
            validateDictSelection(sceneItem, dictIds);
            KnowledgeItemEntity item = knowledgeItems.selectOne(new QueryWrapper<KnowledgeItemEntity>()
                    .eq("knowledge_id", knowledgeId)
                    .eq("scene_item_id", sceneItemId)
                    .last("limit 1"));
            if (item == null) {
                item = new KnowledgeItemEntity();
            }
            item.knowledgeId = knowledgeId;
            item.sceneItemId = sceneItemId;
            item.sceneItemValue = joinValue(sceneItemValue);
            item.selectDictTreeIds = normalizeDictIds(sceneItem, dictIds);
            if (item.id == null) {
                knowledgeItems.insert(item);
            } else {
                knowledgeItems.updateById(item);
            }
            touched.add(sceneItemId);
        }
        if (fillMissing && sceneTemplateId != null) {
            List<SceneItemEntity> allItems = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                    .eq("scene_template_id", sceneTemplateId)
                    .eq("del", 0));
            for (SceneItemEntity sceneItem : allItems) {
                if (touched.contains(sceneItem.id)) {
                    continue;
                }
                KnowledgeItemEntity item = new KnowledgeItemEntity();
                item.knowledgeId = knowledgeId;
                item.sceneItemId = sceneItem.id;
                item.sceneItemValue = "";
                item.selectDictTreeIds = "";
                knowledgeItems.insert(item);
            }
        }
    }

    private static void validateMediaFiles(SceneItemEntity sceneItem, Object value) {
        if (sceneItem == null || sceneItem.type == null) {
            return;
        }
        Set<String> extensions = switch (sceneItem.type) {
            case "picture" -> IMAGE_EXTENSIONS;
            case "video" -> VIDEO_EXTENSIONS;
            case "audio" -> AUDIO_EXTENSIONS;
            default -> Set.of();
        };
        if (extensions.isEmpty()) {
            return;
        }
        List<?> files = value instanceof List<?> list ? list : List.of(value);
        for (Object file : files) {
            String filename = DictService.str(file).split("\\?")[0].toLowerCase();
            if (filename.isBlank()) {
                continue;
            }
            boolean allowed = extensions.stream().anyMatch(filename::endsWith);
            if (!allowed) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), sceneItem.name + "上传的文件类型不正确");
            }
        }
    }

    private void validateKnowledgePayload(Object value) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map) || map.get("sceneItemId") == null) {
                continue;
            }
            SceneItemEntity sceneItem = sceneItems.selectById(DictService.num(map.get("sceneItemId")));
            validateMediaFiles(sceneItem, normalizeSceneItemValue(sceneItem, map.get("sceneItemValue")));
            Object dictIds = map.get("sceneItemSelectDictTreeIds");
            if (dictIds == null) {
                dictIds = map.get("sceneItemSelectDictIds");
            }
            validateDictSelection(sceneItem, dictIds);
        }
    }

    private void validateDictSelection(SceneItemEntity sceneItem, Object value) {
        if (sceneItem == null || !"dict".equals(sceneItem.type)) {
            return;
        }
        for (Long id : dictIdValues(value)) {
            DictDirectoryEntity directory = dictDirectories.selectById(id);
            if (directory == null || directory.del == null || directory.del != 0
                    || !Objects.equals(directory.dictTemplateId, sceneItem.dictTemplateId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), sceneItem.name + "包含无效的目录项");
            }
            if (Boolean.TRUE.equals(directory.isDisabled)) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), sceneItem.name + "不能选择已禁用的目录项：" + directory.name);
            }
        }
    }

    private static List<Long> dictIdValues(Object value) {
        if (value == null) {
            return List.of();
        }
        if (value instanceof List<?> list) {
            return list.stream().flatMap(item -> dictIdValues(item).stream()).toList();
        }
        if (value instanceof Number number) {
            return List.of(number.longValue());
        }
        String text = DictService.str(value);
        if (text.isBlank()) {
            return List.of();
        }
        if (text.matches("\\d+")) {
            return List.of(Long.parseLong(text));
        }
        try {
            Object parsed = JSON.readValue(text, new TypeReference<>() {
            });
            if (parsed instanceof List<?> list) {
                return list.stream().flatMap(item -> dictIdValues(item).stream()).toList();
            }
            return dictIdValues(parsed);
        } catch (Exception ignored) {
            return splitValue(text).stream()
                    .map(DictService::num)
                    .filter(Objects::nonNull)
                    .toList();
        }
    }

    private static Object normalizeSceneItemValue(SceneItemEntity sceneItem, Object value) {
        if (sceneItem == null || sceneItem.type == null) {
            return value;
        }
        if ("tag".equals(sceneItem.type)) {
            return normalizeTagValue(value);
        }
        if ("richtext".equals(sceneItem.type)) {
            return normalizeRichTextValue(value);
        }
        return value;
    }

    private static List<String> normalizeTagValue(Object value) {
        if (value == null) {
            return List.of();
        }
        List<?> values = value instanceof List<?> list ? list : List.of(value);
        return values.stream()
                .flatMap(item -> splitTagValue(DictService.str(item)).stream())
                .distinct()
                .toList();
    }

    private static List<String> normalizeRichTextValue(Object value) {
        if (value == null) {
            return List.of();
        }
        List<?> values = value instanceof List<?> list ? list : List.of(value);
        String raw = values.stream()
                .map(DictService::str)
                .collect(Collectors.joining());
        String sanitized = sanitizeRichText(raw).trim();
        return sanitized.isBlank() ? List.of() : List.of(sanitized);
    }

    private static String sanitizeRichText(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        Document.OutputSettings outputSettings = new Document.OutputSettings().prettyPrint(false);
        String cleaned = Jsoup.clean(value, "https://smart-product.local", RICH_TEXT_SAFELIST, outputSettings);
        return sanitizeRichTextStyles(cleaned);
    }

    private static Safelist richTextSafelist() {
        return new Safelist()
                .addTags(
                        "p", "br", "strong", "b", "u", "em", "i", "s", "span", "blockquote",
                        "pre", "code", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li",
                        "table", "thead", "tbody", "tfoot", "tr", "th", "td", "img", "a", "hr",
                        "video", "source"
                )
                .addAttributes(":all", "class", "style")
                .addAttributes("a", "href", "title", "target", "rel")
                .addAttributes("img", "src", "alt", "title", "width", "height")
                .addAttributes("video", "src", "poster", "controls", "width", "height")
                .addAttributes("source", "src", "type")
                .addProtocols("a", "href", "http", "https", "mailto", "tel")
                .addProtocols("img", "src", "http", "https", "data")
                .addProtocols("video", "src", "http", "https")
                .addProtocols("video", "poster", "http", "https", "data")
                .addProtocols("source", "src", "http", "https")
                .preserveRelativeLinks(true);
    }

    private static String sanitizeRichTextStyles(String html) {
        Matcher matcher = RICH_TEXT_STYLE_ATTRIBUTE_PATTERN.matcher(html);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            String style = firstNonNull(matcher.group(2), matcher.group(3));
            String safeStyle = sanitizeRichTextStyleValue(style);
            String replacement = safeStyle.isBlank() ? "" : " style=\"" + safeStyle + "\"";
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String sanitizeRichTextStyleValue(String style) {
        if (style == null || style.isBlank()) {
            return "";
        }
        return List.of(style.split(";")).stream()
                .map(String::trim)
                .filter(item -> item.contains(":"))
                .map(item -> {
                    String[] parts = item.split(":", 2);
                    String name = parts[0].trim().toLowerCase();
                    String value = parts[1].trim();
                    return isSafeRichTextStyle(name, value) ? name + ":" + value : "";
                })
                .filter(item -> !item.isBlank())
                .collect(Collectors.joining(";"));
    }

    private static boolean isSafeRichTextStyle(String name, String value) {
        if (!RICH_TEXT_ALLOWED_STYLE_NAMES.contains(name) || value.isBlank()) {
            return false;
        }
        String lower = value.toLowerCase();
        return !lower.contains("javascript:")
                && !lower.contains("expression(")
                && !lower.contains("url(")
                && !lower.contains("@import")
                && !lower.contains("behavior:")
                && !lower.contains("<")
                && !lower.contains(">");
    }

    private static String firstNonNull(String... values) {
        for (String value : values) {
            if (value != null) {
                return value;
            }
        }
        return "";
    }

    private Map<String, Object> detailDto(KnowledgeEntity row, List<KnowledgeItemEntity> values) {
        if (row == null) {
            return Map.of();
        }
        Map<Long, SceneItemEntity> itemMap = visibleSceneItems(row.sceneTemplateId)
                .stream().collect(java.util.stream.Collectors.toMap(item -> item.id, item -> item, (a, b) -> a));
        List<Map<String, Object>> show = values.stream()
                .filter(value -> itemMap.containsKey(value.sceneItemId))
                .map(value -> {
            SceneItemEntity sceneItem = itemMap.get(value.sceneItemId);
            String type = sceneItem == null ? "" : sceneItem.type;
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("sceneItemId", value.sceneItemId);
            dto.put("sceneItemType", type);
            dto.put("sceneItemValue", switch (type) {
                case "text", "richtext" -> textValue(value.sceneItemValue);
                case "tag" -> splitTagValue(value.sceneItemValue);
                default -> splitValue(value.sceneItemValue);
            });
            dto.put("sceneItemSelectDictTreeIds", normalizeDictIds(sceneItem, value.selectDictTreeIds));
            dto.put("sceneItemName", sceneItem == null ? "" : sceneItem.name);
            return dto;
        }).toList();
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("knowledgeShow", show);
        for (Map<String, Object> item : show) {
            dto.put(String.valueOf(item.get("sceneItemId")), item);
        }
        dto.put("knowledgeId", row.id);
        dto.put("sceneTemplateId", row.sceneTemplateId);
        dto.put("creatorName", row.creatorName);
        dto.put("viewTime", row.viewTime);
        dto.put("updateTime", epoch(row.updateAt));
        dto.put("createTime", epoch(row.createAt));
        pendingChange(row.id).forEach(dto::put);
        return dto;
    }

    private Map<String, Object> pendingChange(Long knowledgeId) {
        if (knowledgeId == null) {
            return Map.of("hasPendingChange", false);
        }
        KnowledgeChangeRequestEntity pending = changeRequests.selectOne(new QueryWrapper<KnowledgeChangeRequestEntity>()
                .eq("knowledge_id", knowledgeId)
                .eq("status", KnowledgeChangeRequestStatus.PENDING)
                .eq("del", 0)
                .in("request_type", List.of(KnowledgeChangeRequestStatus.UPDATE, KnowledgeChangeRequestStatus.DELETE))
                .last("limit 1"));
        if (pending == null) {
            return Map.of("hasPendingChange", false);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("hasPendingChange", true);
        result.put("pendingChangeRequestId", pending.id);
        result.put("pendingChangeType", pending.requestType);
        return result;
    }

    private record DirectoryImportValue(boolean success, String jsonValue, String reason) {
        static DirectoryImportValue ok(Long id) {
            return new DirectoryImportValue(true, id == null ? "" : "[" + id + "]", "");
        }

        static DirectoryImportValue fail(String reason) {
            return new DirectoryImportValue(false, "", reason);
        }
    }

    private List<SceneItemEntity> visibleSceneItems(Long sceneTemplateId) {
        return sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                .eq("scene_template_id", sceneTemplateId)
                .eq("del", 0)
                .orderByAsc("sort_number")
                .orderByAsc("id"))
                .stream()
                .filter(item -> !Boolean.TRUE.equals(item.isHide))
                .toList();
    }

    private boolean hasRequiredDirectoryItem(Long sceneTemplateId) {
        return visibleSceneItems(sceneTemplateId).stream()
                .anyMatch(item -> "dict".equals(item.type) && Boolean.TRUE.equals(item.isRequired));
    }

    private List<SceneItemEntity> exportableTemplateHeaders(Long sceneTemplateId, boolean includeDirectory) {
        return visibleSceneItems(sceneTemplateId).stream()
                .filter(item -> includeDirectory || !"dict".equals(item.type))
                .filter(item -> List.of("text", "integer", "decimal", "datetime", "tag", "richtext").contains(item.type)
                        || includeDirectory && "dict".equals(item.type))
                .filter(item -> !"dict".equals(item.type) || item.dictTemplateId != null)
                .toList();
    }

    private Map<Long, String> createDirectoryOptionSheet(Workbook workbook, List<SceneItemEntity> headers) {
        List<SceneItemEntity> dictHeaders = headers.stream()
                .filter(item -> "dict".equals(item.type))
                .toList();
        if (dictHeaders.isEmpty()) {
            return Map.of();
        }

        Sheet optionSheet = workbook.createSheet("目录选项");
        Map<Long, String> namedRanges = new LinkedHashMap<>();
        int optionColumn = 0;
        for (SceneItemEntity header : dictHeaders) {
            List<String> paths = directoryPaths(header.dictTemplateId);
            Row titleRow = getOrCreateRow(optionSheet, 0);
            titleRow.createCell(optionColumn).setCellValue(header.name);
            for (int index = 0; index < paths.size(); index++) {
                getOrCreateRow(optionSheet, index + 1).createCell(optionColumn).setCellValue(paths.get(index));
            }
            optionSheet.setColumnWidth(optionColumn, 12000);
            if (!paths.isEmpty()) {
                String rangeName = "dict_options_" + header.id;
                String colName = CellReference.convertNumToColString(optionColumn);
                Name name = workbook.createName();
                name.setNameName(rangeName);
                name.setRefersToFormula("'目录选项'!$" + colName + "$2:$" + colName + "$" + (paths.size() + 1));
                namedRanges.put(header.id, rangeName);
            }
            optionColumn++;
        }
        workbook.setSheetHidden(workbook.getSheetIndex(optionSheet), true);
        return namedRanges;
    }

    private List<String> directoryPaths(Long dictTemplateId) {
        return directoryPathIndex(dictTemplateId).entrySet().stream()
                .filter(entry -> entry.getValue().stream().anyMatch(item -> !Boolean.TRUE.equals(item.isDisabled)))
                .map(Map.Entry::getKey)
                .toList();
    }

    private Map<Long, Map<String, List<DictDirectoryEntity>>> directoryPathIndexes(Collection<SceneItemEntity> items) {
        Map<Long, Map<String, List<DictDirectoryEntity>>> indexes = new LinkedHashMap<>();
        for (SceneItemEntity item : items) {
            if (!"dict".equals(item.type) || item.dictTemplateId == null) {
                continue;
            }
            indexes.put(item.id, directoryPathIndex(item.dictTemplateId));
        }
        return indexes;
    }

    private Map<String, List<DictDirectoryEntity>> directoryPathIndex(Long dictTemplateId) {
        if (dictTemplateId == null) {
            return Map.of();
        }
        List<DictDirectoryEntity> directories = dictDirectories.selectList(new QueryWrapper<DictDirectoryEntity>()
                .eq("dict_template_id", dictTemplateId)
                .eq("del", 0)
                .orderByAsc("level")
                .orderByAsc("parent_id")
                .orderByAsc("sort_number")
                .orderByAsc("id"));
        Map<Long, List<DictDirectoryEntity>> byParent = directories.stream()
                .collect(Collectors.groupingBy(item -> normalizeParentId(item.parentId), LinkedHashMap::new, Collectors.toList()));
        Map<String, List<DictDirectoryEntity>> index = new LinkedHashMap<>();
        collectDirectoryPaths(0L, "", byParent, index);
        return index;
    }

    private void collectDirectoryPaths(Long parentId, String prefix, Map<Long, List<DictDirectoryEntity>> byParent,
                                       Map<String, List<DictDirectoryEntity>> index) {
        for (DictDirectoryEntity item : byParent.getOrDefault(parentId, List.of())) {
            String path = prefix.isBlank() ? nullToEmpty(item.name) : prefix + " / " + nullToEmpty(item.name);
            String normalizedPath = normalizeDirectoryPath(path);
            if (!normalizedPath.isBlank()) {
                index.computeIfAbsent(normalizedPath, ignored -> new ArrayList<>()).add(item);
            }
            collectDirectoryPaths(item.id, path, byParent, index);
        }
    }

    private DirectoryImportValue resolveDirectoryImportValue(SceneItemEntity sceneItem, String rawValue,
                                                             Map<String, List<DictDirectoryEntity>> pathIndex) {
        String value = nullToEmpty(rawValue).trim();
        if (value.isBlank()) {
            return DirectoryImportValue.ok(null);
        }

        String normalizedPath = normalizeDirectoryPath(value);
        List<DictDirectoryEntity> matches = pathIndex == null ? List.of() : pathIndex.getOrDefault(normalizedPath, List.of());
        if (!matches.isEmpty()) {
            return resolveDirectoryMatches(matches);
        }

        if (looksLikeMultipleDirectorySelection(value)) {
            return DirectoryImportValue.fail("目录只允许选择一个");
        }

        List<Long> ids = parseDirectoryIds(value);
        if (!ids.isEmpty()) {
            if (ids.size() > 1) {
                return DirectoryImportValue.fail("目录只允许选择一个");
            }
            return resolveDirectoryId(sceneItem, ids.get(0));
        }

        return DirectoryImportValue.fail("目录不存在");
    }

    private DirectoryImportValue resolveDirectoryMatches(List<DictDirectoryEntity> matches) {
        if (matches.size() > 1) {
            return DirectoryImportValue.fail("目录路径不唯一");
        }
        DictDirectoryEntity directory = matches.get(0);
        if (Boolean.TRUE.equals(directory.isDisabled)) {
            return DirectoryImportValue.fail("目录已禁用");
        }
        return DirectoryImportValue.ok(directory.id);
    }

    private DirectoryImportValue resolveDirectoryId(SceneItemEntity sceneItem, Long id) {
        DictDirectoryEntity directory = dictDirectories.selectById(id);
        if (directory == null || directory.del == null || directory.del != 0
                || !Objects.equals(directory.dictTemplateId, sceneItem.dictTemplateId)) {
            return DirectoryImportValue.fail("目录不存在");
        }
        if (Boolean.TRUE.equals(directory.isDisabled)) {
            return DirectoryImportValue.fail("目录已禁用");
        }
        return DirectoryImportValue.ok(directory.id);
    }

    private static List<Long> parseDirectoryIds(String value) {
        String text = nullToEmpty(value).trim();
        if (text.matches("\\d+")) {
            return List.of(Long.parseLong(text));
        }
        if (!text.startsWith("[")) {
            return List.of();
        }
        try {
            Object parsed = JSON.readValue(text, new TypeReference<>() {
            });
            return safeDirectoryIds(parsed);
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private static List<Long> safeDirectoryIds(Object value) {
        if (value instanceof Number number) {
            return List.of(number.longValue());
        }
        if (value instanceof String text && text.matches("\\d+")) {
            return List.of(Long.parseLong(text));
        }
        if (value instanceof List<?> list) {
            return list.stream().flatMap(item -> safeDirectoryIds(item).stream()).toList();
        }
        return List.of();
    }

    private static String normalizeDirectoryPath(String value) {
        String text = nullToEmpty(value).trim().replace('／', '/');
        if (text.isBlank()) {
            return "";
        }
        return List.of(text.split("/")).stream()
                .map(String::trim)
                .filter(part -> !part.isBlank())
                .collect(Collectors.joining(" / "));
    }

    private static boolean looksLikeMultipleDirectorySelection(String value) {
        String text = nullToEmpty(value);
        return text.contains("\n")
                || text.contains("\r")
                || text.contains(";")
                || text.contains("；")
                || text.contains(",")
                || text.contains("，")
                || text.contains("、");
    }

    private static Row getOrCreateRow(Sheet sheet, int rowIndex) {
        Row row = sheet.getRow(rowIndex);
        return row == null ? sheet.createRow(rowIndex) : row;
    }

    private static void applyDirectoryValidation(Sheet sheet, int columnIndex, String rangeName) {
        if (rangeName == null || rangeName.isBlank()) {
            return;
        }
        DataValidationHelper helper = sheet.getDataValidationHelper();
        DataValidationConstraint constraint = helper.createFormulaListConstraint(rangeName);
        CellRangeAddressList range = new CellRangeAddressList(1, 1000, columnIndex, columnIndex);
        DataValidation validation = helper.createValidation(constraint, range);
        validation.setShowErrorBox(true);
        validation.createErrorBox("目录选择不正确", "请从下拉列表中选择一个目录");
        sheet.addValidationData(validation);
    }

    private static Object templateExampleValue(SceneItemEntity item, boolean hasDirectoryOptions) {
        if ("dict".equals(item.type)) {
            return hasDirectoryOptions ? "请从下拉列表选择目录" : "";
        }
        return switch (item.type) {
            case "integer" -> 1;
            case "decimal" -> 1.1;
            case "datetime" -> "2025-01-02";
            case "richtext" -> "<p>example-text</p>";
            case "tag" -> "安全,操作规范、设备维护";
            default -> "example-text";
        };
    }

    private static int columnWidth(String name) {
        int width = Math.max(3600, (nullToEmpty(name).length() + 8) * 512);
        return Math.min(width, 12000);
    }

    private static Long normalizeParentId(Long parentId) {
        return parentId == null ? 0L : parentId;
    }

    private static void setCellValue(Cell cell, Object value) {
        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else {
            cell.setCellValue(Objects.toString(value, ""));
        }
    }

    private String writeWorkbook(Workbook workbook, String filename) throws IOException {
        Files.createDirectories(fileRoot);
        Path target = fileRoot.resolve(filename);
        try (OutputStream output = Files.newOutputStream(target)) {
            workbook.write(output);
        }
        return FILE_PREFIX + "/" + fileRoot.relativize(target).toString().replace('\\', '/');
    }

    private Path toLocalFile(String filePath) {
        String relative = filePath == null ? "" : filePath;
        if (relative.startsWith(FILE_PREFIX)) {
            relative = relative.substring(FILE_PREFIX.length());
        }
        while (relative.startsWith("/") || relative.startsWith("\\")) {
            relative = relative.substring(1);
        }
        return uploadStorage.resolve(relative);
    }

    private static String cellString(Cell cell) {
        if (cell == null) {
            return "";
        }
        return switch (cell.getCellType()) {
            case NUMERIC -> {
                double value = cell.getNumericCellValue();
                yield value == Math.rint(value) ? Long.toString((long) value) : Double.toString(value);
            }
            case BOOLEAN -> Boolean.toString(cell.getBooleanCellValue());
            case FORMULA -> cell.getCellFormula();
            default -> cell.getStringCellValue().trim();
        };
    }

    private static boolean isBlankRow(Row row, int columns) {
        for (int col = 0; col < columns; col++) {
            if (!cellString(row.getCell(col)).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private static void addImportWarning(List<String> warnings, String warning) {
        if (warnings.size() < 20) {
            warnings.add(warning);
        } else if (warnings.size() == 20) {
            warnings.add("还有更多导入提醒未显示，请按提示修正后重新导入");
        }
    }

    private static void appendImportWarning(List<String> warnings, String warning) {
        if (warnings.size() < 20) {
            warnings.add(warning);
        } else if (warnings.size() == 20) {
            warnings.add("\u8fd8\u6709\u66f4\u591a\u5bfc\u5165\u63d0\u9192\u672a\u663e\u793a\uff0c\u8bf7\u6309\u63d0\u793a\u4fee\u6b63\u540e\u91cd\u65b0\u5bfc\u5165");
        }
    }

    private static void appendImportFailure(List<String> warnings, List<Map<String, Object>> failedRows,
                                            int rowNumber, String fieldName, String originalValue, String reason) {
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("rowNumber", rowNumber);
        detail.put("fieldName", nullToEmpty(fieldName));
        detail.put("originalValue", nullToEmpty(originalValue));
        detail.put("reason", nullToEmpty(reason));
        if (failedRows.size() < 200) {
            failedRows.add(detail);
        }
        String original = nullToEmpty(originalValue).isBlank() ? "" : "，原值：" + originalValue;
        appendImportWarning(warnings, "第 " + rowNumber + " 行「" + nullToEmpty(fieldName) + "」导入失败：" + nullToEmpty(reason) + original);
    }

    private static String importMessageReadable(int importedRows, int pendingRows, int skippedRows) {
        List<String> parts = new ArrayList<>();
        if (importedRows > 0) {
            parts.add("\u5df2\u5bfc\u5165 " + importedRows + " \u6761");
        }
        if (pendingRows > 0) {
            parts.add("\u5df2\u63d0\u4ea4\u5ba1\u6279 " + pendingRows + " \u6761");
        }
        if (skippedRows > 0) {
            parts.add("\u5df2\u8df3\u8fc7 " + skippedRows + " \u884c");
        }
        return parts.isEmpty() ? "\u6ca1\u6709\u5bfc\u5165\u4efb\u4f55\u6570\u636e" : String.join("\uff0c", parts);
    }

    private static String importMessage(int importedRows, int pendingRows, int skippedRows) {
        List<String> parts = new ArrayList<>();
        if (importedRows > 0) {
            parts.add("已导入 " + importedRows + " 条");
        }
        if (pendingRows > 0) {
            parts.add("已提交审批 " + pendingRows + " 条");
        }
        if (skippedRows > 0) {
            parts.add("已跳过空行 " + skippedRows + " 条");
        }
        return parts.isEmpty() ? "没有导入任何数据" : String.join("，", parts);
    }

    private static String joinValue(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(Objects::toString).collect(Collectors.joining(","));
        }
        return DictService.str(value);
    }

    private static List<String> splitValue(String value) {
        if (value == null || value.isEmpty()) {
            return List.of();
        }
        return List.of(value.split(","));
    }

    private static List<String> splitTagValue(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split("[,，、]+")).stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .distinct()
                .toList();
    }

    private static List<String> textValue(String value) {
        return value == null || value.isEmpty() ? List.of() : List.of(value);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static String normalizeDictIds(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        try {
            Object parsed = JSON.readValue(value, new TypeReference<>() {
            });
            return JSON.writeValueAsString(normalizeDictIdValue(parsed));
        } catch (Exception ignored) {
            return value;
        }
    }

    private String normalizeDictIds(SceneItemEntity sceneItem, Object value) {
        String raw = DictService.str(value);
        if (raw.isBlank()) {
            return "";
        }
        if (sceneItem == null || !"dict".equals(sceneItem.type)) {
            return normalizeDictIds(raw);
        }
        List<Long> ids = dictIdValues(value);
        if (ids.isEmpty()) {
            return normalizeDictIds(raw);
        }
        try {
            if (Boolean.TRUE.equals(sceneItem.multiValue)) {
                Object parsed = parseDictValue(value);
                List<Long> leafIds = selectedDictLeafIds(parsed);
                if (leafIds.isEmpty()) {
                    leafIds = ids;
                }
                List<List<Long>> paths = leafIds.stream()
                        .map(id -> directoryPath(sceneItem, id))
                        .filter(path -> !path.isEmpty())
                        .toList();
                return JSON.writeValueAsString(paths);
            }
            return JSON.writeValueAsString(directoryPath(sceneItem, ids.get(ids.size() - 1)));
        } catch (Exception ignored) {
            return normalizeDictIds(raw);
        }
    }

    private Object parseDictValue(Object value) {
        if (!(value instanceof String text)) {
            return value;
        }
        if (text.isBlank()) {
            return List.of();
        }
        try {
            return JSON.readValue(text, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return text;
        }
    }

    private static List<Long> selectedDictLeafIds(Object value) {
        if (value instanceof List<?> list) {
            boolean hasNestedSelection = list.stream().anyMatch(item -> item instanceof List<?> || item instanceof Map<?, ?>);
            if (hasNestedSelection) {
                return list.stream()
                        .map(BusinessService::lastDictId)
                        .filter(Objects::nonNull)
                        .toList();
            }
            return list.stream()
                    .map(DictService::num)
                    .filter(Objects::nonNull)
                    .toList();
        }
        Long id = lastDictId(value);
        return id == null ? List.of() : List.of(id);
    }

    private static Long lastDictId(Object value) {
        if (value instanceof List<?> list) {
            for (int index = list.size() - 1; index >= 0; index--) {
                Long id = lastDictId(list.get(index));
                if (id != null) {
                    return id;
                }
            }
            return null;
        }
        if (value instanceof Map<?, ?> map) {
            Long id = lastDictId(map.get("id"));
            if (id == null) {
                id = lastDictId(map.get("value"));
            }
            return id == null ? lastDictId(map.get("key")) : id;
        }
        return DictService.num(value);
    }

    private List<Long> directoryPath(SceneItemEntity sceneItem, Long leafId) {
        if (sceneItem == null || leafId == null) {
            return List.of();
        }
        List<Long> reversed = new ArrayList<>();
        Set<Long> seen = new HashSet<>();
        Long currentId = leafId;
        while (currentId != null && currentId > 0 && seen.add(currentId)) {
            DictDirectoryEntity directory = dictDirectories.selectById(currentId);
            if (directory == null || directory.del == null || directory.del != 0
                    || !Objects.equals(directory.dictTemplateId, sceneItem.dictTemplateId)) {
                break;
            }
            reversed.add(directory.id);
            currentId = directory.parentId == null || directory.parentId == 0 ? null : directory.parentId;
        }
        List<Long> path = new ArrayList<>();
        for (int index = reversed.size() - 1; index >= 0; index--) {
            path.add(reversed.get(index));
        }
        return path.isEmpty() ? List.of(leafId) : path;
    }

    private static Object normalizeDictIdValue(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(BusinessService::normalizeDictIdValue).toList();
        }
        if (value instanceof String text && text.matches("\\d+")) {
            return Long.parseLong(text);
        }
        return value;
    }

    private List<Long> matchedKnowledgeIds(Object value) {
        if (!(value instanceof List<?> list)) {
            return null;
        }
        Set<Long> ids = null;
        boolean hasFilter = false;
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map)) {
                continue;
            }
            Long sceneItemId = DictService.num(map.get("sceneItemId"));
            String joined = joinValue(map.get("sceneItemValue"));
            Object rangeValue = map.get("sceneItemValueRange");
            String dictId = DictService.str(map.get("sceneItemSelectDictIds"));
            if (dictId.isBlank()) {
                dictId = DictService.str(map.get("sceneItemSelectDictTreeIds"));
            }
            if (joined.isBlank() && dictId.isBlank() && !hasRangeValue(rangeValue)) {
                continue;
            }
            hasFilter = true;
            QueryWrapper<KnowledgeItemEntity> query = new QueryWrapper<KnowledgeItemEntity>().eq("scene_item_id", sceneItemId);
            if (!joined.isBlank()) {
                query.like("scene_item_value", joined);
            }
            applySceneItemValueRange(query, rangeValue);
            Set<Long> currentIds = new HashSet<>();
            if (!dictId.isBlank()) {
                Long targetDictId = DictService.num(dictId);
                query.ne("select_dict_tree_ids", "");
                knowledgeItems.selectList(query).stream()
                        .filter(item -> targetDictId == null || containsDictId(item.selectDictTreeIds, targetDictId))
                        .forEach(item -> currentIds.add(item.knowledgeId));
            } else {
                knowledgeItems.selectList(query).forEach(item -> currentIds.add(item.knowledgeId));
            }
            if (ids == null) {
                ids = currentIds;
            } else {
                ids.retainAll(currentIds);
            }
        }
        return hasFilter ? new ArrayList<>(ids == null ? Set.of() : ids) : null;
    }

    private static boolean containsDictId(String value, Long targetId) {
        if (value == null || value.isBlank() || targetId == null) {
            return false;
        }
        try {
            return containsDictId(JSON.readValue(value, Object.class), targetId);
        } catch (Exception ignored) {
            return dictIdValues(value).contains(targetId);
        }
    }

    private static boolean containsDictId(Object value, Long targetId) {
        if (value instanceof Number number) {
            return Objects.equals(number.longValue(), targetId);
        }
        if (value instanceof String text) {
            return Objects.equals(DictService.num(text), targetId);
        }
        if (value instanceof List<?> list) {
            return list.stream().anyMatch(item -> containsDictId(item, targetId));
        }
        if (value instanceof Map<?, ?> map) {
            return map.values().stream().anyMatch(item -> containsDictId(item, targetId));
        }
        return false;
    }

    private static boolean hasRangeValue(Object value) {
        if (!(value instanceof List<?> list) || list.isEmpty()) {
            return false;
        }
        return list.stream().anyMatch(item -> !DictService.str(item).isBlank());
    }

    private static void applySceneItemValueRange(QueryWrapper<KnowledgeItemEntity> query, Object value) {
        if (!(value instanceof List<?> list) || list.isEmpty()) {
            return;
        }
        String begin = DictService.str(list.get(0));
        if (!begin.isBlank()) {
            query.ge("scene_item_value", begin);
        }
        if (list.size() > 1) {
            String end = DictService.str(list.get(1));
            if (!end.isBlank()) {
                query.le("scene_item_value", end);
            }
        }
    }

    private List<Long> keywordMatchedKnowledgeIds(Long sceneTemplateId, Object keywordValue, Object sceneItemIdsValue) {
        String keyword = DictService.str(keywordValue).trim();
        if (keyword.isBlank()) {
            return null;
        }
        Set<Long> allowedIds = visibleSceneItems(sceneTemplateId).stream()
                .filter(item -> !"dict".equals(item.type) && !"datetime".equals(item.type) && item.isSupportSearch != Boolean.FALSE)
                .map(item -> item.id)
                .collect(Collectors.toSet());
        if (sceneItemIdsValue instanceof List<?> list && !list.isEmpty()) {
            Set<Long> requestedIds = list.stream()
                    .map(DictService::num)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());
            allowedIds.retainAll(requestedIds);
        }
        if (allowedIds.isEmpty()) {
            return List.of();
        }
        Set<Long> ids = new HashSet<>();
        knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                .in("scene_item_id", allowedIds)
                .like("scene_item_value", keyword))
                .forEach(item -> ids.add(item.knowledgeId));
        return new ArrayList<>(ids);
    }

    private static void applyTimeRange(QueryWrapper<KnowledgeEntity> query, String column, Object value) {
        if (value instanceof List<?> list && !list.isEmpty()) {
            String begin = DictService.str(list.get(0));
            if (!begin.isBlank()) {
                query.ge(column, begin);
            }
            if (list.size() > 1) {
                String end = DictService.str(list.get(1));
                if (!end.isBlank()) {
                    query.le(column, end);
                }
            }
        }
    }

    private static void applyStatisticsRange(QueryWrapper<KnowledgeEntity> query, List<String> searchCreateTime) {
        if (searchCreateTime == null || searchCreateTime.isEmpty()) {
            return;
        }
        if (!searchCreateTime.get(0).isBlank()) {
            query.ge("create_at", searchCreateTime.get(0));
        }
        if (searchCreateTime.size() > 1 && !searchCreateTime.get(1).isBlank()) {
            query.le("create_at", searchCreateTime.get(1));
        }
    }

    private static String safeColumn(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String column = value.replaceAll("[^A-Za-z0-9_\\.]", "");
        if (column.startsWith("k.")) {
            column = column.substring(2);
        }
        return column;
    }

    private static Long epoch(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toEpochSecond();
    }

    private TokenService.TokenUser resolveUser(String authorization) {
        try {
            return tokens.resolve(authorization);
        } catch (Exception ignored) {
            return new TokenService.TokenUser(0L, "");
        }
    }
}
