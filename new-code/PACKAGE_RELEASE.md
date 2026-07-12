# Spring 服务器运行包发布说明

生产服务器不需要上传完整前后端源码。发布脚本会生成一个只包含 Spring 运行所需文件的压缩包。

## 运行包内容

```text
backend-app/app.jar
frontend-dist/
deploy/
db/
docker-compose.server.yml
docker-compose.next.yml
.env.server.example
.env.next.example
PACKAGE_RELEASE.md
START_STOP.md
SERVER_DEPLOYMENT_STATUS.md
NEXT_PARALLEL_DEPLOY.md
PRODUCTION_SECURITY_HTTPS.md
JWT_SECRET_SETUP.md
```

运行包明确不包含：

- MySQL、Redis 和上传文件；
- 服务器的 `.env.server` 和 `.env.next`；
- 真实 JWT 密钥文件 `jwt-secret`。

默认运行数据与密钥均位于运行包目录外：

```text
/opt/smart-product-new/
├── new-code/                         # 每次解压替换的运行包
├── spring-runtime-data/prod/         # Spring 专用数据
│   ├── mysql/
│   ├── redis/
│   └── files/
└── spring-server-secrets/
    └── jwt-secret                    # 服务器单独生成，不上传
```

因此重新解压或替换运行包不会覆盖数据和密钥。

## 一、本地构建运行包

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\new-code\scripts\build-runtime-package.ps1
```

脚本会：

1. 构建前端；
2. 执行后端测试并打包 Spring JAR；
3. 重新生成运行目录和 ZIP；
4. 在打包前后检查 `.env.server` 和 `jwt-secret`，防止真实密钥进入产物。

生成文件：

```text
new-code/release/smart-product-runtime/
new-code/release/smart-product-runtime.zip
```

旧的 `runtime`、`parallel`、`app-only` Compose 不再进入运行包。

如果需要把功能迭代版和当前线上版本并行部署，使用运行包里的 `docker-compose.next.yml` 和 `.env.next.example`，详细步骤见 `NEXT_PARALLEL_DEPLOY.md`。

## 二、上传和解压

示例服务器目录：

```bash
mkdir -p /opt/smart-product-new
cd /opt/smart-product-new
unzip -o smart-product-runtime.zip -d new-code
cd new-code
```

## 三、首次生成 JWT 密钥

真实密钥不在 ZIP 中。首次部署必须在服务器单独生成：

```bash
mkdir -p /opt/smart-product-new/spring-server-secrets
umask 077
openssl rand -base64 48 > /opt/smart-product-new/spring-server-secrets/jwt-secret
chmod 600 /opt/smart-product-new/spring-server-secrets/jwt-secret
```

普通版本升级应保留这个文件，不要每次重新生成。详细规则见 `JWT_SECRET_SETUP.md`。

## 四、配置服务器环境变量

复制示例文件：

```bash
cp .env.server.example .env.server
chmod 600 .env.server
vi .env.server
```

必须确认：

- `SPRING_MYSQL_ROOT_PASSWORD` 与当前 Spring MySQL 数据目录中的真实密码一致。
- `SPRING_SERVER_DATA_ROOT` 指向 Spring 专用目录，不能指向 Go 旧版数据目录。
- `SPRING_JWT_SECRET_FILE` 只填写密钥文件路径，不能填写密钥内容。
- 默认路径分别解析为 `/opt/smart-product-new/spring-runtime-data/prod` 和 `/opt/smart-product-new/spring-server-secrets/jwt-secret`。

先检查最终配置：

```bash
docker compose --env-file .env.server -f docker-compose.server.yml config
```

如果密钥文件缺失、为空、不是 Base64 或解码后不足 32 字节，Spring 后端会拒绝启动。

## 五、迁移已有 Spring 数据时的规则

如果服务器已经有独立运行的 Spring MySQL、Redis 和上传文件，请先确认它们的宿主机挂载路径：

```bash
docker inspect 现有SpringMySQL容器 --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
docker inspect 现有SpringRedis容器 --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

迁移时必须遵守：

1. 先备份 MySQL、Redis 和上传文件。
2. 停止现有 Spring MySQL/Redis 容器后再复制物理数据目录。
3. 绝不能让两个 MySQL 容器同时挂载同一个 `/var/lib/mysql` 宿主机目录。
4. 不要复制或移动 Go 旧版正在使用的数据目录。
5. 如果直接复用现有 Spring 数据目录，只修改 `SPRING_SERVER_DATA_ROOT`，不要重新初始化数据库。

## 六、首次启动

先启动 Spring 专用 MySQL 和 Redis：

```bash
docker compose --env-file .env.server -f docker-compose.server.yml up -d mysql redis
docker compose --env-file .env.server -f docker-compose.server.yml ps
```

如果数据目录已经包含数据库，不要再次导入全量 SQL。只有目标数据目录为空且确实需要恢复备份时，才执行导入。

示例：导入全量备份：

```bash
docker compose --env-file .env.server -f docker-compose.server.yml exec -T mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" knowledge' < knowledge.sql
```

执行版本升级 SQL：

```bash
docker compose --env-file .env.server -f docker-compose.server.yml exec -T mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" knowledge' < db/001_auth_approval_upgrade.sql
```

再启动完整 Spring 服务：

```bash
docker compose --env-file .env.server -f docker-compose.server.yml up -d
```

本次从旧硬编码密钥切换到服务器密钥文件后，旧 Spring Token 会全部失效，用户需要重新登录；Go 旧版不受影响。

## 七、验证

```bash
docker compose --env-file .env.server -f docker-compose.server.yml ps
docker logs --tail 200 smart-product-spring-server
curl -I http://127.0.0.1:18000
curl http://127.0.0.1:18000/api/v1/data/user/login/key
```

Spring 默认使用独立的容器名、网络、端口、数据目录和 JWT 密钥，不会操作 Go 旧版容器、数据或 Token。
