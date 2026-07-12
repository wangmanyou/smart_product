# 服务器当前部署情况说明

本文档记录 121.40.114.206 服务器当前真实运行状态，主要用于后续维护、交接、回滚和再次上线前确认。当前线上运行环境以服务器目录 `/opt/smart-product-new/new-code/docker-compose.parallel.yml` 为准。

## 一、当前结论

当前新项目已经接管线上入口：

```text
访问地址：http://121.40.114.206:8000
```

旧项目已经停止，但容器和备份仍保留，可以用于必要时回查或恢复。

当前不要直接把本地未测试代码覆盖到服务器。服务器正在运行的是一套已经上线的运行包，本地代码里还有未完全测试的功能改动，后续应单独打包、上传、验证后再替换。

## 二、当前新项目容器

当前新项目使用独立容器、独立网络、独立数据目录，容器名前缀为 `smart-product-parallel-*`。

| 服务 | 容器名 | 宿主机端口 | 容器端口 | 说明 |
| --- | --- | --- | --- | --- |
| 前端 Nginx | `smart-product-parallel-web` | `8000` | `80` | 当前浏览器访问入口 |
| Spring 后端 | `smart-product-parallel-spring` | `18001` | `8001` | 前端通过 Nginx 反向代理访问 |
| MySQL | `smart-product-parallel-mysql` | `23306` | `3306` | 新项目独立数据库 |
| Redis | `smart-product-parallel-redis` | `26379` | `6379` | 新项目独立缓存 |

查看当前容器：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 三、当前目录结构

服务器主目录：

```text
/opt/smart-product-new/
├── new-code/                 # 当前新项目运行包目录
│   ├── docker-compose.parallel.yml
│   ├── backend-app/app.jar
│   ├── frontend-dist/
│   └── deploy/
├── deploy-data/              # 当前新项目运行数据，不能随便删除
│   ├── mysql/                # 新项目 MySQL 物理数据
│   ├── redis/                # 新项目 Redis 数据
│   └── files/                # 新项目图片、附件等上传资源
├── backups/                  # 新项目上线过程备份
└── smart-product-runtime.zip # 曾经上传的运行包
```

新项目图片和附件当前指向：

```text
宿主机：/opt/smart-product-new/deploy-data/files
容器内：/app/uploads
访问路径：http://121.40.114.206:8000/data/...
```

也就是说，数据库里保存的 `/data/...` 文件地址，最终会由后端从 `/app/uploads` 读取，而 `/app/uploads` 实际挂载的是服务器的 `/opt/smart-product-new/deploy-data/files`。

## 四、旧项目状态

旧项目容器已经停止：

| 旧容器 | 原用途 | 原端口 |
| --- | --- | --- |
| `nginx` | 旧项目前端入口 | `8000` |
| `server` | 旧项目后端 | `9000` |
| `mysql` | 旧项目 MySQL | `13306` |
| `redis` | 旧项目 Redis | `16379` |

查看旧容器是否仍停止：

```bash
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "nginx|server|mysql|redis"
```

旧项目备份位置：

```text
/opt/smart-product-old-backup/old-project-20260710_205918/
```

备份内容包括：

| 文件 | 说明 |
| --- | --- |
| `knowledge-old.sql` | 旧项目 MySQL 数据库备份 |
| `testdata-old-files.tar.gz` | 旧项目上传资源备份 |
| `install-script-old.tar.gz` | 旧项目安装脚本和运行文件备份 |
| `docker-ps-before-stop.txt` | 停止旧项目前容器状态 |
| `old-project-containers-inspect.json` | 旧容器详细配置 |

旧项目资源原路径：

```text
/data/testdata
```

## 五、这次端口切换做了什么

这次只是把新项目前端入口从 `18000` 改回了 `8000`，没有改数据库、没有改图片目录、没有改后端端口。

你执行过的关键命令如下：

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep 8000 || true
ss -lntp | grep ':8000' || true

sed -i 's/"18000:80"/"8000:80"/' docker-compose.parallel.yml

docker compose -f docker-compose.parallel.yml up -d web
```

逐行解释：

| 命令 | 作用 |
| --- | --- |
| `docker ps --format "table {{.Names}}\t{{.Ports}}" \| grep 8000 \|\| true` | 查看当前正在运行的 Docker 容器里有没有占用 `8000` 端口。后面的 `|| true` 表示即使没查到，也不要报错中断。 |
| `ss -lntp \| grep ':8000' \|\| true` | 查看服务器系统层面有没有程序监听 `8000` 端口。 |
| `sed -i 's/"18000:80"/"8000:80"/' docker-compose.parallel.yml` | 在当前 compose 文件里，把前端端口映射从 `18000:80` 改成 `8000:80`。意思是外部访问服务器 `8000`，转发到前端容器内部 `80`。 |
| `docker compose -f docker-compose.parallel.yml up -d web` | 只按新配置重新启动前端 Web 容器，不需要重建数据库和 Redis。 |

端口映射可以这样理解：

```text
8000:80
左边 8000：用户访问服务器的端口
右边 80：前端 Nginx 容器内部端口
```

所以浏览器访问的是：

```text
http://121.40.114.206:8000
```

不是访问容器里的 `80`。

## 六、常用操作

进入新项目目录：

```bash
cd /opt/smart-product-new/new-code
```

查看新项目状态：

```bash
docker compose -f docker-compose.parallel.yml ps
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

查看后端日志：

```bash
docker logs --tail 200 smart-product-parallel-spring
```

查看前端 Nginx 日志：

```bash
docker logs --tail 200 smart-product-parallel-web
```

重启前端：

```bash
docker compose -f docker-compose.parallel.yml restart web
```

重启后端：

```bash
docker compose -f docker-compose.parallel.yml restart spring-server
```

重启整个新项目：

```bash
docker compose -f docker-compose.parallel.yml up -d
```

停止整个新项目：

```bash
docker compose -f docker-compose.parallel.yml stop
```

再次启动整个新项目：

```bash
docker compose -f docker-compose.parallel.yml start
```

## 七、验证访问是否正常

服务器本机验证：

```bash
curl -I http://127.0.0.1:8000
curl -I http://127.0.0.1:8000/api/v1/data/user/login/key
```

浏览器验证：

```text
http://121.40.114.206:8000
```

登录后如果页面接口异常，优先看：

```bash
docker logs --tail 200 smart-product-parallel-spring
docker logs --tail 200 smart-product-parallel-web
```

## 八、回滚端口到 18000

如果需要临时把新项目入口改回 `18000`：

```bash
cd /opt/smart-product-new/new-code
sed -i 's/"8000:80"/"18000:80"/' docker-compose.parallel.yml
docker compose -f docker-compose.parallel.yml up -d web
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

然后访问：

```text
http://121.40.114.206:18000
```

## 九、后续重新上线建议

因为现在存在三种状态：

| 状态 | 说明 | 建议 |
| --- | --- | --- |
| 线上运行版本 | 当前服务器正在跑的版本 | 作为稳定版本保留 |
| 本地代码版本 | 本机 `new-code` 里的代码 | 先本地测试，不要直接覆盖线上 |
| 已改但未测功能 | 本地已有部分功能修改 | 测试通过后再打包上线 |

后续上线建议流程：

1. 本地确认功能正常。
2. 本地重新打包运行包。
3. 上传压缩包到服务器。
4. 备份服务器当前 `new-code` 目录和数据库。
5. 解压替换运行包。
6. 保留 `/opt/smart-product-new/deploy-data`，不要删除。
7. 使用 `docker compose -f docker-compose.parallel.yml up -d` 启动。
8. 用 `http://121.40.114.206:8000` 验证。

上线前至少执行一次数据库和图片备份：

```bash
BACKUP_DIR=/opt/smart-product-new/backups/before-release-$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"

docker exec smart-product-parallel-mysql mysqldump -uroot -p'root' \
  --single-transaction \
  --default-character-set=utf8mb4 \
  knowledge > "$BACKUP_DIR/knowledge.sql"

tar -czf "$BACKUP_DIR/files.tar.gz" -C /opt/smart-product-new/deploy-data files
tar -czf "$BACKUP_DIR/new-code.tar.gz" -C /opt/smart-product-new new-code

ls -lh "$BACKUP_DIR"
```

## 十、禁止事项

- 不要删除 `/opt/smart-product-new/deploy-data`，这里是真实数据库、Redis 和上传文件。
- 不要让旧项目和新项目同时占用 `8000`。
- 不要把本地未测试版本直接覆盖线上。
- 不要把旧项目的 `mysql` 容器和新项目的 `smart-product-parallel-mysql` 混用。
- 不要把旧项目 `/data/testdata` 当成当前新项目图片目录；当前新项目图片目录是 `/opt/smart-product-new/deploy-data/files`。
- 不要在没有备份的情况下执行 `docker compose down -v`，`-v` 会删除卷数据，风险很高。
