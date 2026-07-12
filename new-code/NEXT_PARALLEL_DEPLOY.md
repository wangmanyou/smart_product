# 升级版并行上线方案

本文档用于把功能迭代后的版本独立部署到服务器，不覆盖当前已经上线的稳定版本。

## 一、目标

当前稳定版继续运行：

```text
http://121.40.114.206:8000
```

升级并行版单独运行：

```text
http://121.40.114.206:28000
```

升级版的数据库、Redis、图片附件和 JWT 登录密钥全部独立。测试失败时，只需要停止升级版，不影响当前稳定版。

## 二、环境隔离

| 环境 | 前端入口 | 后端端口 | MySQL | Redis | 数据目录 |
| --- | --- | --- | --- | --- | --- |
| 当前稳定版 | `8000` | `18001` | `23306` | `26379` | `/opt/smart-product-new/deploy-data` |
| 升级并行版 | `28000` | `28001` | `33306` | `36379` | `/opt/smart-product-next/deploy-data` |

升级并行版容器：

| 服务 | 容器名 |
| --- | --- |
| 前端 Nginx | `smart-product-next-web` |
| Spring 后端 | `smart-product-next-spring` |
| MySQL | `smart-product-next-mysql` |
| Redis | `smart-product-next-redis` |

## 三、本地打包

在仓库根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File .\new-code\scripts\build-runtime-package.ps1
```

生成文件：

```text
new-code/release/smart-product-runtime.zip
```

上传这个压缩包到服务器：

```text
/opt/smart-product-next/smart-product-runtime.zip
```

## 四、服务器解压

```bash
mkdir -p /opt/smart-product-next
cd /opt/smart-product-next
unzip -o smart-product-runtime.zip -d new-code
cd /opt/smart-product-next/new-code
```

## 五、准备升级版环境变量和密钥

复制环境变量示例：

```bash
cp .env.next.example .env.next
chmod 600 .env.next
vi .env.next
```

建议配置：

```text
NEXT_MYSQL_ROOT_PASSWORD=换成升级版专用强密码
NEXT_SERVER_DATA_ROOT=../deploy-data
NEXT_JWT_SECRET_FILE=../server-secrets/jwt-secret
NEXT_JWT_ISSUER=smart-product-next
NEXT_JWT_AUDIENCE=smart-product-next-web
NEXT_JWT_TTL_SECONDS=86400
```

生成升级版 JWT 密钥：

```bash
mkdir -p /opt/smart-product-next/server-secrets
umask 077
openssl rand -base64 48 > /opt/smart-product-next/server-secrets/jwt-secret
chmod 600 /opt/smart-product-next/server-secrets/jwt-secret
```

创建升级版数据目录：

```bash
mkdir -p /opt/smart-product-next/deploy-data/mysql
mkdir -p /opt/smart-product-next/deploy-data/redis
mkdir -p /opt/smart-product-next/deploy-data/files
```

## 六、从当前稳定版复制数据

先创建备份目录：

```bash
BACKUP_DIR=/opt/smart-product-next/backups/from-stable-$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
echo "$BACKUP_DIR"
```

从当前稳定版导出数据库：

```bash
docker exec smart-product-parallel-mysql mysqldump -uroot -p'root' \
  --single-transaction \
  --default-character-set=utf8mb4 \
  knowledge > "$BACKUP_DIR/knowledge-from-stable.sql"
```

复制当前稳定版图片和附件：

```bash
tar -czf "$BACKUP_DIR/files-from-stable.tar.gz" -C /opt/smart-product-new/deploy-data files
tar -xzf "$BACKUP_DIR/files-from-stable.tar.gz" -C /opt/smart-product-next/deploy-data
```

说明：这里是复制一份资源到升级版目录，不会移动或删除当前稳定版文件。

## 七、启动升级版 MySQL 和 Redis

```bash
cd /opt/smart-product-next/new-code
docker compose --env-file .env.next -f docker-compose.next.yml up -d mysql redis
```

等待 MySQL 就绪。把下面命令里的密码换成 `.env.next` 中的 `NEXT_MYSQL_ROOT_PASSWORD`：

```bash
docker exec smart-product-next-mysql mysqladmin ping -uroot -p'升级版MySQL密码' --silent
```

如果返回 `mysqld is alive`，说明可以导入数据。

## 八、导入稳定版数据库到升级版

把下面命令里的密码换成 `.env.next` 中的 `NEXT_MYSQL_ROOT_PASSWORD`：

```bash
docker exec -i smart-product-next-mysql mysql -uroot -p'升级版MySQL密码' \
  -e "DROP DATABASE IF EXISTS knowledge; CREATE DATABASE knowledge DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

docker exec -i smart-product-next-mysql mysql -uroot -p'升级版MySQL密码' knowledge \
  < "$BACKUP_DIR/knowledge-from-stable.sql"
```

如果升级版代码需要额外的数据库升级 SQL，在导入全量数据后执行。例如：

```bash
docker exec -i smart-product-next-mysql mysql -uroot -p'升级版MySQL密码' knowledge \
  < db/你的升级脚本.sql
```

## 九、启动完整升级版

```bash
cd /opt/smart-product-next/new-code
docker compose --env-file .env.next -f docker-compose.next.yml up -d
```

查看状态：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

验证接口：

```bash
curl -I http://127.0.0.1:28000
curl -I http://127.0.0.1:28000/api/v1/data/user/login/key
```

浏览器访问：

```text
http://121.40.114.206:28000
```

## 十、重点测试内容

升级版测试时重点看：

| 模块 | 检查点 |
| --- | --- |
| 登录 | 能否正常登录、登录后是否能获取当前用户信息 |
| 权限 | 菜单、按钮、角色、用户管理是否符合预期 |
| 数据库字段 | 列表、详情、编辑、导入是否有字段缺失或报错 |
| 图片附件 | `/data/...` 图片和附件是否能正常显示 |
| 通知 | 导入、审批、详情跳转是否正确 |
| 统计 | 数据看板、访问记录是否正常 |

查看日志：

```bash
docker logs --tail 200 smart-product-next-spring
docker logs --tail 200 smart-product-next-web
```

## 十一、停止升级版

如果升级版测试失败，直接停止它：

```bash
cd /opt/smart-product-next/new-code
docker compose --env-file .env.next -f docker-compose.next.yml stop
```

这不会影响当前稳定版 `8000`。

## 十二、测试通过后切换到 8000

切换前先备份升级版 compose：

```bash
cd /opt/smart-product-next/new-code
cp docker-compose.next.yml docker-compose.next.yml.bak.$(date +%Y%m%d_%H%M%S)
```

停止当前稳定版前端，释放 `8000`：

```bash
docker stop smart-product-parallel-web
```

把升级版前端端口从 `28000` 改成 `8000`：

```bash
sed -i 's/"28000:80"/"8000:80"/' docker-compose.next.yml
docker compose --env-file .env.next -f docker-compose.next.yml up -d web
```

验证：

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl -I http://127.0.0.1:8000
curl -I http://127.0.0.1:8000/api/v1/data/user/login/key
```

浏览器访问：

```text
http://121.40.114.206:8000
```

## 十三、切换失败回退

如果切换后有问题：

```bash
cd /opt/smart-product-next/new-code
sed -i 's/"8000:80"/"28000:80"/' docker-compose.next.yml
docker compose --env-file .env.next -f docker-compose.next.yml up -d web

docker start smart-product-parallel-web
```

这样当前稳定版会重新回到 `8000`，升级版回到 `28000`。

## 十四、不要做的事

- 不要把升级版直接解压到 `/opt/smart-product-new/new-code`。
- 不要让升级版挂载 `/opt/smart-product-new/deploy-data`。
- 不要让两个 MySQL 容器共用同一个物理数据目录。
- 不要删除 `/opt/smart-product-new/deploy-data`。
- 不要在没有备份时执行 `docker compose down -v`。
- 不要把 `.env.next` 和 `server-secrets/jwt-secret` 提交到 Git。
