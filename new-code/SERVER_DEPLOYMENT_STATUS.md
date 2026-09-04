# 服务器当前部署情况说明

本文档记录 121.40.114.206 服务器的部署现状、数据目录、备份位置和回退边界。更新日期：2026-07-12。

## 一、当前结论

当前项目采用“稳定版保留、升级版接管入口”的方式运行。

正式访问入口：

```text
http://121.40.114.206:8000
```

验收后的升级版环境为当前主用环境：

```text
/opt/smart-product-next
```

旧稳定版环境仍保留：

```text
/opt/smart-product-new
```

旧稳定版前端容器在切换时停止，用来释放 `8000` 端口；旧稳定版后端、MySQL、Redis 可继续保留，便于必要时快速回退。

## 二、当前主用环境：升级版

升级版目录：

```text
/opt/smart-product-next/
├── new-code/                    # 当前升级版运行包
│   ├── docker-compose.next.yml
│   ├── backend-app/app.jar
│   ├── frontend-dist/
│   ├── deploy/
│   └── .env.next                # 服务器真实配置，不进 Git，不进运行包
├── deploy-data/                 # 升级版真实运行数据，不能删除
│   ├── mysql/
│   ├── redis/
│   └── files/
├── server-secrets/
│   └── jwt-secret               # 升级版 JWT 密钥，不能删除
├── backups/
└── smart-product-runtime.zip
```

升级版容器：

| 服务 | 容器名 | 当前用途 | 端口 |
| --- | --- | --- | --- |
| 前端 Nginx | `smart-product-next-web` | 当前正式入口 | `8000 -> 80` |
| Spring 后端 | `smart-product-next-spring` | 当前正式后端 | `127.0.0.1:28001 -> 8001` |
| MySQL | `smart-product-next-mysql` | 当前正式数据库 | `127.0.0.1:33306 -> 3306` |
| Redis | `smart-product-next-redis` | 当前正式缓存 | `127.0.0.1:36379 -> 6379` |

说明：

- 升级版原测试入口是 `28000`。
- 验收通过后，`docker-compose.next.yml` 中前端端口由 `"28000:80"` 改为 `"8000:80"`。
- 后端、MySQL、Redis 仍保持内网端口，不直接暴露公网。

查看状态：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

验证当前入口：

```bash
curl -I http://127.0.0.1:8000
curl -I http://127.0.0.1:8000/api/v1/data/user/login/key
```

## 三、当前主用数据和资源

升级版数据库：

```text
容器：smart-product-next-mysql
数据库：knowledge
宿主机目录：/opt/smart-product-next/deploy-data/mysql
```

升级版图片和附件：

```text
宿主机目录：/opt/smart-product-next/deploy-data/files
容器内目录：/app/uploads
访问路径：http://121.40.114.206:8000/data/...
```

数据库中保存的 `/data/...` 文件地址，由 Spring 后端从 `/app/uploads` 读取；`/app/uploads` 实际挂载到 `/opt/smart-product-next/deploy-data/files`。

## 四、保留环境：旧稳定版

旧稳定版目录：

```text
/opt/smart-product-new/
├── new-code/
└── deploy-data/
    ├── mysql/
    ├── redis/
    └── files/
```

旧稳定版容器：

| 服务 | 容器名 | 状态 | 原端口 |
| --- | --- | --- | --- |
| 前端 Nginx | `smart-product-parallel-web` | 切换后应停止 | `8000 -> 80` |
| Spring 后端 | `smart-product-parallel-spring` | 可保留运行 | `18001 -> 8001` |
| MySQL | `smart-product-parallel-mysql` | 可保留运行 | `23306 -> 3306` |
| Redis | `smart-product-parallel-redis` | 可保留运行 | `26379 -> 6379` |

不要删除旧稳定版目录和数据。它是当前升级版切换失败时的快速回退依据。

## 五、历史旧项目

更早的旧项目容器已经停止：

| 旧容器 | 原用途 | 原端口 |
| --- | --- | --- |
| `nginx` | 旧项目前端入口 | `8000` |
| `server` | 旧项目后端 | `9000` |
| `mysql` | 旧项目 MySQL | `13306` |
| `redis` | 旧项目 Redis | `16379` |

旧项目资源原路径：

```text
/data/testdata
```

旧项目备份位置：

```text
/opt/smart-product-old-backup/old-project-20260710_205918/
```

备份内容：

| 文件 | 说明 |
| --- | --- |
| `knowledge-old.sql` | 旧项目 MySQL 数据库备份 |
| `testdata-old-files.tar.gz` | 旧项目上传资源备份 |
| `install-script-old.tar.gz` | 旧项目安装脚本和运行文件备份 |
| `docker-ps-before-stop.txt` | 停止旧项目前容器状态 |
| `old-project-containers-inspect.json` | 旧容器详细配置 |

## 六、升级版上线和备份情况

升级版初始化时从旧稳定版复制过一次数据和资源。

已知初始化备份目录：

```text
/opt/smart-product-next/backups/from-stable-20260712_143804/
```

该目录用于记录从稳定版复制到升级版时的数据来源，通常包含：

| 文件 | 说明 |
| --- | --- |
| `knowledge-from-stable.sql` | 从 `smart-product-parallel-mysql` 导出的稳定版数据库 |
| `files-from-stable.tar.gz` | 从 `/opt/smart-product-new/deploy-data/files` 打包的稳定版资源 |

正式切换到 `8000` 前建议使用的切换备份目录格式：

```text
/opt/smart-product-switch-backup/switch-YYYYMMDD_HHMMSS/
```

切换备份建议包含：

| 文件/目录 | 说明 |
| --- | --- |
| `docker-ps-before-switch.txt` | 切换前容器状态 |
| `containers-inspect-before-switch.json` | 切换前关键容器配置 |
| `stable-new-code/` | `/opt/smart-product-new/new-code` 运行包备份 |
| `next-new-code/` | `/opt/smart-product-next/new-code` 运行包备份 |
| `stable-knowledge.sql` | 旧稳定版数据库备份 |
| `next-knowledge.sql` | 升级版数据库备份 |
| `stable-files.tar.gz` | 旧稳定版资源备份 |
| `next-files.tar.gz` | 升级版资源备份 |

查看已有备份：

```bash
ls -lh /opt/smart-product-old-backup
ls -lh /opt/smart-product-next/backups
ls -lh /opt/smart-product-switch-backup 2>/dev/null || true
```

## 七、切换记录

升级版从 `28000` 切换为正式 `8000` 的核心动作：

```bash
cd /opt/smart-product-next/new-code

docker stop smart-product-parallel-web

sed -i 's/"28000:80"/"8000:80"/' docker-compose.next.yml

docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate web
```

切换后：

```text
8000 -> smart-product-next-web
```

旧稳定版前端 `smart-product-parallel-web` 停止，释放 `8000`。

## 八、回退方式

如果升级版切到 `8000` 后出现问题，回退到旧稳定版：

```bash
cd /opt/smart-product-next/new-code

sed -i 's/"8000:80"/"28000:80"/' docker-compose.next.yml
docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate web

docker start smart-product-parallel-web

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

回退后：

```text
8000 -> smart-product-parallel-web
28000 -> smart-product-next-web
```

## 九、重新上线升级版

如果只是重新打包并覆盖升级版运行包，不需要重建数据库和图片目录。

本地打包：

```powershell
cd D:\coder\code-store\go\smart_product
powershell -ExecutionPolicy Bypass -File .\new-code\scripts\build-runtime-package.ps1
```

上传：

```text
new-code/release/smart-product-runtime.zip
上传到
/opt/smart-product-next/smart-product-runtime.zip
```

服务器更新运行包：

```bash
cd /opt/smart-product-next

docker compose --env-file new-code/.env.next -f new-code/docker-compose.next.yml stop spring-server web

rm -rf new-code
unzip -o smart-product-runtime.zip -d new-code

cd /opt/smart-product-next/new-code

cat > .env.next <<'EOF'
NEXT_MYSQL_ROOT_PASSWORD=wangmanyou
NEXT_SERVER_DATA_ROOT=../deploy-data
NEXT_JWT_SECRET_FILE=../server-secrets/jwt-secret
NEXT_JWT_ISSUER=smart-product-next
NEXT_JWT_AUDIENCE=smart-product-next-web
NEXT_JWT_TTL_SECONDS=86400
EOF

chmod 600 .env.next

chmod -R a+rX frontend-dist
chmod -R a+rX backend-app
chmod -R a+rX deploy

docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate spring-server web
```

如果当前 `docker-compose.next.yml` 解压后又变回 `"28000:80"`，正式环境需要重新改回：

```bash
sed -i 's/"28000:80"/"8000:80"/' docker-compose.next.yml
docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate web
```

## 十、常用检查命令

查看容器：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

查看升级版日志：

```bash
docker logs --tail 120 smart-product-next-spring
docker logs --tail 80 smart-product-next-web
```

检查前端文件挂载：

```bash
docker exec smart-product-next-web ls -lh /usr/share/nginx/html | head -n 30
docker exec smart-product-next-web test -f /usr/share/nginx/html/index.html && echo "index.html OK"
```

检查接口：

```bash
curl -I http://127.0.0.1:8000
curl -I http://127.0.0.1:8000/api/v1/data/user/login/key
```

检查图片缓存：

```bash
curl -I http://127.0.0.1:8000/data/实际图片路径
```

期望看到类似：

```text
Cache-Control: public, max-age=604800, immutable
```

## 十一、禁止事项

- 不要删除 `/opt/smart-product-next/deploy-data`，这里是当前主用数据库、Redis 和上传文件。
- 不要删除 `/opt/smart-product-next/server-secrets/jwt-secret`，否则当前用户 Token 会失效，服务也可能无法启动。
- 不要让 `smart-product-next-web` 和 `smart-product-parallel-web` 同时占用 `8000`。
- 不要让两个 MySQL 容器挂载同一个物理数据目录。
- 不要把 `.env.next`、`.env.server` 或 `jwt-secret` 提交到 Git。
- 不要在没有明确确认前执行 `docker compose down -v`，`-v` 会删除卷数据。
