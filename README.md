# Smart Product Knowledge System

本仓库保留两套完全独立的应用：

- **Spring 主线**：当前继续开发和发布的版本，源码位于 `new-code/`。
- **Go 旧版**：仅作为历史版本和服务器回退保障保留，源码位于 `go-code/`。

> 仓库根目录不再提供 `docker-compose.yml`。不要在根目录直接执行 `docker compose up`，请明确选择下面三个入口之一。

## Docker 入口和数据边界

| 用途 | Compose 入口 | Compose 项目名 | 容器/网络前缀 | 数据目录 |
| --- | --- | --- | --- | --- |
| Spring 本地开发依赖 | `new-code/docker-compose.dev.yml` | `smart-product-spring-dev` | `smart-product-spring-dev-*` | `spring-runtime-data/dev/` |
| Spring 服务器完整运行包 | `new-code/docker-compose.server.yml` | `smart-product-spring-server` | `smart-product-spring-*` | `spring-runtime-data/prod/` |
| Go 旧版独立运行 | `go-code/docker-compose.yml` | `smart-product-go-legacy` | `smart-product-go-*` | `go-code/runtime-data/` |

三套入口使用不同的容器名、网络名、宿主机端口和数据目录。即使 MySQL 中数据库名称都叫 `knowledge`，它们也不会加载同一套数据。

`go-code/legacy-runtime-data/` 是保留的 Go 历史数据归档，当前 Compose 不会挂载它。不要在没有备份和确认的情况下删除或改名。

## Spring 主线：本地开发

首次克隆或本地密钥丢失时，先生成 Git 忽略的随机 JWT 密钥；然后启动 Spring 本地开发所需的 MySQL 和 Redis：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\new-code\scripts\init-dev-jwt-secret.ps1
docker compose -f .\new-code\docker-compose.dev.yml up -d
```

在一个新终端中，从后端目录启动 Spring（工作目录不能省略）：

```powershell
Set-Location .\new-code\backend
mvn.cmd spring-boot:run
```

再在另一个终端启动前端：

```powershell
npm.cmd --prefix .\new-code\frontend-app run dev
```

默认端口：

- Spring 后端：`8001`
- MySQL：`13306`
- Redis：`16379`

停止开发依赖：

```powershell
docker compose -f .\new-code\docker-compose.dev.yml down
```

## Spring 主线：服务器部署

服务器部署使用预构建 JAR 和前端静态文件：

```bash
cd /opt/smart-product-new/new-code
cp .env.server.example .env.server
# 编辑 .env.server，填入与现有 Spring MySQL 数据一致的密码
docker compose --env-file .env.server -f docker-compose.server.yml up -d
```

默认端口：

- Web：`18000`
- Spring 后端：`18001`
- MySQL：`127.0.0.1:23306`
- Redis：`127.0.0.1:26379`

详细步骤见：

- `new-code/PACKAGE_RELEASE.md`
- `new-code/START_STOP.md`
- `new-code/PRODUCTION_SECURITY_HTTPS.md`

## Go 旧版

Go 旧版仅作为保留版本，独立启动命令为：

```powershell
docker compose -f .\go-code\docker-compose.yml up -d --build
```

默认端口：

- Web：`8002`
- MySQL：`13307`
- Redis：`16380`

## 数据与版本管理

以下目录包含真实数据库、Redis 或上传文件，不纳入 Git：

- `spring-runtime-data/`
- `go-code/runtime-data/`
- `go-code/legacy-runtime-data/`

旧路径 `deploy-data/` 和 `dev-data/` 也继续保留在忽略规则中，防止误提交，但新的 Compose 已不再使用它们。
