# 新版本并行上线操作手册

本文说明如何在服务器已有项目运行的情况下，并行部署新版本，验证通过后再切换正式访问入口。

## 一、上线原则

| 原则 | 说明 |
| --- | --- |
| 旧系统先不动 | 上线前保持旧系统继续运行，避免影响当前用户 |
| 新系统旁路启动 | 新系统使用独立端口、独立容器名、独立测试数据目录 |
| 先用测试库验证 | 使用生产库备份恢复到测试库，避免直接修改生产库 |
| 最后再切流 | 验证通过后，通过 Nginx 或域名入口切换到新系统 |
| 旧系统保留一段时间 | 切换后旧系统先保留，便于紧急回滚 |

## 二、推荐服务器目录

建议在服务器上准备如下目录：

```bash
/opt/smart-product-new
├── new-code
├── deploy
├── stage-data
│   ├── mysql
│   ├── redis
│   └── files
├── deploy-data
│   └── files
└── backups
```

说明：

- `new-code`：新版本代码。
- `deploy`：Nginx 配置。
- `stage-data`：旁路验证环境数据。
- `deploy-data/files`：正式资源文件目录。
- `backups`：数据库和资源文件备份。

## 三、第一步：上传新版本代码

在本地将以下目录上传到服务器：

```text
new-code
deploy
db
```

上传后服务器目录示例：

```bash
cd /opt/smart-product-new
ls
```

应能看到：

```text
new-code
deploy
db
```

## 四、第二步：备份当前线上数据

先查看当前线上容器名称：

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

创建备份目录：

```bash
mkdir -p /opt/smart-product-new/backups/$(date +%F-%H%M)
```

备份数据库：

```bash
docker exec <旧系统MySQL容器名> mysqldump -uroot -p'root' --default-character-set=utf8mb4 knowledge > /opt/smart-product-new/backups/$(date +%F-%H%M)/knowledge.sql
```

如果上面的命令因为时间目录不一致不好找，也可以先固定一个目录：

```bash
BACKUP_DIR=/opt/smart-product-new/backups/$(date +%F-%H%M)
mkdir -p $BACKUP_DIR
docker exec <旧系统MySQL容器名> mysqldump -uroot -p'root' --default-character-set=utf8mb4 knowledge > $BACKUP_DIR/knowledge.sql
```

备份资源文件：

```bash
tar -czf $BACKUP_DIR/files.tar.gz <旧系统资源文件目录>
```

示例：

```bash
tar -czf $BACKUP_DIR/files.tar.gz /data/smart-product/uploads
```

## 五、第三步：启动旁路验证环境

进入新版本目录：

```bash
cd /opt/smart-product-new/new-code
```

先构建前端：

```bash
cd frontend-app
npm ci
npm run build
```

回到 `new-code`：

```bash
cd ..
```

启动旁路环境：

```bash
docker compose -f docker-compose.stage.yml up -d --build
```

旁路环境端口：

| 服务 | 端口 |
| --- | --- |
| 前端访问 | `18000` |
| 后端接口 | `18001` |
| 测试 MySQL | `23306` |
| 测试 Redis | `26379` |

访问地址：

```text
http://服务器IP:18000
```

此时新系统和旧系统是并行运行的，不会抢旧系统端口，也不会使用旧系统数据库。

## 六、第四步：恢复生产库备份到旁路测试库

把第二步备份出来的 `knowledge.sql` 导入旁路 MySQL：

```bash
docker exec -i smart-product-stage-mysql mysql -uroot -p'root' knowledge < $BACKUP_DIR/knowledge.sql
```

如果需要把旧资源文件复制到旁路资源目录：

```bash
mkdir -p /opt/smart-product-new/stage-data/files
tar -xzf $BACKUP_DIR/files.tar.gz -C /opt/smart-product-new/stage-data/files
```

注意：如果压缩包里带了完整路径，解压后需要确认最终文件是否在：

```text
/opt/smart-product-new/stage-data/files
```

新系统访问资源时，对应容器内路径是：

```text
/app/uploads
```

## 七、第五步：旁路环境验证

使用下面地址验证：

```text
http://服务器IP:18000
```

建议至少验证：

| 验证项 | 检查内容 |
| --- | --- |
| 登录 | 管理员、普通用户是否能登录 |
| 知识中心 | 是否能看到授权场景 |
| 知识列表 | 字段是否显示完整 |
| 知识详情 | 字段、图片、视频、附件是否正常 |
| 搜索 | 关键词搜索是否可用 |
| 新增知识 | 是否能正常新增 |
| 编辑知识 | 是否能正常编辑或进入审批 |
| 删除知识 | 是否能正常删除或进入审批 |
| 审批 | 通过、驳回后数据是否正确 |
| 通知 | 导入和审批通知是否出现 |
| 权限 | 普通用户菜单和操作范围是否正确 |

查看新系统日志：

```bash
docker logs -f smart-product-stage-spring
```

查看旁路容器状态：

```bash
docker compose -f docker-compose.stage.yml ps
```

## 八、第六步：正式切换前停写

正式切换前，建议选择低峰期操作。

切换前要做到：

1. 通知用户暂停新增、编辑、删除、导入。
2. 暂停旧系统写入入口，或临时关闭旧前端。
3. 再做一次最新数据库备份。
4. 再做一次最新资源文件备份。

再次备份正式库：

```bash
BACKUP_DIR=/opt/smart-product-new/backups/final-$(date +%F-%H%M)
mkdir -p $BACKUP_DIR
docker exec <旧系统MySQL容器名> mysqldump -uroot -p'root' --default-character-set=utf8mb4 knowledge > $BACKUP_DIR/knowledge.sql
tar -czf $BACKUP_DIR/files.tar.gz <旧系统资源文件目录>
```

## 九、第七步：升级正式库

如果正式库尚未执行本次权限、审批、通知相关升级脚本，需要执行：

```bash
cd /opt/smart-product-new
docker exec -i <正式MySQL容器名> mysql -uroot -p'root' knowledge < new-code/db/001_auth_approval_upgrade.sql
```

如果运行包解压目录不同，请把 `new-code/db/001_auth_approval_upgrade.sql` 改成实际脚本路径。

执行前必须确认已经完成正式库备份。

## 十、第八步：正式启动新系统

正式启动有两种方式。

### 方式 A：新系统接管全套 Docker

适合旧系统停用后，新版本自己启动 MySQL、Redis、后端和前端。

进入新版本目录：

```bash
cd /opt/smart-product-new/new-code
```

确认 `docker-compose.yml` 中的正式资源目录：

```text
../deploy-data/files:/app/uploads
```

把正式资源文件放到：

```text
/opt/smart-product-new/deploy-data/files
```

启动正式新系统：

```bash
docker compose -f docker-compose.yml up -d --build
```

正式新系统默认端口：

| 服务 | 端口 |
| --- | --- |
| 前端 | `8000` |
| 后端 | `8001` |
| MySQL | `13306` |
| Redis | `16379` |

### 方式 B：新系统复用旧 MySQL 和 Redis

适合旧系统的数据库和 Redis 需要继续保留，只替换应用服务。

这种方式需要把新后端的数据库地址改成旧 MySQL 的地址，把 Redis 地址改成旧 Redis 的地址。

原则是：

```text
新 Spring + 新 Web 连接旧正式 MySQL/Redis
```

如果采用此方式，不建议直接使用当前 `docker-compose.yml`，因为它会尝试启动新的 MySQL 和 Redis。

应单独准备一个只包含：

- `spring-server`
- `web`

的 Compose 文件，并把：

```text
SPRING_DATASOURCE_URL
SPRING_DATA_REDIS_HOST
APP_UPLOAD_DIR
```

改为正式环境实际地址。

## 十一、第九步：Nginx 切流

如果服务器最外层还有一个总 Nginx，推荐最后只切 Nginx。

切换前旧系统可能是：

```nginx
proxy_pass http://127.0.0.1:旧端口;
```

切换到新系统：

```nginx
proxy_pass http://127.0.0.1:8000;
```

修改后检查配置：

```bash
nginx -t
```

重载 Nginx：

```bash
nginx -s reload
```

如果 Nginx 也是 Docker 容器，则使用：

```bash
docker exec <nginx容器名> nginx -s reload
```

## 十二、第十步：切换后观察

切换后至少观察以下内容：

```bash
docker logs -f smart-product-spring
docker logs -f smart-product-web
```

重点检查：

- 登录是否正常。
- 知识列表是否正常。
- 图片和附件是否正常。
- 审批是否正常。
- 通知是否正常。
- 数据库是否有异常报错。

建议旧系统至少保留 1 到 3 天，不要立即删除。

## 十三、回滚方式

如果新系统切换后出现严重问题：

1. Nginx 切回旧系统端口。
2. 停止新系统应用容器。
3. 如果正式库已被新系统写入，需要根据备份决定是否恢复数据库。

Nginx 回切示例：

```nginx
proxy_pass http://127.0.0.1:旧端口;
```

重载：

```bash
nginx -t
nginx -s reload
```

停止新系统：

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.yml down
```

如果只是停止旁路验证环境：

```bash
docker compose -f docker-compose.stage.yml down
```

## 十四、最推荐执行顺序

| 步骤 | 操作 |
| --- | --- |
| 1 | 上传新版本代码 |
| 2 | 备份当前生产数据库和资源文件 |
| 3 | 启动旁路验证环境 |
| 4 | 将生产备份恢复到旁路测试库 |
| 5 | 在 `18000` 端口完整验证新系统 |
| 6 | 低峰期暂停旧系统写入 |
| 7 | 再次备份正式数据库和资源文件 |
| 8 | 执行正式库升级脚本 |
| 9 | 启动正式新系统 |
| 10 | Nginx 切换到新系统 |
| 11 | 观察运行情况 |
| 12 | 保留旧系统用于回滚 |
