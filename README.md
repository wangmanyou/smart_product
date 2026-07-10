# Smart Product Knowledge System

本仓库保留两套可运行项目：

## Spring 版（当前主线）

- 后端：`new-code/backend`
- 前端：`new-code/frontend-app`
- 数据库/部署配置：`new-code/db`、`new-code/deploy`

常用命令：

```powershell
docker compose -f docker-compose.local.yml up -d
mvn -f .\new-code\backend\pom.xml clean compile
npm.cmd --prefix .\new-code\frontend-app ci
npm.cmd --prefix .\new-code\frontend-app run build
docker compose up -d --build
```

Spring 版默认 Web 端口：`8000`，后端端口：`8001`。

## Go 版（历史正式版）

- 项目目录：`go-code`
- 后端：`go-code/backend`
- 前端：`go-code/frontend`
- 部署配置：`go-code/deploy`
- Docker 入口：`go-code/docker-compose.yml`

常用命令：

```powershell
npm.cmd install -g pnpm@9.15.9
pnpm.cmd --dir .\go-code\frontend install --frozen-lockfile
pnpm.cmd --dir .\go-code\frontend build
docker compose -f .\go-code\docker-compose.yml up -d --build
```

Go 版默认 Web 端口：`8002`。

## 目录约定

- `deploy-data/`、`dev-data/` 是 Spring 版数据库、Redis 和上传文件数据，不纳入版本管理。
- `go-code/runtime-data/` 是 Go 版运行数据，不纳入版本管理。
- `go-code/legacy-runtime-data/` 是暂时保留的旧 Go 运行数据，当前部署不挂载；确认数据已迁移后再单独清理。
- `release/`、临时浏览器 profile、旧备份目录不作为源码保留。
- 根目录默认 `docker-compose.yml` 指向 Spring 版当前主线；Go 版使用 `go-code/docker-compose.yml`。
