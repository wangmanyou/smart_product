# Smart Product Spring Backend

这是当前主线的 Spring Boot 后端。

## 本地依赖

在仓库根目录启动 Spring 专用的本地 MySQL 和 Redis：

```powershell
docker compose -f .\new-code\docker-compose.dev.yml up -d
```

服务信息：

- MySQL：`127.0.0.1:13306`，数据库 `knowledge`，本地用户 `root`
- Redis：`127.0.0.1:16379`，数据库编号 `6`
- 数据目录：`spring-runtime-data/dev/`
- 本地上传目录：`spring-runtime-data/dev/files/`

这些目录不与 Go 旧版的 `go-code/runtime-data/` 共用。

## 首次生成本地 JWT 密钥

后端已经取消硬编码默认密钥。首次克隆或本地密钥丢失时，在仓库根目录执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\new-code\scripts\init-dev-jwt-secret.ps1
```

`-ExecutionPolicy Bypass` 只作用于这一次子进程，不会修改系统全局执行策略。

脚本会在 `spring-runtime-data/dev/secrets/jwt-secret` 生成 48 字节随机密钥的 Base64 文本。该目录已被 Git 忽略；文件存在且有效时脚本会保留原值，避免每次重启导致已登录 Token 全部失效，并且脚本不会打印密钥内容。

本地默认配置会直接读取该文件，不需要每次设置环境变量。仍可通过 `APP_JWT_SECRET_FILE` 覆盖文件位置，或用 Base64 格式的 `APP_JWT_SECRET` 作为纯本地临时回退。生产环境禁止把真实密钥写入 Compose、`.env.server` 或发布包。

## 启动后端

完成本地密钥初始化后，从后端目录启动（默认密钥路径以该工作目录为基准）：

```powershell
Set-Location .\new-code\backend
mvn.cmd spring-boot:run
```

默认监听地址：

```text
http://127.0.0.1:8001
```

前端继续通过 `/api` 代理到该后端。Authorization 必须使用标准格式：

```http
Authorization: Bearer <token>
```

密钥缺失、不是 Base64、解码后不足 32 字节、issuer/audience 为空时，后端会在启动阶段直接失败。

## 停止本地依赖

```powershell
docker compose -f .\new-code\docker-compose.dev.yml down
```

该命令不会删除 `spring-runtime-data/dev/` 中的数据库、Redis、上传文件和本地 JWT 密钥。生产配置见 `new-code/JWT_SECRET_SETUP.md`。
