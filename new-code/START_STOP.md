# 新项目启动与关闭说明

本文档只针对新项目并行部署环境，不影响旧线上项目。

## 当前并行环境

服务器目录：

```bash
/opt/smart-product-new/new-code
```

Compose 文件：

```bash
docker-compose.parallel.yml
```

新项目端口：

| 服务 | 容器名 | 访问端口 |
| --- | --- | --- |
| 前端 | smart-product-parallel-web | 18000 |
| 后端 | smart-product-parallel-spring | 18001 |
| MySQL | smart-product-parallel-mysql | 23306 |
| Redis | smart-product-parallel-redis | 26379 |

旧项目容器 `nginx`、`server`、`mysql`、`redis` 不会被下面命令影响。

## 启动新项目

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.parallel.yml up -d
```

访问地址：

```text
http://服务器IP:18000
```

## 查看运行状态

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.parallel.yml ps
```

## 查看后端日志

```bash
docker logs -f smart-product-parallel-spring
```

## 临时停止新项目

只停止容器，容器和数据都会保留：

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.parallel.yml stop
```

临时停止后，再次启动：

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.parallel.yml start
```

## 关闭并删除新项目容器

删除的是新项目容器，不会删除数据库文件、附件文件，也不会影响旧项目：

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.parallel.yml down
```

再次启动：

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.parallel.yml up -d
```

## 健康检查

```bash
curl -I http://127.0.0.1:18000
curl http://127.0.0.1:18000/api/v1/data/user/login/key
```

## 注意事项

不要执行下面这些命令，否则会影响旧线上项目：

```bash
docker stop nginx server mysql redis
docker rm nginx server mysql redis
```

也不要在旧项目目录里执行：

```bash
docker compose down
```
