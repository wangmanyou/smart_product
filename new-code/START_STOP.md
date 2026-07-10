# Spring 主线服务器启停说明

本文档只管理 Spring 主线服务器运行包。Go 旧版是独立保障环境，不应由下面的命令停止或删除。

## 目录和唯一入口

示例服务器目录：

```text
/opt/smart-product-new/
├── new-code/
│   ├── docker-compose.server.yml
│   ├── .env.server
│   ├── backend-app/
│   ├── frontend-dist/
│   └── deploy/
├── spring-runtime-data/
│   └── prod/
│       ├── mysql/
│       ├── redis/
│       └── files/
└── spring-server-secrets/
    └── jwt-secret
```

真实 JWT 密钥位于运行包外，普通升级不能删除或覆盖。唯一 Compose 入口：

```text
docker-compose.server.yml
```

## Spring 服务边界

| 服务 | 容器名 | 宿主机端口 | 数据/密钥 |
| --- | --- | --- | --- |
| Web/Nginx | `smart-product-spring-web` | `18000` | 前端静态文件，只读 |
| Spring 后端 | `smart-product-spring-server` | `18001` | uploads + 只读 JWT secret |
| MySQL | `smart-product-spring-mysql` | `127.0.0.1:23306` | `spring-runtime-data/prod/mysql` |
| Redis | `smart-product-spring-redis` | `127.0.0.1:26379` | `spring-runtime-data/prod/redis` |

Compose 项目名为 `smart-product-spring-server`，Docker 网络为 `smart-product-spring-net`。这些项目标签、名称、端口、目录和密钥均与 Go 旧版分开。

## 启动前检查

```bash
cd /opt/smart-product-new/new-code
test -s /opt/smart-product-new/spring-server-secrets/jwt-secret
stat -c '%a %n' /opt/smart-product-new/spring-server-secrets/jwt-secret
docker compose --env-file .env.server -f docker-compose.server.yml config
```

密钥建议权限为 `600`。首次生成方法见 `JWT_SECRET_SETUP.md`。

## 启动

```bash
cd /opt/smart-product-new/new-code
docker compose --env-file .env.server -f docker-compose.server.yml up -d
```

## 查看状态

```bash
cd /opt/smart-product-new/new-code
docker compose --env-file .env.server -f docker-compose.server.yml ps
```

## 查看日志

```bash
docker logs -f smart-product-spring-server
docker logs -f smart-product-spring-web
docker logs -f smart-product-spring-mysql
```

后端日志不应出现密钥或完整 Token。密钥配置错误只会报告“缺失、不可读、格式错误或强度不足”。

## 临时停止和恢复

只停止 Spring 容器，保留容器、数据和服务器密钥：

```bash
cd /opt/smart-product-new/new-code
docker compose --env-file .env.server -f docker-compose.server.yml stop
```

恢复：

```bash
docker compose --env-file .env.server -f docker-compose.server.yml start
```

## 删除并重建 Spring 容器

```bash
cd /opt/smart-product-new/new-code
docker compose --env-file .env.server -f docker-compose.server.yml down
docker compose --env-file .env.server -f docker-compose.server.yml up -d
```

`down` 删除 Spring 容器和 Spring 网络，但不会删除绑定的数据和运行包外的 JWT 密钥。仍应在操作前备份数据库、上传文件和密钥文件。

## 主动轮换 JWT 密钥

只有怀疑泄露或计划让全部会话失效时才轮换：

```bash
umask 077
openssl rand -base64 48 > /opt/smart-product-new/spring-server-secrets/jwt-secret
chmod 600 /opt/smart-product-new/spring-server-secrets/jwt-secret
cd /opt/smart-product-new/new-code
docker compose --env-file .env.server -f docker-compose.server.yml up -d --force-recreate spring-server
```

轮换后所有旧 Spring Token 失效，用户必须重新登录；Go 旧版 Token 不受影响。

## 健康检查

```bash
curl -I http://127.0.0.1:18000
curl http://127.0.0.1:18000/api/v1/data/user/login/key
```

## 禁止事项

- 不要对名称不明确的 `mysql`、`redis`、`nginx`、`server` 容器执行批量停止或删除。
- 不要在 Go 旧版目录执行 Spring 的 `docker compose down`。
- 不要让 Spring MySQL 与 Go MySQL 指向同一个宿主机数据目录。
- 不要把 `SPRING_SERVER_DATA_ROOT` 设置为 Go 的 `runtime-data` 或 `legacy-runtime-data`。
- 不要删除 `spring-runtime-data/prod` 来完成普通版本升级。
- 不要把 `jwt-secret`、`.env.server` 或密钥内容放进运行包、Git 或 Go 旧版目录。
