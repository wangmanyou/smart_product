# RAGFlow 本地部署（Smart Product）

这里提供一套与业务 MySQL/Redis 隔离的 RAGFlow 环境，固定使用官方 `v0.26.4` Docker 配置。官方文件保存在 `vendor/v0.26.4`，项目脚本负责生成本机密码、启动、检查和停止。

## 地址与端口

| 用途 | 地址 |
| --- | --- |
| RAGFlow Web | `http://127.0.0.1:19080` |
| RAGFlow HTTP API | `http://127.0.0.1:9380` |
| API 健康检查 | `http://127.0.0.1:9380/api/v1/system/healthz` |
| Elasticsearch（仅本机） | `127.0.0.1:19200` |
| RAGFlow MySQL（独立实例） | `127.0.0.1:19306` |
| MinIO API / Console | `127.0.0.1:19000` / `127.0.0.1:19001` |
| RAGFlow Redis | `127.0.0.1:19379` |

这些端口不会复用业务开发环境的 MySQL `13306` 和 Redis `16379`。所有宿主机端口都只绑定 `127.0.0.1`，默认不会暴露到局域网。

## 一键启动

在 `new-code` 目录执行：

```powershell
.\deploy\ragflow\scripts\start.ps1
```

首次运行会：

1. 从 `.env.example` 生成 Git 忽略的 `vendor/v0.26.4/.env`；
2. 为 Elasticsearch、MySQL、MinIO、Redis 等生成随机密码；
3. 检查 Docker 内存、磁盘、`vm.max_map_count` 和端口；
4. 拉取固定版本镜像并启动；
5. 等待 HTTP API 健康。

首次拉取镜像和初始化索引可能需要较长时间。当前采用 CPU + Elasticsearch，不启用 GPU、Sandbox、Kibana 和内置 TEI 服务。

## 初始化 RAGFlow 账号与模型

1. 打开 `http://127.0.0.1:19080`，注册本地管理员账号。
2. 右上角头像 → **Model providers**，配置一个可用的 Embedding 模型。
3. 所有需要跨库联合检索的 Dataset 必须使用同一个 Embedding 模型。
4. 右上角头像 → **API**，创建或复制 RAGFlow API Key。

RAGFlow `v0.26.4` 镜像不自带 Embedding 模型。不完成第 2 步时，文档可以上传，但解析/向量化无法正常完成。最终回答由 Spring Boot 的 `LLM_*` 配置生成，和 RAGFlow 的 Embedding 模型是两套配置。

## 接到 Spring Boot

生成本机后端环境文件：

```powershell
.\deploy\ragflow\scripts\set-backend-api-key.ps1
```

脚本会安全提示输入 API Key，并写入 Git 忽略的 `new-code/.env.ai.local`。随后补全其中的：

```text
LLM_BASE_URL
LLM_API_KEY
LLM_MODEL
```

直接从宿主机启动后端：

```powershell
.\deploy\ragflow\scripts\start-backend-with-ai.ps1
```

若用 `docker-compose.server.yml` 或 `docker-compose.next.yml` 部署 Spring，请把对应 `.env.*.example` 复制为真实环境文件并填入 API Key。容器内默认通过 `http://host.docker.internal:9380` 访问宿主机 RAGFlow。

## 日常命令

```powershell
# 环境检查
.\deploy\ragflow\scripts\doctor.ps1

# 状态
.\deploy\ragflow\scripts\status.ps1

# 健康检查
.\deploy\ragflow\scripts\health-check.ps1

# 停止，保留数据卷
.\deploy\ragflow\scripts\stop.ps1

# 删除容器和所有 RAGFlow 数据卷（需要再次输入确认文本）
.\deploy\ragflow\scripts\stop.ps1 -RemoveData
```

日志：

```powershell
$version = (Get-Content .\deploy\ragflow\VERSION -Raw).Trim()
docker compose --project-name smart-product-ragflow `
  --env-file ".\deploy\ragflow\vendor\$version\.env" `
  -f ".\deploy\ragflow\vendor\$version\docker-compose.yml" `
  logs -f --tail 200
```

## 与业务知识库联调

RAGFlow API Key 和 Spring LLM 配好后：

1. 在业务 MySQL 8 执行 `db/003_ai_knowledge_upgrade.sql`；
2. 启动 Spring Boot；
3. 部署启用 AI 的新 Spring 运行包；后端会根据现有业务场景自动创建 Dataset 映射，不需要用户填写业务 ID 或 Dataset ID；
4. 后端首次启动会自动把现有业务知识生成 Markdown 并排队同步到 RAGFlow；
5. 用 `GET /v1/data/ai/knowledge/sync/summary` 查看同步状态，等待文档进入 READY；
6. 在业务页面打开智能问答并提问，后端仍按原有角色/场景权限过滤可检索范围。

## 数据与升级

- Docker named volumes 保存 Elasticsearch、MySQL、MinIO 和 Redis 数据。
- `vendor/v0.26.4/ragflow-logs` 保存 RAGFlow 日志，已被 Git 忽略。
- 不要直接改真实 `.env` 后执行 `initialize.ps1 -Force`，否则基础设施密码会轮换，已有容器可能无法连接旧数据。
- 升级 RAGFlow 时应新增新的 `vendor/vX.Y.Z` 目录并先阅读官方升级说明，不要直接改成 `latest`。



