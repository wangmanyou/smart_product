# Smart Product 生产上线标准说明

> 适用版本：`smart-product-next`
>
> 适用生产目录：`/opt/smart-product-next`
>
> 编写日期：2026-09-04
>
> 本文用于以后功能更新时的标准上线、验证、回滚和服务器重启恢复。

---

## 1. 生产环境边界

### 1.1 主业务服务

主业务由以下四个容器组成：

```text
smart-product-next-web
smart-product-next-spring
smart-product-next-mysql
smart-product-next-redis
```

主业务 Compose 文件：

```text
/opt/smart-product-next/new-code/docker-compose.next.yml
```

主业务环境文件：

```text
/opt/smart-product-next/new-code/.env.next
```

主业务数据目录由 `.env.next` 中的 `NEXT_SERVER_DATA_ROOT` 指定。普通版本升级不得删除该目录。

主要端口：

| 用途 | 地址 |
| --- | --- |
| 主业务 Web | `http://服务器IP:8000` |
| Spring 后端内部端口 | `127.0.0.1:28001` |
| 主业务 MySQL | `127.0.0.1:33306` |
| 主业务 Redis | `127.0.0.1:36379` |

### 1.2 RAGFlow 服务

RAGFlow 目录：

```text
/opt/smart-product-next/new-code/deploy/ragflow/vendor/v0.26.4
```

RAGFlow Compose 项目：

```text
smart-product-ragflow
```

RAGFlow API：

```text
http://127.0.0.1:9380
```

RAGFlow 主要容器包括：

```text
smart-product-ragflow-ragflow-cpu-1
smart-product-ragflow-ragflow-worker-1
smart-product-ragflow-mysql-1
smart-product-ragflow-redis-1
smart-product-ragflow-es01-1
smart-product-ragflow-minio-1
NATS 容器
```

RAGFlow 数据卷、RAGFlow MySQL、Elasticsearch、MinIO 和 Redis 不属于主业务代码包。**主业务功能更新时默认不重启、不重建、不删除 RAGFlow。**

---

## 2. 先判断本次更新属于哪一类

### A. 只修改前端或后端代码

执行本文第 3～8 节即可：

```text
本地重新打包 → 上传运行包 → 备份 → 替换代码 → 启动 Spring/Web → 验证
```

不需要操作 RAGFlow。

### B. 修改数据库表结构或初始化数据

除第 3～8 节外，必须先备份数据库，再执行本次更新明确要求的 SQL。

不要把所有历史 SQL 文件无差别重复执行。只执行本次版本对应的升级 SQL。

### C. 只新增或修改知识内容

不需要重新发布前端和后端代码。使用现有知识库导入功能即可。

导入后等待 RAGFlow Worker 解析完成，必须确认：

```text
run=DONE
chunks>0
tokens>0
```

在文档仍为 `RUNNING`、`chunks=0` 时，AI 返回 `No chunk found` 属于正常的处理中状态，不要重复提交解析。

### D. 修改 RAGFlow 版本、解析配置或 Worker 参数

这是独立变更，不能和普通主业务功能更新混在一起。必须单独备份 RAGFlow 配置和数据状态，并优先保证主业务不受影响。

当前 Worker 的生产安全参数为：

```text
workers=1
mem_limit=1536m
memswap_limit=2g
cpus=1.00
restart=unless-stopped
THREAD_POOL_MAX_WORKERS=1
DOC_BULK_SIZE=1
EMBEDDING_BATCH_SIZE=1
```

没有明确需求时，不要修改这些参数。

---

## 3. 本地构建上线包

### 3.1 版本冻结

上线前必须确认本次上线的是已经测试过的版本。建议先提交代码或至少记录当前提交号，不要直接把包含无关改动的工作区打成生产包：

```powershell
Set-Location 'D:\coder\code-store\go\smart_product'
git rev-parse --short HEAD
git status --short
git diff --stat
```

如果 `git status --short` 中出现与本次功能无关的改动，先整理工作区再打包。

### 3.2 构建运行包
在 Windows PowerShell 中执行：

```powershell
Set-Location 'D:\coder\code-store\go\smart_product'
powershell -ExecutionPolicy Bypass -File '.\new-code\scripts\build-runtime-package.ps1'
```

确认产物：

```powershell
Get-Item '.\new-code\release\smart-product-runtime.zip' |
  Select-Object FullName,Length,LastWriteTime
```

上线包必须存在且大小明显大于 0：

```powershell
Test-Path '.\new-code\release\smart-product-runtime.zip'
```

检查包内关键文件：

```powershell
tar -tf '.\new-code\release\smart-product-runtime.zip' |
  Select-String 'backend-app/app.jar|frontend-dist/index.html|docker-compose.next.yml|deploy/nginx.conf'
```

至少应包含：

```text
backend-app/app.jar
frontend-dist/index.html
docker-compose.next.yml
deploy/nginx.conf
```

如果缺少 `frontend-dist/index.html`，禁止上传和上线。

---

## 4. 上传到服务器

推荐先上传到临时文件，不要直接覆盖正在使用的文件：

```powershell
scp -i 'C:\路径\你的私钥文件.pem' `
  '.\new-code\release\smart-product-runtime.zip' `
  'root@121.40.114.206:/opt/smart-product-next/incoming-smart-product-runtime.zip'
```

如果服务器提示：

```text
Permission denied (publickey)
```

说明当前电脑没有使用服务器认可的 SSH 私钥。不要反复重试，也不要把私钥提交到项目中。应当：

1. 使用服务器实际绑定的私钥并通过 `-i` 指定；或
2. 使用阿里云控制台的网页终端上传；或
3. 使用已经配置好该服务器密钥的运维电脑上传。

不要因为上传失败而修改服务器 SSH 配置。

---

## 5. 上线前备份和检查

SSH 登录服务器：

```bash
ssh -i /path/to/your-key.pem root@121.40.114.206
```

进入目录并设置变量：

```bash
set -Eeuo pipefail

APP_ROOT="/opt/smart-product-next"
CURRENT_DIR="$APP_ROOT/new-code"
INCOMING="$APP_ROOT/incoming-smart-product-runtime.zip"
TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="$APP_ROOT/backups/pre-deploy-$TS"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

cd "$APP_ROOT"
```

确认上传包存在：

```bash
test -s "$INCOMING"
unzip -t "$INCOMING"
```

确认主业务当前状态：

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

for C in \
  smart-product-next-web \
  smart-product-next-spring \
  smart-product-next-mysql \
  smart-product-next-redis
do
  STATUS="$(docker inspect -f '{{.State.Status}}' "$C" 2>/dev/null || echo missing)"
  echo "$C: $STATUS"
  test "$STATUS" = running
 done
```

如果任一主业务容器不是 `running`，停止本次上线，先处理现有故障。

备份当前容器状态、配置和数据库：

```bash
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' \
  > "$BACKUP_DIR/docker-ps-before.txt"

docker inspect \
  smart-product-next-web \
  smart-product-next-spring \
  smart-product-next-mysql \
  smart-product-next-redis \
  > "$BACKUP_DIR/main-containers-before.json"

cp -a "$CURRENT_DIR/.env.next" "$BACKUP_DIR/.env.next"
cp -a "$CURRENT_DIR/deploy" "$BACKUP_DIR/deploy"
cp -a "$CURRENT_DIR/docker-compose.next.yml" "$BACKUP_DIR/docker-compose.next.yml"

if [ -d "$CURRENT_DIR/server-secrets" ]; then
  cp -a "$CURRENT_DIR/server-secrets" "$BACKUP_DIR/server-secrets"
fi

docker exec smart-product-next-mysql \
  sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers knowledge' \
  > "$BACKUP_DIR/knowledge.sql"

chmod -R go-rwx "$BACKUP_DIR"
echo "BACKUP_DIR=$BACKUP_DIR"
```

必须记录命令最后输出的：

```text
BACKUP_DIR=...
```

---

## 6. 替换主业务运行包

本步骤只替换代码目录，不删除数据目录，不删除密钥，不操作 RAGFlow 数据卷。

先停止 Web 和 Spring，保留 MySQL、Redis 继续运行：

```bash
cd "$APP_ROOT"

docker compose \
  --project-name smart-product-next \
  --env-file "$CURRENT_DIR/.env.next" \
  -f "$CURRENT_DIR/docker-compose.next.yml" \
  stop spring-server web
```

保留旧代码目录：

```bash
OLD_DIR="$APP_ROOT/new-code.before-$TS"
mv "$CURRENT_DIR" "$OLD_DIR"
```

解压新包：

```bash
unzip -q "$INCOMING" -d "$APP_ROOT/new-code"
NEW_DIR="$APP_ROOT/new-code"
```

确认包结构正确：

```bash
test -s "$NEW_DIR/backend-app/app.jar"
test -s "$NEW_DIR/frontend-dist/index.html"
test -s "$NEW_DIR/docker-compose.next.yml"
test -s "$NEW_DIR/deploy/nginx.conf"
```

如果任一 `test` 失败，立即执行第 10 节回滚，不要启动新服务。

恢复生产环境配置：

```bash
cp -a "$OLD_DIR/.env.next" "$NEW_DIR/.env.next"
chmod 600 "$NEW_DIR/.env.next"
```

如果生产密钥文件位于运行包外，必须继续使用原文件。检查：

```bash
grep -nE 'NEXT_SERVER_DATA_ROOT|NEXT_JWT_SECRET_FILE|APP_AI_ENABLED|RAGFLOW_BASE_URL|RAGFLOW_API_KEY' \
  "$NEW_DIR/.env.next"
```

生产环境中的以下内容不得被新包示例文件覆盖：

```text
.env.next
NEXT_SERVER_DATA_ROOT 指向的数据目录
NEXT_JWT_SECRET_FILE 指向的 JWT 密钥
RAGFLOW_API_KEY
LLM_API_KEY
NEXT_MYSQL_ROOT_PASSWORD
```

确保权限和静态文件可读：

```bash
chmod -R a+rX "$NEW_DIR/frontend-dist" \
  "$NEW_DIR/backend-app" \
  "$NEW_DIR/deploy" \
  "$NEW_DIR/db"
```

---

## 7. 保留 RAGFlow 生产安全配置

普通主业务版本升级不应覆盖正在运行的 RAGFlow 安全配置。若新包中包含 RAGFlow 目录，先保留旧服务器配置：

```bash
NEW_RAG="$NEW_DIR/deploy/ragflow/vendor/v0.26.4"
OLD_RAG="$OLD_DIR/deploy/ragflow/vendor/v0.26.4"

mkdir -p "$NEW_RAG"

for F in .env docker-compose.safety.yml docker-compose.worker-safety.yml; do
  if [ -f "$OLD_RAG/$F" ]; then
    cp -a "$OLD_RAG/$F" "$NEW_RAG/$F"
    echo "已保留 RAGFlow 生产配置：$F"
  fi
done
```

检查 RAGFlow 配置，但不要启动或重建 RAGFlow：

```bash
if [ -f "$NEW_RAG/docker-compose.worker-safety.yml" ]; then
  docker compose \
    --project-name smart-product-ragflow \
    --env-file "$NEW_RAG/.env" \
    -f "$NEW_RAG/docker-compose.yml" \
    -f "$NEW_RAG/docker-compose.safety.yml" \
    -f "$NEW_RAG/docker-compose.worker-safety.yml" \
    config --quiet
else
  docker compose \
    --project-name smart-product-ragflow \
    --env-file "$NEW_RAG/.env" \
    -f "$NEW_RAG/docker-compose.yml" \
    -f "$NEW_RAG/docker-compose.safety.yml" \
    config --quiet
fi
```

普通功能上线阶段禁止执行：

```bash
docker compose down
docker compose down -v
docker system prune
docker restart smart-product-next-web
docker restart smart-product-next-spring
```

---

## 8. 数据库升级和启动主业务

### 8.1 没有数据库变更

不执行 SQL，直接进入启动步骤。

### 8.2 有数据库变更

先确认本次版本说明指定的 SQL 文件，再执行。例如：

```bash
cd "$NEW_DIR"

# 仅示例：必须替换为本次版本明确要求执行的 SQL 文件
SQL_FILE="db/003_ai_knowledge_upgrade.sql"
test -s "$SQL_FILE"

# 执行前再次保存备份目录
printf '使用数据库备份：%s\n' "$BACKUP_DIR"

docker exec -i smart-product-next-mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" knowledge' \
  < "$SQL_FILE"
```

不得在目标数据库为空、数据目录未确认或备份失败时执行恢复/迁移操作。

### 8.3 启动 Spring

```bash
cd "$NEW_DIR"

docker compose \
  --project-name smart-product-next \
  --env-file .env.next \
  -f docker-compose.next.yml \
  up -d --no-recreate mysql redis

docker compose \
  --project-name smart-product-next \
  --env-file .env.next \
  -f docker-compose.next.yml \
  up -d --force-recreate spring-server
```

等待 10～20 秒并检查：

```bash
docker inspect smart-product-next-spring \
  --format 'status={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}}'

docker logs --tail 120 smart-product-next-spring
```

Spring 正常后再启动 Web：

```bash
docker compose \
  --project-name smart-product-next \
  --env-file .env.next \
  -f docker-compose.next.yml \
  up -d --force-recreate web
```

如果遇到：

```text
Bind for 0.0.0.0:8000 failed: port is already allocated
```

先检查端口占用，不要重复执行 `up`：

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E '8000|smart-product-next-web'
```

---

## 9. 上线验证清单

### 9.1 容器验证

```bash
cd /opt/smart-product-next/new-code

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

for C in \
  smart-product-next-web \
  smart-product-next-spring \
  smart-product-next-mysql \
  smart-product-next-redis
do
  docker inspect "$C" \
    --format '{{.Name}} status={{.State.Status}} exit={{.State.ExitCode}} oom={{.State.OOMKilled}} restart={{.HostConfig.RestartPolicy.Name}}'
done
```

四个主业务容器都应满足：

```text
status=running
exit=0
oom=false
restart=always
```

### 9.2 HTTP 验证

```bash
curl -I --max-time 10 http://127.0.0.1:8000
curl -fsS --max-time 10 http://127.0.0.1:8000/api/v1/data/user/login/key
```

如果返回 `502 Bad Gateway`，检查 Spring 是否运行以及 Web 配置中的 upstream，不要先重启所有容器：

```bash
docker logs --tail 150 smart-product-next-spring
docker logs --tail 100 smart-product-next-web
```

### 9.3 浏览器验证

访问：

```text
http://121.40.114.206:8000
```

至少验证：

1. 登录；
2. 知识列表和详情；
3. 新增、修改、删除权限；
4. 场景权限隔离；
5. AI 问答入口；
6. 新建和切换会话；
7. 普通用户无法访问未授权场景。

### 9.4 AI/RAG 验证

如果本次只是代码更新，确认 RAGFlow 和 Worker 没有被误操作：

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' \
  | grep -E 'ragflow|nats|es01|minio|redis|mysql'
```

如果本次包含知识导入，等待文档状态：

```text
run=DONE
chunks>0
tokens>0
```

文档处于 `RUNNING` 时不要重复提交解析；出现 `No chunk found` 时先检查 Chunk 状态。

---

## 10. 回滚流程

出现以下情况之一应回滚：

- 新包缺少 `frontend-dist/index.html` 或 `backend-app/app.jar`；
- Spring 启动失败；
- Web 返回 502 且无法快速修复；
- 登录、权限或核心数据操作异常；
- 数据库升级失败且无法确认影响范围。

回滚只替换代码，不删除数据：

```bash
set -Eeuo pipefail

APP_ROOT="/opt/smart-product-next"
FAILED_DIR="$APP_ROOT/new-code.failed-$(date +%Y%m%d_%H%M%S)"
OLD_DIR="$APP_ROOT/new-code.before-替换为实际时间戳"

cd "$APP_ROOT"

docker compose \
  --project-name smart-product-next \
  --env-file "$APP_ROOT/new-code/.env.next" \
  -f "$APP_ROOT/new-code/docker-compose.next.yml" \
  stop spring-server web

mv "$APP_ROOT/new-code" "$FAILED_DIR"
mv "$OLD_DIR" "$APP_ROOT/new-code"

cd "$APP_ROOT/new-code"
docker compose \
  --project-name smart-product-next \
  --env-file .env.next \
  -f docker-compose.next.yml \
  up -d --no-recreate mysql redis

docker compose \
  --project-name smart-product-next \
  --env-file .env.next \
  -f docker-compose.next.yml \
  up -d --force-recreate spring-server web
```

如果本次数据库升级已经执行且确实造成问题，先停止主业务并确认备份目录，再恢复：

```bash
BACKUP_DIR="/opt/smart-product-next/backups/pre-deploy-实际时间戳"

docker exec -i smart-product-next-mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" knowledge' \
  < "$BACKUP_DIR/knowledge.sql"
```

数据库恢复属于高风险操作，必须确认备份文件和目标数据库后再执行。不要使用 `down -v`。

---

## 11. 服务器重启后的自动恢复

systemd 服务只负责拉起主业务：

```text
/etc/systemd/system/smart-product-next.service
```

首次安装或检查：

```bash
cp /opt/smart-product-next/new-code/deploy/systemd/smart-product-next.service \
  /etc/systemd/system/smart-product-next.service

systemctl daemon-reload
systemctl enable smart-product-next.service
systemctl start smart-product-next.service

systemctl is-enabled smart-product-next.service
systemctl is-active smart-product-next.service
```

确认主业务重启策略：

```bash
docker inspect -f '{{.Name}} => {{.HostConfig.RestartPolicy.Name}}' \
  smart-product-next-web \
  smart-product-next-spring \
  smart-product-next-mysql \
  smart-product-next-redis
```

四个结果都应为：

```text
always
```

确认 RAGFlow Worker 重启策略：

```bash
WORKER_ID="$(docker ps -aq --filter 'label=com.docker.compose.service=ragflow-worker' | head -n 1)"
docker inspect "$WORKER_ID" \
  --format 'status={{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}} memory={{.HostConfig.Memory}} oom={{.State.OOMKilled}}'
```

正式重启服务器前，先确认主业务当前正常，并保存最近备份：

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
test -s /opt/smart-product-next/new-code/.env.next
```

重启：

```bash
reboot
```

服务器恢复后检查：

```bash
cd /opt/smart-product-next/new-code

systemctl is-active smart-product-next.service

docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

curl -I --max-time 10 http://127.0.0.1:8000
```

如果服务器内存不足，优先停止 RAGFlow，不停止主业务：

```bash
RAG_ROOT="/opt/smart-product-next/new-code/deploy/ragflow/vendor/v0.26.4"
cd "$RAG_ROOT"

docker compose \
  --project-name smart-product-ragflow \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.safety.yml \
  -f docker-compose.worker-safety.yml \
  stop
```

恢复 RAGFlow：

```bash
docker compose \
  --project-name smart-product-ragflow \
  --env-file .env \
  -f docker-compose.yml \
  -f docker-compose.safety.yml \
  -f docker-compose.worker-safety.yml \
  up -d
```

---

## 12. 日常上线的最短流程

以后普通前后端功能更新，只需要按下面顺序执行：

```text
1. 本地执行 build-runtime-package.ps1
2. 检查 ZIP 内有 app.jar 和 frontend-dist/index.html
3. 上传 ZIP 到 /opt/smart-product-next/incoming-smart-product-runtime.zip
4. 服务器备份 .env.next、容器状态和 knowledge.sql
5. 停止 spring-server 和 web，不停 mysql、redis、RAGFlow
6. 保留旧 new-code 目录
7. 解压新包
8. 从旧目录恢复生产 .env.next
9. 保留 RAGFlow .env 和 safety override
10. 按需执行本版本数据库 SQL
11. 启动 spring-server
12. 确认 Spring 正常后启动 web
13. 检查四个主业务容器、HTTP、登录和 AI
14. 异常就按第 10 节回滚
```

---

## 13. 严禁执行的命令

除非已经明确确认目标和数据备份，否则禁止：

```bash
docker compose down -v
docker system prune -a
docker volume prune
rm -rf /opt/smart-product-next/deploy-data*
rm -rf /opt/smart-product-next/new-code
rm -rf /opt/smart-product-next/server-secrets
UPDATE ai_knowledge_document SET sync_status = 'READY';
```

禁止用 SQL 伪造知识文档解析完成状态。必须由 RAGFlow Worker 实际生成 Chunk 后，AI 检索才算成功。

---

## 14. 上线记录模板

每次上线后记录：

```text
上线日期：
版本/提交号：
上线人：
上线包：
BACKUP_DIR：
是否执行数据库 SQL：
执行的 SQL 文件：
主业务容器状态：
RAGFlow Worker 状态：
AI 问答验证结果：
是否回滚：
备注：
```

