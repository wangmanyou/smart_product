# 权限与知识审批功能接手说明

本文档记录本次权限、角色、页面权限、知识变更审批功能的实现方案和继续开发入口，方便换电脑后快速接上。

## 当前目标

系统拆分为管理员和普通用户：

- 管理员拥有全部权限。
- 普通用户通过一个角色控制权限。
- 角色可配置页面权限、操作权限、授权场景。
- 普通用户新增、编辑、删除知识是否需要审批，由角色配置决定。
- 待审批的新增、编辑、删除不直接写入正式知识表，管理员审批通过后才生效。

## 数据库变更

升级脚本：

```text
db/auth_approval_upgrade.sql
```

Docker MySQL 执行命令：

```powershell
docker exec -i smart-product-mysql mysql -uroot -proot knowledge < db/auth_approval_upgrade.sql
```

新增或补充的核心字段/表：

```text
user.role_id
role.setting_json
sys_permission
knowledge_change_request
```

`role.setting_json` 示例：

```json
{
  "admin": false,
  "pagePermissions": ["page:knowledge", "page:statistics"],
  "operationPermissions": [
    "knowledge:view",
    "knowledge:create",
    "knowledge:update",
    "knowledge:delete"
  ],
  "approvalRequired": {
    "knowledge:create": true,
    "knowledge:update": true,
    "knowledge:delete": true
  },
  "sceneTemplateIds": [1, 2, 5]
}
```

管理员角色：

```json
{
  "admin": true
}
```

审批状态：

```text
PENDING    待审批，申请人可修改或撤回
APPROVED   已通过，变更已经写入正式知识表
REJECTED   已驳回，申请人可删除申请记录
WITHDRAWN  已撤回，申请人可删除申请记录
```

## 后端实现

后端目录：

```text
knowledge-hub-backend-spring
```

认证与鉴权：

- 已接入 `spring-boot-starter-security`。
- `TokenService` 已改为 `jjwt` 签发和解析 JWT，不再使用手写 HMAC 拼接。
- `JwtAuthenticationFilter` 解析 `Authorization: Bearer <token>`。
- `SecurityUserService` 根据 `user.role_id` 读取 `role.setting_json`，组装当前用户权限。
- Controller 使用 `@PreAuthorize` 做方法级操作权限校验。

关键文件：

```text
src/main/java/com/smartproduct/service/TokenService.java
src/main/java/com/smartproduct/infrastructure/config/SecurityConfig.java
src/main/java/com/smartproduct/security/JwtAuthenticationFilter.java
src/main/java/com/smartproduct/security/SecurityUserService.java
src/main/java/com/smartproduct/security/CurrentUser.java
src/main/java/com/smartproduct/security/PermissionCodes.java
```

权限字典：

```text
sys_permission
SysPermissionController
SysPermissionService
```

角色配置：

```text
RoleController
RoleService
role.setting_json
```

当前用户信息：

- `UserService.detail` 会把用户角色的 `setting` 带回前端。
- 前端依赖这个 `setting.pagePermissions` 控制菜单显示。

## 知识审批流程

新增审批表实体和服务：

```text
KnowledgeChangeRequestEntity
KnowledgeChangeRequestMapper
KnowledgeChangeRequestStatus
KnowledgeChangeRequestService
KnowledgeChangeRequestController
```

普通用户新增知识：

```text
有 knowledge:create 权限
  ↓
如果 role.setting_json.approvalRequired["knowledge:create"] = true
  ↓
写入 knowledge_change_request，不写 knowledge / knowledge_item
  ↓
管理员审批通过后再正式写入 knowledge / knowledge_item
```

普通用户编辑知识：

```text
有 knowledge:update 权限
  ↓
校验授权场景
  ↓
如果需要审批，写入 UPDATE 类型申请
  ↓
审批通过后覆盖正式 knowledge_item
```

普通用户删除知识：

```text
有 knowledge:delete 权限
  ↓
校验授权场景
  ↓
如果需要审批，写入 DELETE 类型申请
  ↓
审批通过后删除正式知识
```

重要限制：

```text
同一条知识同一时间只能有一个 PENDING 的 UPDATE 或 DELETE 申请。
```

## 前端实现

前端目录：

```text
knowledge-hub-modern-fe
```

新增/改造页面：

```text
src/pages/UserManagement.tsx       用户管理：新增、编辑、分配角色
src/pages/RoleManagement.tsx       角色列表：打开配置页
src/pages/RoleConfig.tsx           角色配置：页面权限、操作权限、审批规则、授权场景
src/pages/ChangeApprovals.tsx      变更审批：通过、驳回、撤回
```

右上角菜单：

```text
src/components/HeaderUserMenu.tsx
```

包含：

- 变更审批入口
- 待审批小红点和数量提示
- 退出登录

API 封装：

```text
src/services/api.ts
```

新增：

```text
roleApi
permissionApi
approvalApi
```

路由：

```text
.umirc.ts
```

新增：

```text
/system/roles
/system/roles/new/config
/system/roles/:id/config
/system/approvals
```

Tab 标题：

```text
src/components/GlobalWorkTabs.tsx
```

## 页面权限规则

页面权限控制菜单入口：

```text
page:knowledge
page:statistics
page:system:dicts
page:system:scenes
page:system:users
page:system:roles
page:system:approvals
```

特殊规则：

```text
只要角色拥有 system:manage 操作权限，系统管理相关页面会默认开放。
```

因此角色配置页不会再要求手动勾选系统管理相关页面。

## 操作权限规则

核心操作权限：

```text
knowledge:view
knowledge:create
knowledge:update
knowledge:delete
knowledge:import
knowledge:change-request:view-own
knowledge:change-request:view-all
knowledge:change-request:approve
knowledge:change-request:reject
system:manage
```

审批规则只对已拥有的操作权限出现：

```text
knowledge:create
knowledge:update
knowledge:delete
```

也就是说，先勾选“新增知识”，才会出现“新增知识需要管理员审批”。

## 已验证

后端：

```powershell
cd knowledge-hub-backend-spring
mvn compile
```

前端：

```powershell
cd knowledge-hub-modern-fe
npm.cmd run build
```

两者均已通过。

## 明天继续开发建议

建议优先检查这些体验和联调点：

1. 登录后普通用户菜单是否按页面权限显示。
2. 普通用户只能看到授权场景。
3. 普通用户提交新增/编辑/删除知识后，是否按角色配置进入审批。
4. 管理员右上角待审批数量是否正常。
5. 管理员审批通过后，正式知识表是否正确变化。
6. 角色配置页的页面文案和视觉可以继续细化。

如果 Docker 数据库已经存在，先执行 `db/auth_approval_upgrade.sql`，否则后端启动初始化器也会自动创建新表和权限字典。
