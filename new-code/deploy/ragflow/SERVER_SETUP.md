# RAGFlow 服务器 Docker 配置

生产服务器上需要单独启动 RAGFlow Docker 栈，并让 `smart-product-next-spring` 加入 RAGFlow 网络，推荐后端通过 Docker 内网访问：

```env
RAGFLOW_BASE_URL=http://ragflow-cpu:9380
```

不要依赖 `http://host.docker.internal:9380`：RAGFlow 默认只把宿主机端口绑定到 `127.0.0.1`，Linux Docker 容器未必能通过 host-gateway 访问这个 loopback 端口。

## 服务器执行

```bash
cd /opt/smart-product-next/new-code
bash deploy/ragflow/scripts/setup-server-ragflow.sh
```

如已有 RAGFlow API Key 和大模型配置，可一次性写入：

```bash
cd /opt/smart-product-next/new-code
RAGFLOW_API_KEY='替换成RAGFlow_API_Key' \
LLM_BASE_URL='替换成OpenAI兼容接口BaseURL，例如 https://xxx/v1' \
LLM_API_KEY='替换成模型API_Key' \
LLM_MODEL='替换成模型名' \
bash deploy/ragflow/scripts/setup-server-ragflow.sh
```

执行后重启后端：

```bash
cd /opt/smart-product-next/new-code
docker compose --env-file .env.next -f docker-compose.next.yml up -d --force-recreate spring-server
```

如果 `docker-compose.next.yml` 没有持久加入 RAGFlow 网络，可临时连接：

```bash
RAG_NET=$(docker network ls --format '{{.Name}}' | grep -E '^smart-product-ragflow_ragflow$|ragflow.*ragflow|ragflow$' | head -n 1)
docker network connect "$RAG_NET" smart-product-next-spring 2>/dev/null || true
```

## RAGFlow UI

RAGFlow UI 默认只监听服务器本机：`127.0.0.1:19080`。本地 Windows 访问建议使用 SSH 隧道：

```powershell
ssh -L 19080:127.0.0.1:19080 root@121.40.114.206
```

然后浏览器打开：

```text
http://127.0.0.1:19080
```

进入后需要完成：

1. 注册/登录 RAGFlow 管理员账号；
2. 配置 Embedding 模型；
3. 创建 API Key；
4. 将 API Key 写入 `/opt/smart-product-next/new-code/.env.next` 的 `RAGFLOW_API_KEY`。

## 验证

```bash
curl -f http://127.0.0.1:9380/api/v1/system/healthz
cd /opt/smart-product-next/new-code
grep -nE 'APP_AI_ENABLED|RAGFLOW_BASE_URL|RAGFLOW_API_KEY|LLM_BASE_URL|LLM_API_KEY|LLM_MODEL' .env.next
docker logs --tail 120 smart-product-next-spring
```

