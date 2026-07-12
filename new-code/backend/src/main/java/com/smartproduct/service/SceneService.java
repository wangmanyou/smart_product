package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.entity.DictTemplateEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.DictTemplateMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.ArrayList;
import java.util.stream.Collectors;

@Service
public class SceneService {
    private final SceneTemplateMapper templates;
    private final SceneItemMapper items;
    private final DictTemplateMapper dicts;
    private final KnowledgeMapper knowledge;
    private final KnowledgeItemMapper knowledgeItems;
    private final TokenService tokens;
    private final CurrentUserService currentUsers;
    private final AccessLogService accessLogs;

    public SceneService(SceneTemplateMapper templates, SceneItemMapper items, DictTemplateMapper dicts,
                        KnowledgeMapper knowledge, KnowledgeItemMapper knowledgeItems, TokenService tokens,
                        CurrentUserService currentUsers, AccessLogService accessLogs) {
        this.templates = templates;
        this.items = items;
        this.dicts = dicts;
        this.knowledge = knowledge;
        this.knowledgeItems = knowledgeItems;
        this.tokens = tokens;
        this.currentUsers = currentUsers;
        this.accessLogs = accessLogs;
    }

    public Map<String, Object> list(int pageNumber, int pageSize, String name, String disabled) {
        QueryWrapper<SceneTemplateEntity> query = new QueryWrapper<SceneTemplateEntity>().eq("del", 0);
        if (name != null && !name.isBlank()) {
            query.like("name", name);
        }
        if ("enabled".equals(disabled)) {
            query.eq("is_disabled", false);
        } else if ("disabled".equals(disabled)) {
            query.eq("is_disabled", true);
        }
        CurrentUser user = currentUsers.current();
        if (!user.admin()) {
            if (user.sceneTemplateIds().isEmpty()) {
                query.eq("id", -1);
            } else {
                query.in("id", user.sceneTemplateIds());
            }
        }
        query.orderByDesc("update_at").orderByDesc("id");
        Page<SceneTemplateEntity> page = templates.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        return Map.of("content", page.getRecords().stream().map(this::templateDto).toList(), "totalElements", page.getTotal());
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> request, String authorization) {
        validateSingleDictItem(request.get("sceneItem"));
        validateSingleTitleItem(request.get("sceneItem"));
        validateUsableDictItemsForCreate(request.get("sceneItem"));
        TokenService.TokenUser user = resolveUser(authorization);
        SceneTemplateEntity template = newTemplate(DictService.str(request.get("sceneName")), 0L, user);
        templates.insert(template);
        saveItems(template.id, request.get("sceneItem"));
        accessLogs.success("场景管理", "SCENE_CREATE", "SCENE_TEMPLATE", template.id, template.id,
                "新增场景：" + template.name);
        return Map.of("sceneTemplateId", template.id);
    }

    @Transactional
    public Map<String, Object> copy(Map<String, Object> request, String authorization) {
        Long sourceId = DictService.num(request.get("sceneTemplateId"));
        SceneTemplateEntity source = templates.selectById(sourceId);
        TokenService.TokenUser user = resolveUser(authorization);
        SceneTemplateEntity copied = newTemplate(DictService.str(request.get("sceneName")), sourceId, user);
        templates.insert(copied);
        List<SceneItemEntity> sourceItems = items.selectList(new QueryWrapper<SceneItemEntity>().eq("scene_template_id", source.id).eq("del", 0));
        validateUsableDictReferences(sourceItems);
        for (SceneItemEntity old : sourceItems) {
            SceneItemEntity item = new SceneItemEntity();
            item.name = old.name;
            item.sortNumber = old.sortNumber;
            item.type = old.type;
            item.dictTemplateId = old.dictTemplateId;
            item.sceneTemplateId = copied.id;
            item.del = 0;
            item.multiValue = old.multiValue;
            item.isHide = old.isHide;
            item.isRequired = old.isRequired;
            item.isSupportSearch = old.isSupportSearch;
            items.insert(item);
        }
        accessLogs.success("场景管理", "SCENE_COPY", "SCENE_TEMPLATE", copied.id, copied.id,
                "复制场景：" + copied.name);
        return Map.of("sceneTemplateId", copied.id);
    }

    @Transactional
    public void edit(Map<String, Object> request) {
        validateSingleDictItem(request.get("sceneItem"));
        validateSingleTitleItem(request.get("sceneItem"));
        Long id = DictService.num(request.get("sceneTemplateId"));
        validateUsableDictItemsForEdit(id, request.get("sceneItem"));
        validateSceneItemChanges(id, request.get("sceneItem"));
        List<String> migrations = migrateSceneItemValues(id, request.get("sceneItem"));
        templates.update(new UpdateWrapper<SceneTemplateEntity>()
                .eq("id", id)
                .set("name", DictService.str(request.get("sceneName")))
                .set("update_at", LocalDateTime.now()));
        saveItems(id, request.get("sceneItem"));
        if (!migrations.isEmpty()) {
            accessLogs.success("场景管理", "SCENE_FIELD_MIGRATE", "SCENE_TEMPLATE", id, id,
                    "迁移字段类型：" + String.join("；", migrations));
        }
        accessLogs.success("场景管理", "SCENE_UPDATE", "SCENE_TEMPLATE", id, id,
                "编辑场景：" + DictService.str(request.get("sceneName")));
    }

    public void editStatus(Map<String, Object> request) {
        Long id = DictService.num(request.get("sceneTemplateId"));
        boolean disabled = DictService.bool(request.get("isDisabled"));
        SceneTemplateEntity template = templates.selectById(id);
        templates.update(new UpdateWrapper<SceneTemplateEntity>()
                .eq("id", id)
                .set("is_disabled", disabled)
                .set("update_at", LocalDateTime.now()));
        accessLogs.success("场景管理", "SCENE_STATUS", "SCENE_TEMPLATE", id, id,
                (disabled ? "禁用场景：" : "启用场景：") + (template == null ? id : template.name));
    }

    @Transactional
    public void deleteItem(Long sceneItemId) {
        SceneItemEntity item = items.selectById(sceneItemId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "场景字段不存在或已删除");
        }
        List<KnowledgeItemEntity> fieldValues = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                .eq("scene_item_id", sceneItemId));
        long usedKnowledgeCount = fieldValues.stream()
                .filter(SceneService::hasKnowledgeItemValue)
                .map(value -> value.knowledgeId)
                .distinct()
                .count();
        if (usedKnowledgeCount > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(),
                    "该字段已有 " + usedKnowledgeCount + " 条知识填写了内容，不能删除，请先清空或迁移字段数据");
        }
        knowledgeItems.delete(new QueryWrapper<KnowledgeItemEntity>().eq("scene_item_id", sceneItemId));
        items.deleteById(sceneItemId);
        accessLogs.success("场景管理", "SCENE_ITEM_DELETE", "SCENE_ITEM", sceneItemId,
                item.sceneTemplateId, "删除场景字段：" + item.name);
    }

    public Map<String, Object> requiredEligibility(Long sceneItemId) {
        SceneItemEntity item = items.selectById(sceneItemId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "场景字段不存在或已删除");
        }
        long missingKnowledgeCount = missingKnowledgeValueCount(item.sceneTemplateId, item);
        return Map.of(
                "canSetRequired", missingKnowledgeCount == 0,
                "missingKnowledgeCount", missingKnowledgeCount
        );
    }

    public Map<String, Object> typeMigrationPreview(Long sceneItemId, String targetType) {
        SceneItemEntity item = items.selectById(sceneItemId);
        if (item == null) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "场景字段不存在或已删除");
        }
        if (!isSafeTypeConversion(item.type, targetType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "不支持该字段类型转换");
        }
        List<KnowledgeItemEntity> values = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                .eq("scene_item_id", sceneItemId));
        long affected = values.stream().filter(SceneService::hasKnowledgeItemValue).count();
        long invalid = values.stream()
                .filter(SceneService::hasKnowledgeItemValue)
                .filter(value -> {
                    try {
                        convertKnowledgeValue(value.sceneItemValue, item.type, targetType, item.name);
                        return false;
                    } catch (ApiException ex) {
                        return true;
                    }
                })
                .count();
        return Map.of(
                "sceneItemId", sceneItemId,
                "fieldName", item.name,
                "sourceType", item.type,
                "targetType", targetType,
                "affectedKnowledgeCount", affected,
                "invalidKnowledgeCount", invalid,
                "canMigrate", invalid == 0
        );
    }

    public Map<String, Object> logs(String action, int pageNumber, int pageSize, String order) {
        CurrentUser user = currentUsers.current();
        if (!user.hasPermission(com.smartproduct.security.PermissionCodes.SYSTEM_SCENE_MANAGE)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有查看场景操作记录的权限");
        }
        return accessLogs.sceneLogs(action, pageNumber, pageSize, order);
    }

    public Map<String, Object> detail(Long sceneTemplateId) {
        CurrentUser user = currentUsers.current();
        if (!user.canAccessScene(sceneTemplateId)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有该场景的数据权限");
        }
        SceneTemplateEntity template = templates.selectById(sceneTemplateId);
        List<SceneItemEntity> sceneItems = items.selectList(new QueryWrapper<SceneItemEntity>()
                .eq("scene_template_id", sceneTemplateId)
                .eq("del", 0)
                .orderByAsc("sort_number").orderByAsc("id"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sceneItem", sceneItems.stream().map(this::itemDto).toList());
        result.put("sceneTemplateDetail", templateDto(template));
        return result;
    }

    private SceneTemplateEntity newTemplate(String name, Long copyFromId, TokenService.TokenUser user) {
        LocalDateTime now = LocalDateTime.now();
        SceneTemplateEntity template = new SceneTemplateEntity();
        template.copyFromId = copyFromId;
        template.name = name;
        template.isBuiltin = false;
        template.isDisabled = false;
        template.isUsed = false;
        template.creatorId = user.userId();
        template.creatorName = user.userAccount();
        template.createAt = now;
        template.updateAt = now;
        template.del = 0;
        return template;
    }

    private void saveItems(Long sceneTemplateId, Object value) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map)) {
                continue;
            }
            Long id = map.get("id") == null ? 0L : DictService.num(map.get("id"));
            SceneItemEntity item = new SceneItemEntity();
            item.name = DictService.str(map.get("sceneItemName"));
            item.type = DictService.str(map.get("type"));
            item.dictTemplateId = map.get("dictTemplateId") == null ? 0L : DictService.num(map.get("dictTemplateId"));
            item.sceneTemplateId = sceneTemplateId;
            item.sortNumber = map.get("sortNumber") == null ? 1L : DictService.num(map.get("sortNumber"));
            item.multiValue = DictService.bool(map.get("multiValue"));
            item.isHide = DictService.bool(map.get("isHide"));
            item.isRequired = DictService.bool(map.get("isRequired"));
            item.isSupportSearch = map.get("isSupportSearch") == null || DictService.bool(map.get("isSupportSearch"));
            if ("title".equals(item.type)) {
                item.multiValue = false;
                item.isHide = false;
                item.isSupportSearch = true;
            }
            item.del = 0;
            if (id == 0L) {
                items.insert(item);
            } else {
                item.id = id;
                items.updateById(item);
            }
        }
    }

    private void validateSingleDictItem(Object value) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        long dictCount = list.stream()
                .filter(one -> one instanceof Map<?, ?> map && "dict".equals(DictService.str(map.get("type"))))
                .count();
        if (dictCount > 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "每个场景只能配置一个目录字段");
        }
    }

    private void validateSingleTitleItem(Object value) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        long titleCount = list.stream()
                .filter(one -> one instanceof Map<?, ?> map && "title".equals(DictService.str(map.get("type"))))
                .count();
        if (titleCount > 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "每个场景只能配置一个标题字段");
        }
    }

    private void validateUsableDictItemsForCreate(Object value) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        for (Object one : list) {
            if (one instanceof Map<?, ?> map && "dict".equals(DictService.str(map.get("type")))) {
                validateUsableDict(optionalId(map.get("dictTemplateId")));
            }
        }
    }

    private void validateUsableDictItemsForEdit(Long sceneTemplateId, Object value) {
        if (!(value instanceof List<?> list)) {
            return;
        }
        Map<Long, SceneItemEntity> currentItems = items.selectList(new QueryWrapper<SceneItemEntity>()
                        .eq("scene_template_id", sceneTemplateId)
                        .eq("del", 0))
                .stream()
                .collect(Collectors.toMap(item -> item.id, item -> item, (a, b) -> a));
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map) || !"dict".equals(DictService.str(map.get("type")))) {
                continue;
            }
            Long itemId = optionalId(map.get("id"));
            Long nextDictTemplateId = optionalId(map.get("dictTemplateId"));
            SceneItemEntity current = currentItems.get(itemId);
            boolean newOrChangedDict = current == null
                    || !"dict".equals(current.type)
                    || !Objects.equals(normalizeId(current.dictTemplateId), normalizeId(nextDictTemplateId));
            if (newOrChangedDict) {
                validateUsableDict(nextDictTemplateId);
            }
        }
    }

    private void validateUsableDictReferences(List<SceneItemEntity> sourceItems) {
        for (SceneItemEntity item : sourceItems) {
            if ("dict".equals(item.type)) {
                validateUsableDict(item.dictTemplateId);
            }
        }
    }

    private void validateUsableDict(Long dictTemplateId) {
        if (dictTemplateId == null || dictTemplateId <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "请选择目录类型");
        }
        DictTemplateEntity dict = dicts.selectOne(new QueryWrapper<DictTemplateEntity>()
                .eq("id", dictTemplateId)
                .eq("del", 0)
                .last("limit 1"));
        if (dict == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "目录不存在或已删除");
        }
        if (Boolean.TRUE.equals(dict.isDisabled)) {
            throw new ApiException(HttpStatus.BAD_REQUEST.value(), "已禁用的目录不能配置到场景");
        }
    }

    private void validateSceneItemChanges(Long sceneTemplateId, Object value) {
        if (sceneTemplateId == null || !hasKnowledge(sceneTemplateId) || !(value instanceof List<?> list)) {
            return;
        }
        Map<Long, SceneItemEntity> currentItems = items.selectList(new QueryWrapper<SceneItemEntity>()
                        .eq("scene_template_id", sceneTemplateId)
                        .eq("del", 0))
                .stream()
                .collect(Collectors.toMap(item -> item.id, item -> item, (a, b) -> a));
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map)) {
                continue;
            }
            Long itemId = map.get("id") == null ? 0L : DictService.num(map.get("id"));
            boolean nextRequired = DictService.bool(map.get("isRequired"));
            if (itemId == 0L) {
                if (nextRequired) {
                    throw new ApiException(HttpStatus.BAD_REQUEST.value(), "场景已有知识，新增字段不能直接设为必填，请先新增为非必填并补全历史知识后再改为必填");
                }
                continue;
            }

            SceneItemEntity current = currentItems.get(itemId);
            if (current == null) {
                continue;
            }
            String nextType = DictService.str(map.get("type"));
            if (!Objects.equals(current.type, nextType) && !isSafeTypeConversion(current.type, nextType)) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "场景已有知识，字段类型不能修改");
            }
            Long nextDictTemplateId = map.get("dictTemplateId") == null ? 0L : DictService.num(map.get("dictTemplateId"));
            if ("dict".equals(current.type) && !Objects.equals(normalizeId(current.dictTemplateId), normalizeId(nextDictTemplateId))) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), "场景已有知识，目录字段不能修改");
            }
            if (!Boolean.TRUE.equals(current.isRequired) && nextRequired && !allKnowledgeHasValue(sceneTemplateId, current)) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), current.name + "存在未填写的历史知识，请先补全后再设为必填");
            }
        }
    }

    private static boolean isTextTitleConversion(String currentType, String nextType) {
        return ("text".equals(currentType) || "title".equals(currentType))
                && ("text".equals(nextType) || "title".equals(nextType));
    }

    private boolean hasKnowledge(Long sceneTemplateId) {
        return sceneTemplateId != null && knowledge.selectCount(new QueryWrapper<KnowledgeEntity>()
                .eq("scene_template_id", sceneTemplateId)
                .eq("del", 0)) > 0;
    }

    private boolean allKnowledgeHasValue(Long sceneTemplateId, SceneItemEntity sceneItem) {
        return missingKnowledgeValueCount(sceneTemplateId, sceneItem) == 0;
    }

    private static boolean isSafeTypeConversion(String currentType, String nextType) {
        return isTextTitleConversion(currentType, nextType)
                || "text".equals(currentType) && ("richtext".equals(nextType) || "tag".equals(nextType));
    }

    private List<String> migrateSceneItemValues(Long sceneTemplateId, Object value) {
        if (sceneTemplateId == null || !(value instanceof List<?> list)) {
            return List.of();
        }
        Map<Long, SceneItemEntity> currentItems = items.selectList(new QueryWrapper<SceneItemEntity>()
                        .eq("scene_template_id", sceneTemplateId)
                        .eq("del", 0))
                .stream()
                .collect(Collectors.toMap(item -> item.id, item -> item, (a, b) -> a));
        List<String> migrations = new ArrayList<>();
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map) || map.get("id") == null) {
                continue;
            }
            Long itemId = DictService.num(map.get("id"));
            SceneItemEntity current = currentItems.get(itemId);
            String nextType = DictService.str(map.get("type"));
            if (current == null || Objects.equals(current.type, nextType)) {
                continue;
            }
            if (!isSafeTypeConversion(current.type, nextType)) {
                continue;
            }
            List<KnowledgeItemEntity> values = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                    .eq("scene_item_id", current.id));
            List<ConvertedKnowledgeValue> converted = new ArrayList<>();
            for (KnowledgeItemEntity item : values) {
                converted.add(new ConvertedKnowledgeValue(item, convertKnowledgeValue(item.sceneItemValue, current.type, nextType, current.name)));
            }
            for (ConvertedKnowledgeValue conversion : converted) {
                conversion.item.sceneItemValue = conversion.value;
                knowledgeItems.updateById(conversion.item);
            }
            long affected = values.stream().filter(SceneService::hasKnowledgeItemValue).count();
            migrations.add(current.name + "：" + current.type + " → " + nextType + "（" + affected + " 条）");
        }
        return migrations;
    }

    private static String convertKnowledgeValue(String value, String currentType, String nextType, String fieldName) {
        String source = value == null ? "" : value;
        if (source.isBlank()) {
            return "";
        }
        if ("text".equals(currentType) && "title".equals(nextType)) {
            String title = org.jsoup.Jsoup.parse(source).text().trim();
            if (title.length() > 120) {
                throw new ApiException(HttpStatus.BAD_REQUEST.value(), fieldName + "存在超过 120 个字符的历史值，不能迁移为标题");
            }
            return title;
        }
        if ("text".equals(currentType) && "richtext".equals(nextType)) {
            return plainTextToRichText(source);
        }
        if ("text".equals(currentType) && "tag".equals(nextType)) {
            return java.util.Arrays.stream(source.split("[,，、]+"))
                    .map(String::trim)
                    .filter(item -> !item.isBlank())
                    .distinct()
                    .collect(Collectors.joining(","));
        }
        return source;
    }

    private static String plainTextToRichText(String value) {
        return java.util.Arrays.stream(value.replace("\r\n", "\n").replace('\r', '\n').split("\n", -1))
                .map(SceneService::escapeHtml)
                .map(line -> line.isBlank() ? "<p><br></p>" : "<p>" + line + "</p>")
                .collect(Collectors.joining());
    }

    private static String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private record ConvertedKnowledgeValue(KnowledgeItemEntity item, String value) {
    }

    private long missingKnowledgeValueCount(Long sceneTemplateId, SceneItemEntity sceneItem) {
        Set<Long> activeKnowledgeIds = knowledge.selectList(new QueryWrapper<KnowledgeEntity>()
                        .eq("scene_template_id", sceneTemplateId)
                        .eq("del", 0))
                .stream()
                .map(row -> row.id)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (activeKnowledgeIds.isEmpty()) {
            return 0;
        }
        Set<Long> filledKnowledgeIds = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                        .eq("scene_item_id", sceneItem.id))
                .stream()
                .filter(value -> activeKnowledgeIds.contains(value.knowledgeId))
                .filter(value -> hasSceneItemValue(sceneItem, value))
                .map(value -> value.knowledgeId)
                .collect(Collectors.toSet());
        return activeKnowledgeIds.size() - filledKnowledgeIds.size();
    }

    private static boolean hasSceneItemValue(SceneItemEntity sceneItem, KnowledgeItemEntity value) {
        if (value == null) {
            return false;
        }
        String raw = "dict".equals(sceneItem.type) ? value.selectDictTreeIds : value.sceneItemValue;
        return hasStoredValue(raw);
    }

    private static boolean hasKnowledgeItemValue(KnowledgeItemEntity value) {
        return value != null
                && (hasStoredValue(value.sceneItemValue) || hasStoredValue(value.selectDictTreeIds));
    }

    private static boolean hasStoredValue(String raw) {
        return raw != null && !raw.isBlank() && !"[]".equals(raw.trim());
    }

    private static Long optionalId(Object value) {
        String text = DictService.str(value);
        return text.isBlank() ? 0L : DictService.num(value);
    }

    private static Long normalizeId(Long value) {
        return value == null ? 0L : value;
    }

    private Map<String, Object> templateDto(SceneTemplateEntity item) {
        if (item == null) {
            return Map.of();
        }
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("sceneTemplateId", item.id);
        dto.put("sceneName", item.name);
        dto.put("sceneIsDisabled", Boolean.TRUE.equals(item.isDisabled));
        dto.put("sceneIsUsed", Boolean.TRUE.equals(item.isUsed));
        dto.put("creatorName", item.creatorName);
        dto.put("updateTime", item.updateAt == null ? null : item.updateAt.atZone(ZoneId.systemDefault()).toEpochSecond());
        return dto;
    }

    private Map<String, Object> itemDto(SceneItemEntity item) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.id);
        dto.put("type", item.type);
        dto.put("dictTemplateId", item.dictTemplateId);
        DictTemplateEntity dict = item.dictTemplateId == null || item.dictTemplateId == 0 ? null : dicts.selectById(item.dictTemplateId);
        dto.put("dictTemplateName", dict == null ? "" : dict.name);
        dto.put("multiValue", Boolean.TRUE.equals(item.multiValue));
        dto.put("isHide", Boolean.TRUE.equals(item.isHide));
        dto.put("isRequired", Boolean.TRUE.equals(item.isRequired));
        dto.put("isSupportSearch", Boolean.TRUE.equals(item.isSupportSearch));
        dto.put("sortNumber", item.sortNumber);
        dto.put("sceneItemName", item.name);
        return dto;
    }

    private TokenService.TokenUser resolveUser(String authorization) {
        try {
            return tokens.resolve(authorization);
        } catch (Exception ignored) {
            return new TokenService.TokenUser(0L, "");
        }
    }
}
