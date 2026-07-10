# 数据库脚本说明

## 1. 线上导出的 `knowledge.sql`

`knowledge.sql` 是服务器当前业务数据备份，作用是恢复最新线上数据。

它不是升级脚本，也不建议长期放进代码仓库。

导入顺序：

```bash
mysql -uroot -p'root' knowledge < knowledge.sql
```

## 2. `001_auth_approval_upgrade.sql`

该脚本用于把旧版本数据库升级到新版本需要的结构。

它会补充：

- 角色表
- 用户多角色关系表
- 权限字典表
- 角色权限表
- 角色授权场景表
- 知识审批表
- 通知表
- 管理员角色和基础权限

导入线上最新 `knowledge.sql` 后，再执行：

```bash
mysql -uroot -p'root' knowledge < new-code/db/001_auth_approval_upgrade.sql
```

## 3. 不再使用旧数据脚本

归档文件 `new-code/db/archive/knowledge_data_only_20260509.sql` 是 2026-05-09 的历史数据导入文件。

现在已有 2026-05-31 从服务器导出的最新 `knowledge.sql`，后续上线应以最新导出数据为准，不再使用该归档脚本。
