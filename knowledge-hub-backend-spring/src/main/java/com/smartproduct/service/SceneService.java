package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.entity.DictTemplateEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.DictTemplateMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SceneService {
    private final SceneTemplateMapper templates;
    private final SceneItemMapper items;
    private final DictTemplateMapper dicts;
    private final TokenService tokens;

    public SceneService(SceneTemplateMapper templates, SceneItemMapper items, DictTemplateMapper dicts, TokenService tokens) {
        this.templates = templates;
        this.items = items;
        this.dicts = dicts;
        this.tokens = tokens;
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
        query.orderByDesc("update_at").orderByDesc("id");
        Page<SceneTemplateEntity> page = templates.selectPage(Page.of(Math.max(pageNumber, 1), Math.max(pageSize, 1)), query);
        return Map.of("content", page.getRecords().stream().map(this::templateDto).toList(), "totalElements", page.getTotal());
    }

    @Transactional
    public Map<String, Object> create(Map<String, Object> request, String authorization) {
        TokenService.TokenUser user = resolveUser(authorization);
        SceneTemplateEntity template = newTemplate(DictService.str(request.get("sceneName")), 0L, user);
        templates.insert(template);
        saveItems(template.id, request.get("sceneItem"));
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
        return Map.of("sceneTemplateId", copied.id);
    }

    @Transactional
    public void edit(Map<String, Object> request) {
        Long id = DictService.num(request.get("sceneTemplateId"));
        templates.update(new UpdateWrapper<SceneTemplateEntity>()
                .eq("id", id)
                .set("name", DictService.str(request.get("sceneName")))
                .set("update_at", LocalDateTime.now()));
        saveItems(id, request.get("sceneItem"));
    }

    public void editStatus(Map<String, Object> request) {
        templates.update(new UpdateWrapper<SceneTemplateEntity>()
                .eq("id", DictService.num(request.get("sceneTemplateId")))
                .set("is_disabled", DictService.bool(request.get("isDisabled")))
                .set("update_at", LocalDateTime.now()));
    }

    public void deleteItem(Long sceneItemId) {
        items.deleteById(sceneItemId);
    }

    public Map<String, Object> detail(Long sceneTemplateId) {
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
            item.del = 0;
            if (id == 0L) {
                items.insert(item);
            } else {
                item.id = id;
                items.updateById(item);
            }
        }
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
