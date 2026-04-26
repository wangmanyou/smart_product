# Docker 一键部署

在仓库根目录执行：

先确认前端已经打包：

```bash
cd knowledge-hub-fe
pnpm build
```

然后在仓库根目录启动：

```bash
docker compose up -d --build
```

访问地址：

```text
http://localhost:8000
```

服务说明：

- `web`：Nginx 直接挂载 `knowledge-hub-fe/dist`，宿主机端口 `8000`
- `spring-server`：Spring Boot 后端，宿主机端口 `8001`
- `mysql`：MySQL 8.0，宿主机端口 `13306`
- `redis`：Redis 6.2，宿主机端口 `16379`

MySQL 数据复用当前 Go 部署目录：

```text
data-mannagement/data-mannagement/deploy/data/mysql/lib
```

Redis 数据复用当前 Go 部署目录：

```text
data-mannagement/data-mannagement/deploy/data/redis/db
```

上传和导出文件会保存到：

```text
deploy-data/files
```

常用命令：

```bash
docker compose ps
docker compose logs -f spring-server
docker compose logs -f web
docker compose down
docker compose up -d --build
```

不要使用下面命令清理生产数据：

```bash
docker compose down -v
```
