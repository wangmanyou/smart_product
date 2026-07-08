package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.DictDirectoryEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.KnowledgeVersionEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.KnowledgeVersionMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class KnowledgeVersionService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> MEDIA_TYPES = Set.of("picture", "video", "audio", "file");

    private final KnowledgeVersionMapper versions;
    private final KnowledgeMapper knowledge;
    private final KnowledgeItemMapper knowledgeItems;
    private final SceneItemMapper sceneItems;
    private final DictDirectoryMapper dictDirectories;
    private final CurrentUserService currentUsers;

    public KnowledgeVersionService(KnowledgeVersionMapper versions, KnowledgeMapper knowledge,
                                   KnowledgeItemMapper knowledgeItems, SceneItemMapper sceneItems,
                                   DictDirectoryMapper dictDirectories, CurrentUserService currentUsers) {
        this.versions = versions;
        this.knowledge = knowledge;
        this.knowledgeItems = knowledgeItems;
        this.sceneItems = sceneItems;
        this.dictDirectories = dictDirectories;
        this.currentUsers = currentUsers;
    }

    public Map<String, Object> list(Long knowledgeId, int pageNumber, int pageSize) {
        KnowledgeEntity row = requireKnowledge(knowledgeId);
        CurrentUser user = currentUsers.current();
        requireAccess(user, row.sceneTemplateId);
        requireVersionAccess(user, row.sceneTemplateId);

        Page<KnowledgeVersionEntity> page = versions.selectPage(
                Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)),
                new QueryWrapper<KnowledgeVersionEntity>()
                        .eq("knowledge_id", knowledgeId)
                        .orderByDesc("version_no")
                        .orderByDesc("id"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(rowVersion -> dto(rowVersion, false)).toList());
        result.put("totalElements", page.getTotal());
        return result;
    }

    public Map<String, Object> detail(Long versionId) {
        KnowledgeVersionEntity row = versions.selectById(versionId);
        if (row == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "历史版本不存在");
        }
        CurrentUser user = currentUsers.current();
        requireAccess(user, row.sceneTemplateId);
        requireVersionAccess(user, row.sceneTemplateId);
        return dto(row, true);
    }

    public Map<String, Object> snapshot(Long knowledgeId) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        if (row == null) {
            return Map.of();
        }
        List<SceneItemEntity> headers = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                .eq("scene_template_id", row.sceneTemplateId)
                .eq("del", 0)
                .orderByAsc("sort_number")
                .orderByAsc("id"));
        Map<Long, KnowledgeItemEntity> itemMap = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                        .eq("knowledge_id", knowledgeId))
                .stream()
                .collect(Collectors.toMap(item -> item.sceneItemId, item -> item, (first, second) -> first, LinkedHashMap::new));

        List<Map<String, Object>> fields = new ArrayList<>();
        for (SceneItemEntity header : headers) {
            KnowledgeItemEntity value = itemMap.get(header.id);
            fields.add(fieldSnapshot(header, value));
        }

        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("knowledgeId", row.id);
        snapshot.put("sceneTemplateId", row.sceneTemplateId);
        snapshot.put("creatorId", row.creatorId);
        snapshot.put("creatorName", row.creatorName);
        snapshot.put("viewTime", row.viewTime);
        snapshot.put("createTime", epoch(row.createAt));
        snapshot.put("updateTime", epoch(row.updateAt));
        snapshot.put("deleted", row.del != null && row.del != 0);
        snapshot.put("fieldValues", fields);
        snapshot.put("knowledgeShow", fields);
        return snapshot;
    }

    public void recordCreate(Long knowledgeId, Long operatorId, String operatorName) {
        Map<String, Object> after = snapshot(knowledgeId);
        record(knowledgeId, sceneTemplateId(after), "CREATE", operatorId, operatorName, "新增知识", null, after);
    }

    public void recordUpdate(Long knowledgeId, Long operatorId, String operatorName, Map<String, Object> before) {
        Map<String, Object> after = snapshot(knowledgeId);
        String summary = updateSummary(before, after);
        record(knowledgeId, sceneTemplateId(after), "UPDATE", operatorId, operatorName, summary, before, after);
    }

    public void recordDelete(Long knowledgeId, Long operatorId, String operatorName, Map<String, Object> before) {
        record(knowledgeId, sceneTemplateId(before), "DELETE", operatorId, operatorName, "删除知识", before, null);
    }

    private Map<String, Object> fieldSnapshot(SceneItemEntity header, KnowledgeItemEntity value) {
        String type = header.type == null ? "" : header.type;
        String rawValue = value == null ? "" : nullToEmpty(value.sceneItemValue);
        String dictValue = value == null ? "" : normalizeDictIds(value.selectDictTreeIds);
        List<Long> directoryIds = "dict".equals(type) ? dictIdValues(dictValue) : List.of();
        List<String> directoryPaths = directoryIds.stream()
                .map(this::directoryPath)
                .filter(path -> !path.isBlank())
                .toList();
        List<String> sceneItemValue = switch (type) {
            case "text", "richtext" -> textValue(rawValue);
            case "tag" -> splitTagValue(rawValue);
            default -> splitValue(rawValue);
        };

        Map<String, Object> field = new LinkedHashMap<>();
        field.put("sceneItemId", header.id);
        field.put("sceneItemName", header.name);
        field.put("sceneItemType", type);
        field.put("isHidden", Boolean.TRUE.equals(header.isHide));
        field.put("isRequired", Boolean.TRUE.equals(header.isRequired));
        field.put("sortNumber", header.sortNumber);
        field.put("sceneItemValue", sceneItemValue);
        field.put("sceneItemSelectDictTreeIds", dictValue);
        field.put("directoryPaths", directoryPaths);
        field.put("displayValue", displayValue(type, sceneItemValue, directoryPaths));
        return field;
    }

    private void record(Long knowledgeId, Long sceneTemplateId, String operationType, Long operatorId, String operatorName,
                        String summary, Map<String, Object> before, Map<String, Object> after) {
        if (knowledgeId == null) {
            return;
        }
        try {
            KnowledgeVersionEntity row = new KnowledgeVersionEntity();
            row.knowledgeId = knowledgeId;
            row.sceneTemplateId = sceneTemplateId;
            row.versionNo = nextVersionNo(knowledgeId);
            row.operationType = operationType;
            row.operatorId = operatorId;
            row.operatorName = operatorName;
            row.changeSummary = truncate(summary == null || summary.isBlank() ? operationText(operationType) : summary, 1000);
            row.beforeSnapshotJson = before == null ? null : JSON.writeValueAsString(before);
            row.afterSnapshotJson = after == null ? null : JSON.writeValueAsString(after);
            row.createAt = LocalDateTime.now();
            versions.insert(row);
        } catch (Exception ex) {
            throw new IllegalStateException("保存知识历史版本失败", ex);
        }
    }

    private int nextVersionNo(Long knowledgeId) {
        KnowledgeVersionEntity latest = versions.selectOne(new QueryWrapper<KnowledgeVersionEntity>()
                .eq("knowledge_id", knowledgeId)
                .orderByDesc("version_no")
                .last("limit 1"));
        return latest == null || latest.versionNo == null ? 1 : latest.versionNo + 1;
    }

    private Map<String, Object> dto(KnowledgeVersionEntity row, boolean includeSnapshot) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("versionId", row.id);
        dto.put("knowledgeId", row.knowledgeId);
        dto.put("sceneTemplateId", row.sceneTemplateId);
        dto.put("versionNo", row.versionNo);
        dto.put("operationType", row.operationType);
        dto.put("operationText", operationText(row.operationType));
        dto.put("operatorId", row.operatorId);
        dto.put("operatorName", row.operatorName);
        dto.put("changeSummary", row.changeSummary);
        dto.put("createTime", epoch(row.createAt));
        if (includeSnapshot) {
            dto.put("beforeSnapshot", parseSnapshot(row.beforeSnapshotJson));
            dto.put("afterSnapshot", parseSnapshot(row.afterSnapshotJson));
        }
        return dto;
    }

    private String updateSummary(Map<String, Object> before, Map<String, Object> after) {
        Map<Long, Map<String, Object>> beforeFields = fieldsById(before);
        Map<Long, Map<String, Object>> afterFields = fieldsById(after);
        Set<Long> ids = new LinkedHashSet<>();
        ids.addAll(beforeFields.keySet());
        ids.addAll(afterFields.keySet());

        List<String> changes = new ArrayList<>();
        for (Long id : ids) {
            Map<String, Object> beforeField = beforeFields.get(id);
            Map<String, Object> afterField = afterFields.get(id);
            if (Objects.equals(comparableValue(beforeField), comparableValue(afterField))) {
                continue;
            }
            changes.add(fieldChangeText(beforeField, afterField));
            if (changes.size() >= 6) {
                break;
            }
        }
        if (changes.isEmpty()) {
            return "更新知识信息";
        }
        if (ids.size() > changes.size()) {
            changes.add("等");
        }
        return truncate(String.join("；", changes), 1000);
    }

    private String fieldChangeText(Map<String, Object> beforeField, Map<String, Object> afterField) {
        Map<String, Object> field = afterField == null ? beforeField : afterField;
        String name = DictService.str(field == null ? "" : field.get("sceneItemName"));
        String type = DictService.str(field == null ? "" : field.get("sceneItemType"));
        if ("dict".equals(type)) {
            String beforeText = displayText(beforeField);
            String afterText = displayText(afterField);
            return "目录由“" + fallbackDash(beforeText) + "”改为“" + fallbackDash(afterText) + "”";
        }
        if (MEDIA_TYPES.contains(type)) {
            int beforeCount = valueCount(beforeField);
            int afterCount = valueCount(afterField);
            if (afterCount > beforeCount) {
                return "新增了" + fallbackName(name, "附件");
            }
            if (afterCount < beforeCount) {
                return "删除了" + fallbackName(name, "附件");
            }
        }
        return "修改了" + fallbackName(name, "字段");
    }

    private Object comparableValue(Map<String, Object> field) {
        if (field == null) {
            return null;
        }
        if ("dict".equals(DictService.str(field.get("sceneItemType")))) {
            return DictService.str(field.get("sceneItemSelectDictTreeIds"));
        }
        return field.get("sceneItemValue");
    }

    private Map<Long, Map<String, Object>> fieldsById(Map<String, Object> snapshot) {
        if (snapshot == null) {
            return Map.of();
        }
        Object fields = snapshot.get("fieldValues");
        if (!(fields instanceof List<?> list)) {
            return Map.of();
        }
        Map<Long, Map<String, Object>> result = new LinkedHashMap<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Long id = DictService.num(map.get("sceneItemId"));
                if (id == null) {
                    continue;
                }
                Map<String, Object> copy = new LinkedHashMap<>();
                map.forEach((key, value) -> copy.put(String.valueOf(key), value));
                result.put(id, copy);
            }
        }
        return result;
    }

    private String displayValue(String type, List<String> values, List<String> directoryPaths) {
        if ("dict".equals(type)) {
            return String.join("，", directoryPaths);
        }
        return String.join("，", values == null ? List.of() : values);
    }

    private String displayText(Map<String, Object> field) {
        return field == null ? "" : DictService.str(field.get("displayValue"));
    }

    private int valueCount(Map<String, Object> field) {
        if (field == null || !(field.get("sceneItemValue") instanceof List<?> list)) {
            return 0;
        }
        return list.size();
    }

    private Map<String, Object> parseSnapshot(String json) {
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        try {
            return JSON.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ex) {
            return Map.of();
        }
    }

    private KnowledgeEntity requireKnowledge(Long knowledgeId) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        if (row == null || row.del != null && row.del != 0) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "知识不存在");
        }
        return row;
    }

    private static void requireAccess(CurrentUser user, Long sceneTemplateId) {
        if (!user.canAccessScene(sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有该场景的数据权限");
        }
    }

    private static void requireVersionAccess(CurrentUser user, Long sceneTemplateId) {
        if (!user.hasScenePermission(PermissionCodes.KNOWLEDGE_VERSION_VIEW, sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有查看知识历史版本的权限");
        }
    }

    private String directoryPath(Long id) {
        if (id == null) {
            return "";
        }
        List<String> names = new ArrayList<>();
        Long currentId = id;
        int guard = 0;
        while (currentId != null && currentId > 0 && guard++ < 100) {
            DictDirectoryEntity row = dictDirectories.selectById(currentId);
            if (row == null || row.del != null && row.del != 0) {
                break;
            }
            names.add(0, nullToEmpty(row.name));
            currentId = row.parentId;
        }
        return names.stream().filter(name -> !name.isBlank()).collect(Collectors.joining(" / "));
    }

    private static Long sceneTemplateId(Map<String, Object> snapshot) {
        return snapshot == null ? null : DictService.num(snapshot.get("sceneTemplateId"));
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
            return dictIdValues(parsed);
        } catch (Exception ignored) {
            return splitValue(text).stream()
                    .map(DictService::num)
                    .filter(Objects::nonNull)
                    .toList();
        }
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

    private static Object normalizeDictIdValue(Object value) {
        if (value instanceof List<?> list) {
            return list.stream().map(KnowledgeVersionService::normalizeDictIdValue).toList();
        }
        if (value instanceof String text && text.matches("\\d+")) {
            return Long.parseLong(text);
        }
        return value;
    }

    private static List<String> textValue(String value) {
        return value == null || value.isEmpty() ? List.of() : List.of(value);
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

    private static String operationText(String type) {
        return switch (type == null ? "" : type) {
            case "CREATE" -> "新增";
            case "UPDATE" -> "修改";
            case "DELETE" -> "删除";
            default -> type == null || type.isBlank() ? "-" : type;
        };
    }

    private static String fallbackName(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String fallbackDash(String value) {
        return value == null || value.isBlank() ? "--" : truncate(value, 120);
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, Math.max(0, maxLength - 1)) + "…";
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static Long epoch(LocalDateTime time) {
        return time == null ? null : time.atZone(ZoneId.systemDefault()).toEpochSecond();
    }
}
