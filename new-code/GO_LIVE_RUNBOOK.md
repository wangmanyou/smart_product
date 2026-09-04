# Smart Product 上线 Runbook

> 适用环境：当前生产环境 `/opt/smart-product-next`，公网入口 `http://121.40.114.206:8000`。
> 目标：先完整备份正在运行的代码、环境配置、密钥和数据，再替换新的运行包并验证；如异常可快速回滚。

## 0. 上线前确认

- 本地当前 `release/smart-product-runtime.zip` 是旧包，必须重新打包后再上传。
- 本地工作区存在未提交改动；如果这些改动就是本次要上线的内容，可以从当前工作区打包。
- 不要删除生产数据目录：`/opt/smart-product-next/deploy-data`。
- 不要删除或重建 JWT 密钥：`/opt/smart-product-next/server-secrets/jwt-secret`。
- 不要用示例环境文件覆盖生产 `.env.next`。
- 不要执行 `docker compose down -v`。

## 1. 本地重新打包

在 Windows 本地执行：

```powershell
cd D:\coder\code-store\go\smart_product
powershell -ExecutionPolicy Bypass -File .\new-code\scripts\build-runtime-package.ps1
```

打包完成后确认文件时间已更新：

```powershell
Get-Item .\new-code\release\smart-product-runtime.zip | Select-Object FullName,Length,LastWriteTime
```

产物路径：

```text
D:\coder\code-store\go\smart_product\new-code\release\smart-product-runtime.zip
```


## 本次已生成上线包

```text
D:\coder\code-store\go\smart_product\outputs\smart-product-runtime-prod-20260903_141251.zip
```

说明：这个 `prod` 包内的 `docker-compose.next.yml` 已将 Web 端口改为 `8000:80`，可直接用于当前公网入口。

## 2. 上传运行包到服务器

把本地 ZIP 上传到服务器：

```text
/opt/smart-product-next/smart-product-runtime.zip
```

示例：

```powershell
scp .\new-code\release\smart-product-runtime.zip root@121.40.114.206:/opt/smart-product-next/smart-product-runtime.zip
```

## 3. 服务器备份当前运行代码和数据

登录服务器后执行：

```bash
ssh root@121.40.114.206
```

执行备份：

```bash
set -e
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/smart-product-switch-backup/pre-deploy-$TS
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# 记录容器状态，便于回滚和排查
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" > "$BACKUP_DIR/docker-ps-before.txt"
docker inspect smart-product-next-web smart-product-next-spring smart-product-next-mysql smart-product-next-redis > "$BACKUP_DIR/containers-inspect.json" 2>/dev/null || true

# 备份当前运行代码和关键配置
cp -a /opt/smart-product-next/new-code "$BACKUP_DIR/new-code"
cp -a /opt/smart-product-next/new-code/.env.next "$BACKUP_DIR/.env.next"
cp -a /opt/smart-product-next/server-secrets "$BACKUP_DIR/server-secrets"

# 备份数据库
docker exec smart-product-next-mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers knowledge' > "$BACKUP_DIR/knowledge.sql"

# 备份上传文件和 Redis 持久化目录
tar -czf "$BACKUP_DIR/files.tar.gz" -C /opt/smart-product-next/deploy-data files
tar -czf "$BACKUP_DIR/redis.tar.gz" -C /opt/smart-product-next/deploy-data redis

chmod -R go-rwx "$BACKUP_DIR"
echo "BACKUP_DIR=$BACKUP_DIR"
```

记住输出的 `BACKUP_DIR`，回滚时需要用。

## 4. 停止 Web 和后端服务

只停业务服务，不停 MySQL/Redis：

```bash
cd /opt/smart-product-next
docker compose --env-file new-code/.env.next -f new-code/docker-compose.next.yml stop spring-server web
```

## 5. 替换运行包

```bash
cd /opt/smart-product-next
TS=$(date +%Y%m%d_%H%M%S)
mv new-code "new-code.before-$TS"
unzip -o smart-product-runtime.zip -d new-code

# 保留生产真实环境配置和密钥引用
cp "new-code.before-$TS/.env.next" new-code/.env.next
chmod 600 new-code/.env.next

# 保证容器可读
chmod -R a+rX new-code/frontend-dist new-code/backend-app new-code/deploy new-code/db
```

## 6. 确认生产端口

生产公网入口应是 `8000:80`。如果新包里的 Compose 还是 `28000:80`，改回 `8000:80`：

```bash
cd /opt/smart-product-next/new-code
grep -n '8000:80\|28000:80' docker-compose.next.yml
sed -i 's/"28000:80"/"8000:80"/' docker-compose.next.yml
grep -n '8000:80\|28000:80' docker-compose.next.yml
```

## 7. 执行数据库升级

`db/003_ai_knowledge_upgrade.sql` 使用 `CREATE TABLE IF NOT EXISTS` 和 `ON DUPLICATE KEY UPDATE`，可以重复执行。

```bash
cd /opt/smart-product-next/new-code
docker compose --env-file .env.next -f docker-compose.next.yml exec -T mysql \
  sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" knowledge' < db/003_ai_knowledge_upgrade.sql
```

## 8. 启动业务服务

```bash
cd /opt/smart-product-next/new-code
docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate spring-server web
```

如本次需要启用智能问答，确认 `.env.next` 中有这些配置：

```bash
grep -n 'APP_AI_ENABLED\|RAGFLOW_BASE_URL\|RAGFLOW_API_KEY\|LLM_BASE_URL\|LLM_API_KEY\|LLM_MODEL' .env.next
```

至少应配置：

```env
APP_AI_ENABLED=true
RAGFLOW_BASE_URL=你的RAGFlow地址
RAGFLOW_API_KEY=你的RAGFlow Key
LLM_BASE_URL=你的模型服务地址
LLM_API_KEY=你的模型 Key
LLM_MODEL=你的模型名称
```

## 9. 验证

```bash
cd /opt/smart-product-next/new-code

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
curl -I http://127.0.0.1:8000
curl -I http://127.0.0.1:8000/api/v1/data/user/login/key

docker logs --tail 120 smart-product-next-spring
docker logs --tail 80 smart-product-next-web
```

浏览器验证：

```text
http://121.40.114.206:8000
```

重点验证：

- 登录页是否正常打开。
- 菜单、知识库、知识详情是否正常。
- 智能问答入口是否正常。
- 主界面输入问题进入问答页后，点击关联知识再返回，不应重复创建会话或重复调用模型。
- 新建/删除会话交互是否正常。

## 10. 异常回滚

如果只是前后端异常，先回滚代码包：

```bash
cd /opt/smart-product-next

# 替换成第 5 步生成的实际目录名
docker compose --env-file new-code/.env.next -f new-code/docker-compose.next.yml stop spring-server web
rm -rf new-code
mv new-code.before-YYYYMMDD_HHMMSS new-code

cd new-code
docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate spring-server web
```

如果数据库升级也造成问题，再恢复数据库备份：

```bash
# 替换成第 3 步输出的实际 BACKUP_DIR
BACKUP_DIR=/opt/smart-product-switch-backup/pre-deploy-YYYYMMDD_HHMMSS

docker exec -i smart-product-next-mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" knowledge' < "$BACKUP_DIR/knowledge.sql"
```

恢复后重新验证第 9 步。



## 11. 配置服务器重启后自动恢复（本次新增）

本次配置已经包含以下保护：

- 主业务 `mysql / redis / spring-server / web` 使用 `restart: always`；
- MySQL/Redis 启动健康检查，Spring 等待它们健康后再启动；
- 主业务内存上限约 2.1 GiB；
- RAGFlow 使用 `docker-compose.safety.yml` 限制 Elasticsearch、RAGFlow、MySQL、MinIO、Redis 的内存和 CPU，不能再无限制抢占宿主机；
- systemd 服务保证 Docker 启动后主动拉起主业务。

安装 systemd 服务（只需执行一次）：

```bash
cp /opt/smart-product-next/new-code/deploy/systemd/smart-product-next.service \
  /etc/systemd/system/smart-product-next.service
systemctl daemon-reload
systemctl enable smart-product-next.service
systemctl start smart-product-next.service
systemctl status smart-product-next.service --no-pager
```

确认容器的重启策略：

```bash
docker inspect -f '{{.Name}} => {{.HostConfig.RestartPolicy.Name}}' \
  smart-product-next-mysql smart-product-next-redis \
  smart-product-next-spring smart-product-next-web
```

四个结果都应为 `always`。确认 RAGFlow 使用安全覆盖：

```bash
cd /opt/smart-product-next/new-code/deploy/ragflow/vendor/v0.26.4
docker compose --project-name smart-product-ragflow --env-file .env \
  -f docker-compose.yml -f docker-compose.safety.yml config \
  | grep -E 'mem_limit:|cpus:'
```

正式重启验证（确认无误后再执行）：

```bash
reboot
```

服务器回来后执行：

```bash
cd /opt/smart-product-next/new-code
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -I http://127.0.0.1:8000
systemctl is-enabled smart-product-next.service
systemctl is-active smart-product-next.service
```

如果服务器内存仍然紧张，优先临时停止 RAGFlow，不要停止主业务：

```bash
cd /opt/smart-product-next/new-code/deploy/ragflow/vendor/v0.26.4
docker compose --project-name smart-product-ragflow --env-file .env \
  -f docker-compose.yml -f docker-compose.safety.yml stop
```

恢复 RAGFlow：

```bash
docker compose --project-name smart-product-ragflow --env-file .env \
  -f docker-compose.yml -f docker-compose.safety.yml up -d
```

RAGFlow 脚本默认不会再自动修改主业务 `.env.next`。只有明确需要启用后端 AI 时，才使用：

```bash
ENABLE_BACKEND_AI=true /opt/smart-product-next/new-code/deploy/ragflow/scripts/setup-server-ragflow.sh
```
