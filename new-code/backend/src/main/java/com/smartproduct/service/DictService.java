package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.DictDirectoryEntity;
import com.smartproduct.entity.DictTemplateEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.DictTemplateMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DictService {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final DictTemplateMapper templates;
    private final DictDirectoryMapper directories;
    private final SceneItemMapper sceneItems;
    private final KnowledgeItemMapper knowledgeItems;
    private final TokenService tokens;
    private final AccessLogService accessLogs;

    public DictService(DictTemplateMapper templates, DictDirectoryMapper directories, SceneItemMapper sceneItems,
                       KnowledgeItemMapper knowledgeItems, TokenService tokens, AccessLogService accessLogs) {
        this.templates = templates;
        this.directories = directories;
        this.sceneItems = sceneItems;
        this.knowledgeItems = knowledgeItems;
        this.tokens = tokens;
        this.accessLogs = accessLogs;
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String name, String type, String disabled) {
        QueryWrapper<DictTemplateEntity> query = new QueryWrapper<DictTemplateEntity>().eq("del", 0);
        if (name != null && !name.isBlank()) {
            query.like("name", name);
        }
        if (type != null && !type.isBlank()) {
            query.eq("type", type);
        }
        if ("enabled".equals(disabled)) {
            query.eq("is_disabled", false);
        } else if ("disabled".equals(disabled)) {
            query.eq("is_disabled", true);
        }
        query.orderByDesc("update_at").orderByDesc("id");
        Page<DictTemplateEntity> page = templates.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("content", page.getRecords().stream().map(this::templateDto).toList());
        result.put("totalElements", page.getTotal());
        return result;
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> request, String authorization) {
        TokenService.TokenUser user = resolveUser(authorization);
        LocalDateTime now = LocalDateTime.now();
        DictTemplateEntity template = new DictTemplateEntity();
        template.name = str(request.get("dictName"));
        template.type = str(request.get("dictType"));
        template.isBuiltin = false;
        template.isDisabled = false;
        template.isUsed = false;
        template.creatorId = user.userId();
        template.creatorName = user.userAccount();
        template.createAt = now;
        template.updateAt = now;
        template.del = 0;
        templates.insert(template);
        insertDirectories(template.id, template.type, request);
        accessLogs.success("目录管理", "DICT_CREATE", "DICT_TEMPLATE", template.id, null,
                "新增目录：" + template.name);
        return Map.of("dictTemplateId", template.id);
    }

    @Transactional
    public void edit(Map<String, Object> request) {
        Long id = num(request.get("dictTemplateId"));
        templates.update(new UpdateWrapper<DictTemplateEntity>()
                .eq("id", id)
                .set("name", str(request.get("dictName")))
                .set("is_disabled", bool(request.get("isDisabled")))
                .set("update_at", LocalDateTime.now()));
        insertDirectories(id, null, request);
        accessLogs.success("目录管理", "DICT_UPDATE", "DICT_TEMPLATE", id, null,
                "编辑目录：" + str(request.get("dictName")));
    }

    public void editStatus(Map<String, Object> request) {
        Long id = num(request.get("dictTemplateId"));
        boolean disabled = bool(request.get("isDisabled"));
        templates.update(new UpdateWrapper<DictTemplateEntity>()
                .eq("id", id)
                .set("is_disabled", bool(request.get("isDisabled")))
                .set("update_at", LocalDateTime.now()));
        accessLogs.success("目录管理", "DICT_STATUS", "DICT_TEMPLATE", id, null,
                (disabled ? "禁用目录" : "启用目录"));
    }

    @Transactional
    public void deleteTemplate(Long id) {
        DictTemplateEntity template = templates.selectOne(new QueryWrapper<DictTemplateEntity>().eq("id", id).eq("del", 0));
        if (template == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "目录不存在或已删除");
        }
        if (Boolean.TRUE.equals(template.isUsed) || isReferencedByScene(id)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "该目录已被场景字段使用，不能删除，请先处理引用关系");
        }
        LocalDateTime now = LocalDateTime.now();
        templates.update(new UpdateWrapper<DictTemplateEntity>()
                .eq("id", id)
                .set("del", 1)
                .set("update_at", now));
        directories.update(new UpdateWrapper<DictDirectoryEntity>()
                .eq("dict_template_id", id)
                .eq("del", 0)
                .set("del", 1)
                .set("update_at", now));
        accessLogs.success("目录管理", "DICT_DELETE", "DICT_TEMPLATE", id, null,
                "删除目录：" + template.name);
    }

    public void editDirectoryName(Map<String, Object> request) {
        Long id = num(request.get("dictDirectoryId"));
        directories.update(new UpdateWrapper<DictDirectoryEntity>()
                .eq("id", id)
                .set("name", str(request.get("dictDirectoryName")))
                .set("update_at", LocalDateTime.now()));
        accessLogs.success("目录管理", "DIRECTORY_RENAME", "DICT_DIRECTORY", id, null,
                "重命名目录项：" + str(request.get("dictDirectoryName")));
    }

    public void editDirectoryStatus(Map<String, Object> request) {
        Long id = num(request.get("dictDirectoryId"));
        boolean disabled = bool(request.get("isDisabled"));
        List<Long> ids = childIds(id);
        directories.update(new UpdateWrapper<DictDirectoryEntity>()
                .in("id", ids)
                .set("is_disabled", bool(request.get("isDisabled")))
                .set("update_at", LocalDateTime.now()));
        accessLogs.success("目录管理", "DIRECTORY_STATUS", "DICT_DIRECTORY", id, null,
                (disabled ? "禁用目录项" : "启用目录项") + "，影响 " + ids.size() + " 项");
    }

    @Transactional
    public void deleteDirectory(Long id) {
        DictDirectoryEntity directory = directories.selectOne(new QueryWrapper<DictDirectoryEntity>()
                .eq("id", id)
                .eq("del", 0));
        if (directory == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "目录项不存在或已删除");
        }
        List<Long> ids = childIds(id);
        if (isDirectorySelected(directory.dictTemplateId, ids)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "该目录项已被知识数据选中，不能删除，请先处理引用该选项的知识");
        }
        directories.deleteBatchIds(ids);
        accessLogs.success("目录管理", "DIRECTORY_DELETE", "DICT_DIRECTORY", id, null,
                "删除目录项：" + directory.name + "，影响 " + ids.size() + " 项");
    }

    public Map<String, Object> detail(Long id) {
        DictTemplateEntity template = templates.selectOne(new QueryWrapper<DictTemplateEntity>().eq("id", id).eq("del", 0));
        List<DictDirectoryEntity> items = directories.selectList(new QueryWrapper<DictDirectoryEntity>()
                .eq("dict_template_id", id)
                .eq("del", 0)
                .orderByAsc("level")
                .orderByAsc("parent_id")
                .orderByAsc("sort_number")
                .orderByAsc("id"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dictTemplate", templateDto(template));
        result.put("treeDict", Map.of("treeDict", buildTree(items, 0L)));
        result.put("planeDict", Map.of("planeDict", items.stream().map(this::planeDto).toList()));
        return result;
    }

    @Transactional
    public void sortDirectories(Map<String, Object> request) {
        Object idsValue = request.get("dictDirectoryIds");
        if (!(idsValue instanceof List<?> list) || list.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请提供需要排序的目录项");
        }
        List<Long> ids = new ArrayList<>();
        for (Object item : list) {
            try {
                ids.add(num(item));
            } catch (Exception ignored) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "目录排序参数不正确");
            }
        }
        if (ids.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "目录排序参数不正确");
        }
        if (new LinkedHashSet<>(ids).size() != ids.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "目录排序不能包含重复目录项");
        }
        List<DictDirectoryEntity> selected = directories.selectList(new QueryWrapper<DictDirectoryEntity>()
                .in("id", ids)
                .eq("del", 0));
        if (selected.size() != ids.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "目录排序包含不存在或已删除的目录项");
        }
        DictDirectoryEntity first = selected.get(0);
        Long templateId = first.dictTemplateId;
        Long parentId = normalizeParentId(first.parentId);
        boolean sameGroup = selected.stream().allMatch(item ->
                Objects.equals(item.dictTemplateId, templateId)
                        && Objects.equals(normalizeParentId(item.parentId), parentId));
        if (!sameGroup) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "只能调整同一层级下的目录顺序");
        }

        QueryWrapper<DictDirectoryEntity> siblingQuery = new QueryWrapper<DictDirectoryEntity>()
                .eq("dict_template_id", templateId)
                .eq("del", 0);
        applyParentQuery(siblingQuery, parentId);
        List<Long> siblingIds = directories.selectList(siblingQuery
                        .orderByAsc("sort_number")
                        .orderByAsc("id"))
                .stream()
                .map(item -> item.id)
                .toList();
        if (!new LinkedHashSet<>(siblingIds).equals(new LinkedHashSet<>(ids))) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "排序列表必须包含同级全部目录项");
        }

        LocalDateTime now = LocalDateTime.now();
        for (int index = 0; index < ids.size(); index++) {
            directories.update(new UpdateWrapper<DictDirectoryEntity>()
                    .eq("id", ids.get(index))
                    .set("sort_number", index + 1)
                    .set("update_at", now));
        }
        templates.update(new UpdateWrapper<DictTemplateEntity>()
                .eq("id", templateId)
                .set("update_at", now));
        accessLogs.success("目录管理", "DIRECTORY_SORT", "DICT_TEMPLATE", templateId, null,
                "调整目录排序，父级目录ID：" + parentId);
    }

    private void insertDirectories(Long templateId, String type, Map<String, Object> request) {
        Object plane = request.get("planeDict");
        if (plane instanceof Map<?, ?> planeMap && planeMap.get("planeDict") instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> map) {
                    insertDirectory(templateId, 0L, 0L, map);
                }
            }
        }
        Object tree = request.get("treeDict");
        if (tree instanceof List<?> list) {
            insertTree(templateId, 0L, 0L, list);
        }
    }

    private void insertTree(Long templateId, Long parentId, Long level, List<?> list) {
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                DictDirectoryEntity saved = insertDirectory(templateId, parentId, level, map);
                Object children = map.get("children");
                if (children instanceof List<?> childList) {
                    insertTree(templateId, saved.id, level + 1, childList);
                }
            }
        }
    }

    private DictDirectoryEntity insertDirectory(Long templateId, Long parentId, Long level, Map<?, ?> map) {
        LocalDateTime now = LocalDateTime.now();
        DictDirectoryEntity item = new DictDirectoryEntity();
        item.dictTemplateId = templateId;
        item.name = str(map.get("name"));
        item.parentId = map.get("parentId") == null ? parentId : num(map.get("parentId"));
        item.level = map.get("level") == null ? level : num(map.get("level"));
        item.sortNumber = map.get("sortNumber") == null ? nextSortNumber(templateId, item.parentId) : num(map.get("sortNumber"));
        item.isDisabled = bool(map.get("isDisabled"));
        item.isUsed = false;
        item.createAt = now;
        item.updateAt = now;
        item.del = 0;
        directories.insert(item);
        return item;
    }

    private Long nextSortNumber(Long templateId, Long parentId) {
        QueryWrapper<DictDirectoryEntity> query = new QueryWrapper<DictDirectoryEntity>()
                .select("sort_number")
                .eq("dict_template_id", templateId)
                .eq("del", 0);
        applyParentQuery(query, normalizeParentId(parentId));
        List<DictDirectoryEntity> siblings = directories.selectList(query);
        long max = siblings.stream()
                .map(item -> item.sortNumber)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .max()
                .orElse(0L);
        return max + 1;
    }

    private List<Long> childIds(Long id) {
        List<DictDirectoryEntity> all = directories.selectList(new QueryWrapper<DictDirectoryEntity>().eq("del", 0));
        Map<Long, List<DictDirectoryEntity>> byParent = all.stream().collect(Collectors.groupingBy(i -> i.parentId == null ? 0L : i.parentId));
        List<Long> ids = new ArrayList<>();
        collect(id, byParent, ids);
        return ids;
    }

    private void collect(Long id, Map<Long, List<DictDirectoryEntity>> byParent, List<Long> ids) {
        ids.add(id);
        for (DictDirectoryEntity child : byParent.getOrDefault(id, List.of())) {
            collect(child.id, byParent, ids);
        }
    }

    private List<Map<String, Object>> buildTree(List<DictDirectoryEntity> items, Long parentId) {
        return items.stream()
                .filter(item -> Long.valueOf(item.parentId == null ? 0L : item.parentId).equals(parentId))
                .map(item -> {
                    Map<String, Object> dto = planeDto(item);
                    dto.put("parentId", item.parentId);
                    dto.put("level", item.level);
                    dto.put("sortNumber", item.sortNumber);
                    dto.put("children", buildTree(items, item.id));
                    return dto;
                })
                .toList();
    }

    private Map<String, Object> templateDto(DictTemplateEntity item) {
        if (item == null) {
            return Map.of();
        }
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("dictTemplateId", item.id);
        dto.put("dictName", item.name);
        dto.put("dictType", item.type);
        dto.put("dictDisabled", Boolean.TRUE.equals(item.isDisabled));
        dto.put("updateTime", item.updateAt == null ? null : item.updateAt.atZone(ZoneId.systemDefault()).toEpochSecond());
        dto.put("creatorName", item.creatorName);
        dto.put("dictIsUsed", Boolean.TRUE.equals(item.isUsed) || isReferencedByScene(item.id));
        return dto;
    }

    private boolean isReferencedByScene(Long dictTemplateId) {
        if (dictTemplateId == null || dictTemplateId <= 0) {
            return false;
        }
        return sceneItems.selectCount(new QueryWrapper<SceneItemEntity>()
                .eq("dict_template_id", dictTemplateId)
                .eq("del", 0)) > 0;
    }

    private boolean isDirectorySelected(Long dictTemplateId, List<Long> directoryIds) {
        if (dictTemplateId == null || directoryIds == null || directoryIds.isEmpty()) {
            return false;
        }
        List<Long> sceneItemIds = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                        .eq("dict_template_id", dictTemplateId)
                        .eq("del", 0))
                .stream()
                .map(item -> item.id)
                .toList();
        if (sceneItemIds.isEmpty()) {
            return false;
        }
        Set<Long> targetIds = new HashSet<>(directoryIds);
        List<KnowledgeItemEntity> selectedItems = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                .in("scene_item_id", sceneItemIds)
                .isNotNull("select_dict_tree_ids")
                .ne("select_dict_tree_ids", ""));
        return selectedItems.stream().anyMatch(item -> containsDirectoryId(item.selectDictTreeIds, targetIds));
    }

    private static boolean containsDirectoryId(String value, Set<Long> targetIds) {
        if (value == null || value.isBlank()) {
            return false;
        }
        try {
            return containsDirectoryId(JSON.readValue(value, Object.class), targetIds);
        } catch (Exception ignored) {
            return containsDirectoryIdFallback(value, targetIds);
        }
    }

    private static boolean containsDirectoryId(Object value, Set<Long> targetIds) {
        if (value instanceof Number number) {
            return targetIds.contains(number.longValue());
        }
        if (value instanceof String text) {
            try {
                return targetIds.contains(Long.valueOf(text));
            } catch (Exception ignored) {
                return false;
            }
        }
        if (value instanceof List<?> list) {
            return list.stream().anyMatch(item -> containsDirectoryId(item, targetIds));
        }
        if (value instanceof Map<?, ?> map) {
            return map.values().stream().anyMatch(item -> containsDirectoryId(item, targetIds));
        }
        return false;
    }

    private static boolean containsDirectoryIdFallback(String value, Set<Long> targetIds) {
        Set<Long> tokens = new HashSet<>();
        for (String part : value.split("\\D+")) {
            if (part.isBlank()) {
                continue;
            }
            try {
                tokens.add(Long.valueOf(part));
            } catch (Exception ignored) {
                // Ignore malformed legacy fragments.
            }
        }
        return targetIds.stream().anyMatch(tokens::contains);
    }

    private Map<String, Object> planeDto(DictDirectoryEntity item) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.id);
        dto.put("isDisabled", Boolean.TRUE.equals(item.isDisabled));
        dto.put("name", item.name);
        dto.put("isUsed", Boolean.TRUE.equals(item.isUsed));
        dto.put("sortNumber", item.sortNumber == null ? 1 : item.sortNumber);
        return dto;
    }

    private TokenService.TokenUser resolveUser(String authorization) {
        try {
            return tokens.resolve(authorization);
        } catch (Exception ignored) {
            return new TokenService.TokenUser(0L, "");
        }
    }

    static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    static Long num(Object value) {
        return value instanceof Number number ? number.longValue() : Long.valueOf(String.valueOf(value));
    }

    static boolean bool(Object value) {
        return value instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(value));
    }

    private static Long normalizeParentId(Long parentId) {
        return parentId == null ? 0L : parentId;
    }

    private static void applyParentQuery(QueryWrapper<DictDirectoryEntity> query, Long parentId) {
        Long normalizedParentId = normalizeParentId(parentId);
        if (Objects.equals(normalizedParentId, 0L)) {
            query.and(wrapper -> wrapper.eq("parent_id", 0).or().isNull("parent_id"));
            return;
        }
        query.eq("parent_id", normalizedParentId);
    }
}
