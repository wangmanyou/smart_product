# 知识库功能增强版本更新计划

## 1. 版本目标

本次版本升级围绕知识维护、批量导入、内容编辑和审计追踪展开，目标是在现有 `new-code` 系统基础上补齐以下能力：

- 各级目录支持排序，并同步到知识展示、目录筛选、知识新增/编辑选择、导入模板下拉选择等场景。
- 知识支持多标签，导入时按逗号、中文逗号、顿号拆分。
- 内容字段支持基础富文本编辑，包括加粗、颜色、下划线和基础排版。
- 批量导入知识时，支持选择导出普通模板或带目录模板。
- 带目录模板中，目录字段支持在 Excel 内下拉单选已有目录。
- 访问日志记录登录、退出、查看、增删改、导入、目录维护等操作。
- 知识更新记录记录每次知识变更的操作人、时间和变更摘要。
- 历史版本支持查看知识每次变更后的完整内容，后续可扩展版本对比和回溯。

## 2. 当前系统基础

当前新版主线位于 `new-code`：

- 后端：Spring Boot + MyBatis Plus。
- 前端：Umi Max + Ant Design。
- 知识主表：`knowledge`。
- 知识字段值表：`knowledge_item`。
- 目录模板表：`dict_template`。
- 目录内容表：`dict_directory`。
- 场景字段表：`scene_item`。
- 审批表：`knowledge_change_request`。
- 通知表：`notification`。

已有基础能力：

- 知识中心入口。
- 知识列表、详情、新增、编辑、删除。
- 目录树筛选。
- Excel 批量导入基础能力。
- 关键词搜索基础能力。
- 全局页签和未保存提醒。
- 角色、页面权限、操作权限、角色可见场景。
- 知识变更审批。
- 更新时间由系统自动维护。

本次主要补齐目录排序、目录下拉导入、标签、富文本、访问日志、知识版本追踪。

## 3. 数据库升级计划

建议新增升级脚本：

```text
new-code/db/002_knowledge_enhancement_upgrade.sql
```

### 3.1 目录排序字段

为 `dict_directory` 增加排序字段：

```sql
ALTER TABLE dict_directory
ADD COLUMN sort_number BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER level;
```

初始化规则：

- 按 `dict_template_id + parent_id + id` 对已有目录排序。
- 同级目录从 1 开始生成 `sort_number`。

### 3.2 知识内容字段扩容

为支持富文本和较长内容，将 `knowledge_item.scene_item_value` 扩容：

```sql
ALTER TABLE knowledge_item
MODIFY COLUMN scene_item_value MEDIUMTEXT NULL;
```

### 3.3 新增访问日志表

新增 `access_log`，用于系统审计：

```sql
CREATE TABLE IF NOT EXISTS access_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    user_account VARCHAR(100) NULL,
    module VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    biz_type VARCHAR(100) NULL,
    biz_id BIGINT UNSIGNED NULL,
    scene_template_id BIGINT UNSIGNED NULL,
    description VARCHAR(1000) NULL,
    request_method VARCHAR(20) NULL,
    request_path VARCHAR(500) NULL,
    ip_address VARCHAR(100) NULL,
    user_agent VARCHAR(500) NULL,
    result VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    error_message VARCHAR(1000) NULL,
    create_at DATETIME NOT NULL,
    INDEX idx_access_log_user_time (user_id, create_at),
    INDEX idx_access_log_action_time (action, create_at),
    INDEX idx_access_log_biz (biz_type, biz_id),
    INDEX idx_access_log_scene_time (scene_template_id, create_at)
);
```

### 3.4 新增知识历史版本表

新增 `knowledge_version`，同时支撑“更新记录”和“历史版本”：

```sql
CREATE TABLE IF NOT EXISTS knowledge_version (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    knowledge_id BIGINT UNSIGNED NOT NULL,
    scene_template_id BIGINT UNSIGNED NULL,
    version_no INT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    operator_id BIGINT UNSIGNED NULL,
    operator_name VARCHAR(100) NULL,
    change_summary VARCHAR(1000) NULL,
    before_snapshot_json LONGTEXT NULL,
    after_snapshot_json LONGTEXT NULL,
    create_at DATETIME NOT NULL,
    UNIQUE KEY uk_knowledge_version (knowledge_id, version_no),
    INDEX idx_knowledge_version_knowledge_time (knowledge_id, create_at),
    INDEX idx_knowledge_version_scene_time (scene_template_id, create_at)
);
```

说明：

- 不单独新增 `knowledge_update_record`。
- 更新记录可直接从 `knowledge_version` 的操作人、时间、摘要派生。
- 历史版本使用 `after_snapshot_json` 展示某一版完整内容。

### 3.5 权限补充

新增权限种子数据：

- `page:system:logs`：访问日志页面。
- `system:log:view`：查看访问日志。
- `knowledge:version:view`：查看知识历史版本。

## 4. 目录排序功能

### 4.1 后端改造

涉及模块：

- `DictDirectoryEntity`
- `DictService`
- `DictController`
- `DatabaseInitializer`

改造内容：

- `DictDirectoryEntity` 增加 `sortNumber` 字段。
- `DictService.detail()` 查询目录时按 `level + parent_id + sort_number + id` 排序。
- 创建目录项时自动设置同级最大 `sort_number + 1`。
- 新增目录排序接口：

```text
POST /v1/data/dict/directory/sort
```

请求示例：

```json
{
  "parentId": 0,
  "dictDirectoryIds": [3, 7, 11, 17]
}
```

处理规则：

- 只允许调整同一父级下的目录项。
- 后端按数组顺序更新 `sort_number`。
- 排序后更新目录模板 `update_at`。

### 4.2 前端改造

涉及页面：

- `DirectoryForm.tsx`
- `DirectoryDetail.tsx`
- `SceneKnowledge.tsx`
- `KnowledgeForm.tsx`

改造内容：

- 目录编辑页增加“上移 / 下移”按钮，或后续改成拖拽。
- 保存排序后刷新目录树。
- 知识列表左侧目录树按排序显示。
- 新增/编辑知识目录选择按排序显示。
- 导入模板目录下拉选项按排序显示。

### 4.3 验收标准

- 任意层级目录都能维护顺序。
- 同级目录保存后刷新不丢。
- 知识展示、筛选、选择、导入模板中的目录顺序一致。

## 5. 标签功能

### 5.1 字段类型设计

新增场景字段类型：

```text
tag
```

底层仍复用 `knowledge_item.scene_item_value` 存储，降低表结构改造风险。

### 5.2 后端规则

- 标签保存前去空格。
- 去除空标签。
- 去除重复标签。
- 导入时按以下符号拆分：
  - 英文逗号：`,`
  - 中文逗号：`，`
  - 顿号：`、`
- 标签参与关键词搜索。

示例：

```text
安全,操作规范、设备维护
```

导入后识别为：

```text
安全
操作规范
设备维护
```

### 5.3 前端改造

- 场景字段配置增加“标签”类型。
- 知识新增/编辑中，标签字段使用 `Select mode="tags"`。
- 知识详情中使用标签样式展示。
- 知识列表中标签可展示、可搜索。

### 5.4 兼容处理

当前已有名为“标签”的 `text` 字段，升级时建议：

- 将该字段类型改为 `tag`。
- 将是否必填调整为非必填。
- 老数据按逗号、中文逗号、顿号拆分后兼容展示。

### 5.5 验收标准

- 手动新增多个标签正常。
- Excel 导入标签可自动拆分。
- 标签在列表、详情、编辑页显示一致。
- 关键词搜索能搜索标签内容。

## 6. 基础富文本编辑

### 6.1 字段类型设计

新增场景字段类型：

```text
richtext
```

建议将当前“内容”字段从 `text` 调整为 `richtext`。

### 6.2 前端能力

富文本编辑器支持：

- 加粗。
- 下划线。
- 文字颜色，至少支持红色强调。
- 换行和基础段落。
- 标题、字号、字体、背景色。
- 有序列表、无序列表、缩进、引用。
- 左对齐、居中、右对齐、两端对齐。
- 链接、图片上传、视频上传。
- 表格、代码块、分割线、撤销和重做。

涉及页面：

- `KnowledgeForm.tsx`
- `KnowledgeDetail.tsx`
- `SceneKnowledge.tsx`

展示规则：

- 编辑页显示富文本编辑器。
- 详情页按富文本渲染。
- 列表页展示去除 HTML 后的纯文本摘要。

### 6.3 后端安全规则

保存前做 HTML 白名单清洗。

允许：

- `p`
- `br`
- `strong`
- `b`
- `u`
- `span`
- `span` 上有限颜色样式

禁止：

- `script`
- `iframe`
- 事件属性，例如 `onclick`
- 非白名单 style
- 危险协议链接

### 6.4 验收标准

- 内容字段可加粗、标红、下划线。
- 保存后再次编辑格式不丢。
- 详情页展示格式正确。
- 列表页不显示 HTML 标签。
- 输入危险 HTML 不会执行脚本。

## 7. 批量导入知识时选择目录

### 7.1 需求边界

本功能不是批量导入目录，而是在批量导入知识时，让 Excel 模板中的目录字段可以选择已有目录。

本版规则：

- 目录只允许单选。
- 一条知识只能归属一个目录。
- 不支持 Excel 中选择多个目录。
- 不支持用分号、顿号拆多个目录路径。

### 7.2 模板导出方式

下载模板时让用户选择模板类型：

- 普通模板：不带目录列，保持当前方式。
- 带目录模板：包含目录列，目录列支持 Excel 下拉单选已有目录。

后端接口增加参数：

```text
GET /v1/data/business/knowledge/template/export?sceneTemplateId=4&includeDirectory=true
```

规则：

- `includeDirectory=false`：继续排除 `dict` 目录字段。
- `includeDirectory=true`：模板包含目录字段。

### 7.3 Excel 下拉内容

带目录模板中，目录列下拉显示完整路径：

```text
CMMM / 评估 / 正式评估
CMMM / 评估 / 维持性评估
CMMM / 资质 / 评估师培训
```

实现建议：

- 新增隐藏 Sheet，例如 `目录选项`。
- 将当前场景关联目录写入隐藏 Sheet。
- 主 Sheet 的目录列通过数据校验引用隐藏 Sheet。
- 下拉顺序使用系统目录排序。

### 7.4 导入规则

后端导入时：

- 读取目录列中的路径文本。
- 将路径匹配为真实 `dict_directory.id`。
- 写入 `knowledge_item.select_dict_tree_ids`。

校验规则：

- 目录列为空：
  - 目录字段必填：该行失败。
  - 目录字段非必填：允许为空。
- 目录不存在：该行失败。
- 目录路径不唯一：该行失败。
- 目录被禁用：该行失败。
- 手动填写多个目录：该行失败，提示“目录只允许选择一个”。

### 7.5 导入结果反馈

导入结果返回：

- 总读取行数。
- 成功导入条数。
- 提交审批条数。
- 跳过行数。
- 失败明细。

失败明细包含：

- 行号。
- 字段名。
- 原值。
- 失败原因。

### 7.6 前端改造

涉及页面：

- `SceneKnowledge.tsx`
- `ImportKnowledge.tsx`

改造内容：

- 下载模板按钮点击后弹出选择：
  - 普通模板
  - 带目录模板
- 导入结果展示失败行明细。

### 7.7 验收标准

- 用户能选择普通模板或带目录模板。
- 带目录模板目录列为 Excel 下拉框。
- 目录下拉只允许单选。
- 导入后知识自动归类到所选目录。
- 错误行有明确原因，且不影响其他正确行导入。

## 8. 访问日志

### 8.1 后端服务

新增：

- `AccessLogEntity`
- `AccessLogMapper`
- `AccessLogService`
- `AccessLogController`

### 8.2 记录范围

需要记录：

- 登录成功。
- 登录失败。
- 退出登录。
- 查看知识详情。
- 新增知识。
- 修改知识。
- 删除知识。
- 批量导入知识。
- 导出导入模板。
- 目录新增。
- 目录编辑。
- 目录删除。
- 目录排序。
- 用户、角色、场景等关键配置变更。

### 8.3 退出日志

当前前端退出只是清除 token，需要新增后端接口：

```text
POST /v1/data/user/logout
```

前端点击“退出登录”时先调用该接口，再清除 token。

### 8.4 前端页面

新增访问日志页面，建议路径：

```text
/system/logs
```

筛选条件：

- 操作人。
- 操作模块。
- 操作类型。
- 操作结果。
- 场景。
- 知识 ID。
- 时间范围。

### 8.5 验收标准

- 登录成功和失败都有记录。
- 退出登录有记录。
- 查看知识详情有记录。
- 增删改、导入、目录排序有记录。
- 日志页面可分页、筛选查看。

## 9. 知识更新记录与历史版本

### 9.1 后端写入时机

以下操作成功后写入 `knowledge_version`：

- 新增知识。
- 修改知识。
- 删除知识。
- 批量导入知识。
- 审批通过后的实际写入。

### 9.2 快照内容

版本快照应包含：

- 知识主表信息。
- 知识字段值。
- 字段名称。
- 字段类型。
- 目录路径。
- 标签。
- 附件路径。
- 创建人。
- 创建时间。
- 更新时间。

### 9.3 变更摘要

修改时比较变更前后快照，生成摘要。

示例：

```text
修改了内容、标签
目录由“评估 / 预评估”改为“评估 / 正式评估”
新增了附件
```

### 9.4 后端接口

新增接口：

```text
GET /v1/data/business/knowledge/version/list?knowledgeId=213
GET /v1/data/business/knowledge/version/detail?versionId=1
```

### 9.5 前端页面

知识详情页增加：

- 更新记录入口。
- 历史版本入口。

本版只做：

- 查看更新记录。
- 查看历史版本内容。

本版不做：

- 版本对比。
- 一键回溯。

### 9.6 验收标准

- 每次新增、修改、删除都有版本记录。
- 能看到操作人、操作时间、变更摘要。
- 能打开历史版本查看当时完整知识内容。
- 审批通过后的变更也会进入历史版本。

## 10. 接口清单

本次新增或调整接口：

```text
GET  /v1/data/business/knowledge/template/export?sceneTemplateId=&includeDirectory=
POST /v1/data/business/knowledge/data/import

POST /v1/data/dict/directory/sort

GET  /v1/data/business/knowledge/version/list?knowledgeId=
GET  /v1/data/business/knowledge/version/detail?versionId=

GET  /v1/data/system/access-log/list
POST /v1/data/user/logout
```

## 11. 实施步骤

### 阶段一：数据库与基础模型

- [x] 新增 `002_knowledge_enhancement_upgrade.sql`。
- [x] 增加 `dict_directory.sort_number`。
- [x] 扩容 `knowledge_item.scene_item_value`。
- [x] 新增 `access_log` 表。
- [x] 新增 `knowledge_version` 表。
- [x] 新增权限种子数据。
- [x] 后端新增对应 Entity、Mapper。

### 阶段二：目录排序

- [x] 后端目录查询按 `sort_number` 排序。
- [x] 新增目录排序接口。
- [x] 新增目录项时自动生成排序号。
- [x] 前端目录编辑页增加上移、下移。
- [x] 知识列表目录树同步排序。
- [x] 知识新增、编辑目录选择同步排序。

### 阶段三：导入模板和目录下拉

- [x] 模板导出接口增加 `includeDirectory` 参数。
- [x] 普通模板保持不带目录字段。
- [x] 带目录模板包含目录字段。
- [x] Excel 目录列生成单选下拉。
- [x] 使用隐藏 Sheet 存放目录路径选项。
- [x] 前端下载模板时增加模板类型选择。

### 阶段四：导入增强

- [x] 导入时识别目录路径。
- [x] 目录路径转换为目录 ID。
- [x] 校验目录单选。
- [x] 校验目录不存在、禁用、不唯一。
- [x] 标签字段按逗号、中文逗号、顿号拆分。
- [x] 导入失败返回行号、字段、原值、原因。
- [x] 正确行继续导入，错误行跳过。

### 阶段五：标签和富文本

- [x] 场景字段类型增加 `tag`。
- [x] 场景字段类型增加 `richtext`。
- [ ] “标签”字段迁移为 `tag` 类型。
- [ ] “内容”字段迁移为 `richtext` 类型。
- [x] 知识表单适配标签输入。
- [x] 知识表单适配富文本编辑。
- [x] 详情页适配标签展示。
- [x] 详情页适配富文本展示。
- [x] 列表页适配富文本摘要。
- [x] 后端增加 HTML 白名单清洗。

### 阶段六：访问日志

- [x] 新增访问日志服务。
- [x] 登录成功记录日志。
- [x] 登录失败记录日志。
- [x] 新增退出接口并记录日志。
- [x] 查看知识详情记录日志。
- [x] 新增、修改、删除知识记录日志。
- [x] 批量导入按每条新增知识记录日志，暂不单独写入导入、导出、模板导出汇总日志。
- [x] 目录新增、编辑、删除、排序记录日志。
- [x] 新增访问日志页面。
- [x] 增加日志查询权限。
- [x] 右上角用户菜单新增“我的登录记录”。
- [x] 用户管理页支持查看指定用户登录、退出记录。
- [x] 知识详情页新增操作记录区域。
- [x] 增加 `knowledge:log:view-all` 权限，未授权时只能查看自己的知识操作记录。

### 阶段七：历史版本

- [x] 新增知识版本服务。
- [x] 新增知识时写入第 1 版。
- [x] 修改知识时写入新版本。
- [x] 删除知识前写入删除版本。
- [x] 导入知识成功后写入版本。
- [x] 审批通过后实际写入时记录版本。
- [x] 生成变更摘要。
- [x] 新增版本列表接口。
- [x] 新增版本详情接口。
- [x] 知识详情页增加更新记录入口。
- [x] 知识详情页增加历史版本入口。

### 阶段八：测试与验收

- [ ] 后端编译通过。
- [ ] 前端构建通过。
- [ ] 旧数据能正常查看。
- [ ] 目录排序刷新后不丢。
- [ ] 普通模板下载和导入正常。
- [ ] 带目录模板下拉选择正常。
- [ ] 带目录模板导入自动归类正常。
- [ ] 标签手动维护和导入拆分正常。
- [ ] 富文本保存、编辑、展示正常。
- [ ] 访问日志记录完整。
- [ ] 历史版本记录完整。
- [ ] 普通用户权限边界正常。
- [ ] 管理员功能正常。

## 12. 风险与注意事项

### 12.1 Excel 下拉长度限制

如果目录路径较多，Excel 原生下拉直接写公式可能受限制。建议使用隐藏 Sheet 存放目录选项，再通过单元格校验引用隐藏 Sheet。

### 12.2 目录重名

目录可能存在同名节点，导入匹配必须使用完整路径，不建议只按末级名称匹配。

### 12.3 富文本安全

富文本必须做白名单清洗，避免脚本注入。

### 12.4 历史版本体积

历史版本保存完整快照，会增加数据库体积。本版知识规模下可接受，后续可增加归档策略。

### 12.5 旧标签兼容

旧数据中标签可能是普通文本，需要兼容逗号、中文逗号、顿号分隔。

## 13. 本版暂不做

以下能力留到后续版本：

- 一个知识选择多个目录。
- Excel 目录多选。
- 历史版本对比。
- 一键回溯到历史版本。
- 全文搜索引擎接入。
- 操作日志归档和清理策略。

## 14. 建议执行顺序

推荐按以下顺序实施：

1. 数据库升级。
2. 目录排序。
3. 带目录模板导出。
4. 导入目录匹配和错误反馈。
5. 标签功能。
6. 富文本功能。
7. 访问日志。
8. 历史版本。
9. 全流程测试。

这样可以先完成数据结构和导入主流程，再补展示和审计能力，风险最低。
