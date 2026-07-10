# Smart Product Go 旧版

该目录保存历史 Go 版本。Spring 已是当前主线；Go 版本继续保留用于历史追溯和服务器应急回退，不与 Spring 共用容器或运行数据。

## 独立边界

- 后端：`backend/`
- 前端：`frontend/`
- MySQL、Redis、Nginx 配置：`deploy/`
- 唯一 Docker 入口：`docker-compose.yml`
- 当前运行数据：`runtime-data/`
- 历史数据归档：`legacy-runtime-data/`（当前 Compose 不挂载）
- Compose 项目名：`smart-product-go-legacy`
- Docker 网络：`smart-product-go-net`
- 容器名：`smart-product-go-*`

Go 的 `runtime-data/` 与 Spring 的 `spring-runtime-data/dev/`、`spring-runtime-data/prod/` 完全分开。

## 构建与启动

在仓库根目录执行：

```powershell
npm.cmd install -g pnpm@9.15.9
pnpm.cmd --dir .\go-code\frontend install --frozen-lockfile
pnpm.cmd --dir .\go-code\frontend build
docker compose -f .\go-code\docker-compose.yml up -d --build
```

默认端口：

- Web：`8002`
- MySQL：`13307`
- Redis：`16380`

查看状态和日志：

```powershell
docker compose -f .\go-code\docker-compose.yml ps
docker logs -f smart-product-go-server
```

停止并删除 Go 容器：

```powershell
docker compose -f .\go-code\docker-compose.yml down
```

`down` 不会删除绑定在 `runtime-data/` 中的数据。不要手动把 Go Compose 改到 Spring 的数据目录，也不要同时让两个 MySQL 容器挂载同一个物理目录。
