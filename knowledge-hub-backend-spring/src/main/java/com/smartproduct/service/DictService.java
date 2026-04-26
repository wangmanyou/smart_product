package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.smartproduct.entity.DictDirectoryEntity;
import com.smartproduct.entity.DictTemplateEntity;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.DictTemplateMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DictService {
    private final DictTemplateMapper templates;
    private final DictDirectoryMapper directories;
    private final TokenService tokens;

    public DictService(DictTemplateMapper templates, DictDirectoryMapper directories, TokenService tokens) {
        this.templates = templates;
        this.directories = directories;
        this.tokens = tokens;
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
    }

    public void editStatus(Map<String, Object> request) {
        templates.update(new UpdateWrapper<DictTemplateEntity>()
                .eq("id", num(request.get("dictTemplateId")))
                .set("is_disabled", bool(request.get("isDisabled")))
                .set("update_at", LocalDateTime.now()));
    }

    public void editDirectoryName(Map<String, Object> request) {
        directories.update(new UpdateWrapper<DictDirectoryEntity>()
                .eq("id", num(request.get("dictDirectoryId")))
                .set("name", str(request.get("dictDirectoryName")))
                .set("update_at", LocalDateTime.now()));
    }

    public void editDirectoryStatus(Map<String, Object> request) {
        List<Long> ids = childIds(num(request.get("dictDirectoryId")));
        directories.update(new UpdateWrapper<DictDirectoryEntity>()
                .in("id", ids)
                .set("is_disabled", bool(request.get("isDisabled")))
                .set("update_at", LocalDateTime.now()));
    }

    public void deleteDirectory(Long id) {
        directories.deleteBatchIds(childIds(id));
    }

    public Map<String, Object> detail(Long id) {
        DictTemplateEntity template = templates.selectOne(new QueryWrapper<DictTemplateEntity>().eq("id", id).eq("del", 0));
        List<DictDirectoryEntity> items = directories.selectList(new QueryWrapper<DictDirectoryEntity>()
                .eq("dict_template_id", id)
                .eq("del", 0)
                .orderByAsc("level").orderByAsc("id"));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("dictTemplate", templateDto(template));
        result.put("treeDict", Map.of("treeDict", buildTree(items, 0L)));
        result.put("planeDict", Map.of("planeDict", items.stream().map(this::planeDto).toList()));
        return result;
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
        item.isDisabled = bool(map.get("isDisabled"));
        item.isUsed = false;
        item.createAt = now;
        item.updateAt = now;
        item.del = 0;
        directories.insert(item);
        return item;
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
        dto.put("dictIsUsed", Boolean.TRUE.equals(item.isUsed));
        return dto;
    }

    private Map<String, Object> planeDto(DictDirectoryEntity item) {
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("id", item.id);
        dto.put("isDisabled", Boolean.TRUE.equals(item.isDisabled));
        dto.put("name", item.name);
        dto.put("isUsed", Boolean.TRUE.equals(item.isUsed));
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
}
