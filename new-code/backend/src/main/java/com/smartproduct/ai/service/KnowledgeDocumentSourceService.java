package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.DictDirectoryEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.KnowledgeVersionEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.DictDirectoryMapper;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.KnowledgeVersionMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Reads one effective knowledge record without using the user-facing detail API.
 * In particular, preparing a RAG document must never increase view counters or
 * depend on the permissions of a background worker account.
 */
@Service
public class KnowledgeDocumentSourceService {
    private static final ObjectMapper JSON = new ObjectMapper();

    private final KnowledgeMapper knowledge;
    private final KnowledgeItemMapper knowledgeItems;
    private final KnowledgeVersionMapper knowledgeVersions;
    private final SceneTemplateMapper scenes;
    private final SceneItemMapper sceneItems;
    private final DictDirectoryMapper dictDirectories;
    private final KnowledgeDocumentFormatter formatter;

    public KnowledgeDocumentSourceService(KnowledgeMapper knowledge, KnowledgeItemMapper knowledgeItems,
                                          KnowledgeVersionMapper knowledgeVersions, SceneTemplateMapper scenes,
                                          SceneItemMapper sceneItems, DictDirectoryMapper dictDirectories,
                                          KnowledgeDocumentFormatter formatter) {
        this.knowledge = knowledge;
        this.knowledgeItems = knowledgeItems;
        this.knowledgeVersions = knowledgeVersions;
        this.scenes = scenes;
        this.sceneItems = sceneItems;
        this.dictDirectories = dictDirectories;
        this.formatter = formatter;
    }

    public Optional<PreparedDocument> prepare(Long knowledgeId) {
        if (knowledgeId == null || knowledgeId <= 0) {
            return Optional.empty();
        }
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
        if (row == null || row.del != null && row.del != 0 || row.sceneTemplateId == null) {
            return Optional.empty();
        }

        SceneTemplateEntity scene = scenes.selectById(row.sceneTemplateId);
        String sceneName = scene == null ? "场景 " + row.sceneTemplateId : scene.name;
        int version = currentVersion(knowledgeId);

        List<SceneItemEntity> definitions = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                        .eq("scene_template_id", row.sceneTemplateId)
                        .eq("del", 0)
                        .orderByAsc("sort_number")
                        .orderByAsc("id"))
                .stream()
                .filter(Objects::nonNull)
                .filter(item -> !Boolean.TRUE.equals(item.isHide))
                .toList();
        Map<Long, KnowledgeItemEntity> values = knowledgeItems.selectList(new QueryWrapper<KnowledgeItemEntity>()
                        .eq("knowledge_id", knowledgeId))
                .stream()
                .filter(item -> item != null && item.sceneItemId != null)
                .collect(Collectors.toMap(item -> item.sceneItemId, item -> item,
                        (first, ignored) -> first, LinkedHashMap::new));
        Map<Long, DictDirectoryEntity> directoryMap = loadDirectories(definitions);

        String title = null;
        List<String> tags = new ArrayList<>();
        List<KnowledgeDocumentFormatter.KnowledgeField> fields = new ArrayList<>();
        for (SceneItemEntity definition : definitions) {
            KnowledgeItemEntity value = values.get(definition.id);
            if (value == null) {
                continue;
            }
            String type = normalizeType(definition.type);
            String displayValue = displayValue(definition, value, directoryMap);
            if (displayValue.isBlank()) {
                continue;
            }
            if ("title".equals(type)) {
                if (title == null || title.isBlank()) {
                    title = displayValue;
                }
                continue;
            }
            if ("tag".equals(type)) {
                tags.addAll(splitTags(displayValue));
                continue;
            }
            fields.add(new KnowledgeDocumentFormatter.KnowledgeField(
                    fallback(definition.name, "字段 " + definition.id), type, displayValue));
        }

        KnowledgeDocumentFormatter.KnowledgeDocument source = new KnowledgeDocumentFormatter.KnowledgeDocument(
                row.id,
                row.sceneTemplateId,
                version,
                sceneName,
                title,
                row.creatorName,
                row.updateAt,
                fields,
                tags.stream().filter(value -> !value.isBlank()).distinct().toList()
        );
        KnowledgeDocumentFormatter.FormattedDocument formatted = formatter.format(source);
        return Optional.of(new PreparedDocument(
                row.id,
                row.sceneTemplateId,
                version,
                formatted.fileName(),
                formatted.markdown(),
                formatted.contentHash()
        ));
    }

    private int currentVersion(Long knowledgeId) {
        KnowledgeVersionEntity latest = knowledgeVersions.selectOne(new QueryWrapper<KnowledgeVersionEntity>()
                .eq("knowledge_id", knowledgeId)
                .orderByDesc("version_no")
                .orderByDesc("id")
                .last("limit 1"));
        return latest == null || latest.versionNo == null ? 1 : Math.max(latest.versionNo, 1);
    }

    private Map<Long, DictDirectoryEntity> loadDirectories(Collection<SceneItemEntity> definitions) {
        Set<Long> templateIds = definitions.stream()
                .filter(Objects::nonNull)
                .filter(item -> "dict".equalsIgnoreCase(item.type))
                .map(item -> item.dictTemplateId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (templateIds.isEmpty()) {
            return Map.of();
        }
        return dictDirectories.selectList(new QueryWrapper<DictDirectoryEntity>()
                        .in("dict_template_id", templateIds)
                        .eq("del", 0))
                .stream()
                .filter(item -> item != null && item.id != null)
                .collect(Collectors.toMap(item -> item.id, item -> item,
                        (first, ignored) -> first, LinkedHashMap::new));
    }

    private String displayValue(SceneItemEntity definition, KnowledgeItemEntity value,
                                Map<Long, DictDirectoryEntity> directoryMap) {
        if (!"dict".equalsIgnoreCase(definition.type)) {
            return value.sceneItemValue == null ? "" : value.sceneItemValue.trim();
        }
        List<Long> ids = directoryIds(firstNonBlank(value.selectDictTreeIds, value.sceneItemValue));
        return ids.stream()
                .map(id -> directoryPath(id, directoryMap))
                .filter(path -> !path.isBlank())
                .distinct()
                .collect(Collectors.joining("、"));
    }

    private static String directoryPath(Long id, Map<Long, DictDirectoryEntity> directories) {
        if (id == null || directories.isEmpty()) {
            return "";
        }
        List<String> names = new ArrayList<>();
        Set<Long> visited = new LinkedHashSet<>();
        Long current = id;
        while (current != null && current > 0 && visited.add(current) && visited.size() <= 100) {
            DictDirectoryEntity row = directories.get(current);
            if (row == null) {
                break;
            }
            if (row.name != null && !row.name.isBlank()) {
                names.add(0, row.name.trim());
            }
            current = row.parentId;
        }
        return String.join(" / ", names);
    }

    private static List<Long> directoryIds(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        LinkedHashSet<Long> ids = new LinkedHashSet<>();
        try {
            collectDirectoryIds(JSON.readTree(value), ids);
        } catch (Exception ignored) {
            for (String part : value.split("[,，、]")) {
                addDirectoryId(part, ids);
            }
        }
        return List.copyOf(ids);
    }

    private static void collectDirectoryIds(JsonNode node, Set<Long> target) {
        if (node == null || node.isNull()) {
            return;
        }
        if (node.isArray()) {
            node.forEach(child -> collectDirectoryIds(child, target));
            return;
        }
        if (node.isIntegralNumber()) {
            target.add(node.longValue());
            return;
        }
        if (node.isTextual()) {
            addDirectoryId(node.textValue(), target);
        }
    }

    private static void addDirectoryId(String value, Set<Long> target) {
        if (value == null) {
            return;
        }
        String text = value.trim();
        if (text.matches("\\d+")) {
            target.add(Long.parseLong(text));
        }
    }

    private static List<String> splitTags(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        return List.of(value.split("[,，、]+")).stream()
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private static String normalizeType(String value) {
        return value == null ? "text" : value.trim().toLowerCase();
    }

    private static String firstNonBlank(String first, String second) {
        return first == null || first.isBlank() ? second : first;
    }

    private static String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    public record PreparedDocument(
            Long knowledgeId,
            Long sceneTemplateId,
            int knowledgeVersion,
            String fileName,
            String markdown,
            String contentHash
    ) {
    }
}
