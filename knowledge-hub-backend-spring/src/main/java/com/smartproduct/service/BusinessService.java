package com.smartproduct.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.entity.KnowledgeItemEntity;
import com.smartproduct.entity.SceneItemEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.KnowledgeItemMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import com.smartproduct.mapper.SceneItemMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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
    private static final Path FILE_ROOT = Path.of("target", "uploads");
    private static final String FILE_PREFIX = "/data";
    private static final Pattern SCENE_ITEM_ID_PATTERN = Pattern.compile("\\((\\d+)\\)");
    private static final DateTimeFormatter SECOND_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final KnowledgeMapper knowledge;
    private final KnowledgeItemMapper knowledgeItems;
    private final SceneItemMapper sceneItems;
    private final SceneTemplateMapper scenes;
    private final SceneService sceneService;
    private final DictService dictService;
    private final TokenService tokens;

    public BusinessService(KnowledgeMapper knowledge, KnowledgeItemMapper knowledgeItems, SceneItemMapper sceneItems,
                           SceneTemplateMapper scenes, SceneService sceneService, DictService dictService, TokenService tokens) {
        this.knowledge = knowledge;
        this.knowledgeItems = knowledgeItems;
        this.sceneItems = sceneItems;
        this.scenes = scenes;
        this.sceneService = sceneService;
        this.dictService = dictService;
        this.tokens = tokens;
    }

    public Map<String, Object> businessDetail(Long sceneTemplateId) {
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
        TokenService.TokenUser user = resolveUser(authorization);
        LocalDateTime now = LocalDateTime.now();
        KnowledgeEntity row = new KnowledgeEntity();
        row.sceneTemplateId = DictService.num(request.get("sceneTemplateId"));
        row.viewTime = 0L;
        row.creatorId = user.userId();
        row.creatorName = user.userAccount();
        row.createAt = now;
        row.updateAt = now;
        row.del = 0;
        knowledge.insert(row);
        saveKnowledgeItems(row.id, row.sceneTemplateId, request.get("knowledge"), true);
        scenes.update(new UpdateWrapper<SceneTemplateEntity>().eq("id", row.sceneTemplateId).set("is_used", true));
        return Map.of("knowledgeId", row.id);
    }

    @Transactional
    public void editKnowledge(Map<String, Object> request) {
        Long id = DictService.num(request.get("knowledgeId"));
        KnowledgeEntity row = knowledge.selectById(id);
        knowledge.update(new UpdateWrapper<KnowledgeEntity>().eq("id", id).set("update_at", LocalDateTime.now()));
        saveKnowledgeItems(id, row == null ? null : row.sceneTemplateId, request.get("knowledgeItem"), false);
    }

    @Transactional
    public void deleteKnowledge(Long knowledgeId) {
        KnowledgeEntity row = knowledge.selectById(knowledgeId);
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

    public Map<String, Object> list(Map<String, Object> request) {
        QueryWrapper<KnowledgeEntity> query = new QueryWrapper<KnowledgeEntity>()
                .eq("del", 0)
                .eq("scene_template_id", DictService.num(request.get("sceneTemplateId")));
        if (request.get("searchCreatorId") != null && !DictService.str(request.get("searchCreatorId")).isBlank()) {
            query.eq("creator_id", DictService.num(request.get("searchCreatorId")));
        }
        applyTimeRange(query, "update_at", request.get("searchUpdateTime"));
        applyTimeRange(query, "create_at", request.get("searchCreateTime"));
        List<Long> matchedKnowledgeIds = matchedKnowledgeIds(request.get("searchKnowledgeItem"));
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

    public Map<String, Object> templateExport(Long sceneTemplateId) {
        SceneTemplateEntity scene = scenes.selectById(sceneTemplateId);
        List<SceneItemEntity> headers = exportableTemplateHeaders(sceneTemplateId);
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Sheet1");
            Row headerRow = sheet.createRow(0);
            Row exampleRow = sheet.createRow(1);
            for (int i = 0; i < headers.size(); i++) {
                SceneItemEntity header = headers.get(i);
                headerRow.createCell(i).setCellValue(header.name + "(" + header.id + ")");
                setCellValue(exampleRow.createCell(i), exampleValue(header.type));
            }
            return Map.of("filePath", writeWorkbook(workbook, (scene == null ? "business" : scene.name) + "_知识导入模版示例.xlsx"));
        } catch (IOException ex) {
            throw new IllegalStateException("导出知识模板失败", ex);
        }
    }

    public Map<String, Object> dataExport(Long sceneTemplateId) {
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
    public void dataImport(Map<String, Object> request, String authorization) {
        Long sceneTemplateId = DictService.num(request.get("sceneTemplateId"));
        Path source = toLocalFile(DictService.str(request.get("filePath")));
        try (InputStream input = Files.newInputStream(source); Workbook workbook = new XSSFWorkbook(input)) {
            Sheet sheet = workbook.getSheet("Sheet1");
            if (sheet == null) {
                return;
            }
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return;
            }
            List<Long> sceneItemIds = new ArrayList<>();
            for (int col = 0; col < headerRow.getLastCellNum(); col++) {
                Matcher matcher = SCENE_ITEM_ID_PATTERN.matcher(cellString(headerRow.getCell(col)));
                sceneItemIds.add(matcher.find() ? Long.parseLong(matcher.group(1)) : null);
            }
            Map<Long, SceneItemEntity> itemMap = sceneItems.selectList(new QueryWrapper<SceneItemEntity>()
                            .eq("scene_template_id", sceneTemplateId)
                            .eq("del", 0))
                    .stream()
                    .collect(Collectors.toMap(item -> item.id, item -> item, (a, b) -> a));
            for (int rowIndex = 1; rowIndex <= sheet.getLastRowNum(); rowIndex++) {
                Row excelRow = sheet.getRow(rowIndex);
                if (excelRow == null) {
                    continue;
                }
                List<Map<String, Object>> items = new ArrayList<>();
                for (int col = 0; col < sceneItemIds.size(); col++) {
                    Long sceneItemId = sceneItemIds.get(col);
                    if (sceneItemId == null) {
                        continue;
                    }
                    SceneItemEntity sceneItem = itemMap.get(sceneItemId);
                    String value = cellString(excelRow.getCell(col));
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("sceneItemId", sceneItemId);
                    if (sceneItem != null && "dict".equals(sceneItem.type)) {
                        item.put("sceneItemValue", List.of());
                        item.put("sceneItemSelectDictTreeIds", value);
                    } else if (sceneItem != null && "text".equals(sceneItem.type)) {
                        item.put("sceneItemValue", value.isEmpty() ? List.of() : List.of(value));
                    } else {
                        item.put("sceneItemValue", splitValue(value));
                    }
                    items.add(item);
                }
                if (!items.isEmpty()) {
                    Map<String, Object> add = new LinkedHashMap<>();
                    add.put("sceneTemplateId", sceneTemplateId);
                    add.put("knowledge", items);
                    addKnowledge(add, authorization);
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("导入知识数据失败", ex);
        }
    }

    public Map<String, Object> statisticsKnowledge(List<String> searchCreateTime) {
        List<SceneTemplateEntity> sceneList = scenes.selectList(new QueryWrapper<SceneTemplateEntity>().eq("del", 0));
        List<Map<String, Object>> content = sceneList.stream().map(scene -> {
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

    public Map<String, Object> statisticsCreator(Long sceneTemplateId) {
        List<KnowledgeEntity> rows = knowledge.selectList(new QueryWrapper<KnowledgeEntity>().eq("scene_template_id", sceneTemplateId).eq("del", 0));
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
            KnowledgeItemEntity item = knowledgeItems.selectOne(new QueryWrapper<KnowledgeItemEntity>()
                    .eq("knowledge_id", knowledgeId)
                    .eq("scene_item_id", sceneItemId)
                    .last("limit 1"));
            if (item == null) {
                item = new KnowledgeItemEntity();
            }
            item.knowledgeId = knowledgeId;
            item.sceneItemId = sceneItemId;
            item.sceneItemValue = joinValue(map.get("sceneItemValue"));
            Object dictIds = map.get("sceneItemSelectDictTreeIds");
            if (dictIds == null) {
                dictIds = map.get("sceneItemSelectDictIds");
            }
            item.selectDictTreeIds = normalizeDictIds(DictService.str(dictIds));
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
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("sceneItemId", value.sceneItemId);
            dto.put("sceneItemType", sceneItem == null ? "" : sceneItem.type);
            dto.put("sceneItemValue", "text".equals(sceneItem == null ? "" : sceneItem.type)
                    ? textValue(value.sceneItemValue)
                    : splitValue(value.sceneItemValue));
            dto.put("sceneItemSelectDictTreeIds", normalizeDictIds(value.selectDictTreeIds));
            dto.put("sceneItemName", sceneItem == null ? "" : sceneItem.name);
            return dto;
        }).toList();
        Map<String, Object> dto = new LinkedHashMap<>();
        dto.put("knowledgeShow", show);
        for (Map<String, Object> item : show) {
            dto.put(String.valueOf(item.get("sceneItemId")), item);
        }
        dto.put("knowledgeId", row.id);
        dto.put("creatorName", row.creatorName);
        dto.put("viewTime", row.viewTime);
        dto.put("updateTime", epoch(row.updateAt));
        dto.put("createTime", epoch(row.createAt));
        return dto;
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

    private List<SceneItemEntity> exportableTemplateHeaders(Long sceneTemplateId) {
        return visibleSceneItems(sceneTemplateId).stream()
                .filter(item -> !"dict".equals(item.type))
                .filter(item -> List.of("text", "integer", "decimal", "datetime").contains(item.type))
                .toList();
    }

    private static Object exampleValue(String type) {
        return switch (type) {
            case "integer" -> 1;
            case "decimal" -> 1.1;
            case "datetime" -> "2025-01-02";
            default -> "example-text";
        };
    }

    private static void setCellValue(Cell cell, Object value) {
        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
        } else {
            cell.setCellValue(Objects.toString(value, ""));
        }
    }

    private static String writeWorkbook(Workbook workbook, String filename) throws IOException {
        Files.createDirectories(FILE_ROOT);
        Path target = FILE_ROOT.resolve(filename);
        try (OutputStream output = Files.newOutputStream(target)) {
            workbook.write(output);
        }
        return FILE_PREFIX + "/" + FILE_ROOT.relativize(target).toString().replace('\\', '/');
    }

    private static Path toLocalFile(String filePath) {
        String relative = filePath == null ? "" : filePath;
        if (relative.startsWith(FILE_PREFIX)) {
            relative = relative.substring(FILE_PREFIX.length());
        }
        while (relative.startsWith("/") || relative.startsWith("\\")) {
            relative = relative.substring(1);
        }
        return FILE_ROOT.resolve(relative);
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
        Set<Long> ids = new HashSet<>();
        boolean hasFilter = false;
        for (Object one : list) {
            if (!(one instanceof Map<?, ?> map)) {
                continue;
            }
            Long sceneItemId = DictService.num(map.get("sceneItemId"));
            String joined = joinValue(map.get("sceneItemValue"));
            String dictId = DictService.str(map.get("sceneItemSelectDictIds"));
            if (dictId.isBlank()) {
                dictId = DictService.str(map.get("sceneItemSelectDictTreeIds"));
            }
            if (joined.isBlank() && dictId.isBlank()) {
                continue;
            }
            hasFilter = true;
            QueryWrapper<KnowledgeItemEntity> query = new QueryWrapper<KnowledgeItemEntity>().eq("scene_item_id", sceneItemId);
            if (!joined.isBlank()) {
                query.apply("scene_item_value REGEXP {0}", joined.replace(",", "|"));
            }
            if (!dictId.isBlank()) {
                query.ne("select_dict_tree_ids", "");
                query.apply("JSON_CONTAINS(CAST(select_dict_tree_ids AS JSON), {0})", "\"" + dictId + "\"");
            }
            knowledgeItems.selectList(query).forEach(item -> ids.add(item.knowledgeId));
        }
        return hasFilter ? new ArrayList<>(ids) : null;
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
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime begin = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
            LocalDateTime end = begin.plusMonths(1).minusSeconds(1);
            query.ge("create_at", begin.format(SECOND_FORMAT));
            query.le("create_at", end.format(SECOND_FORMAT));
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
