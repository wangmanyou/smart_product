# Smart Product Go Version

Go 版已经整理为可独立开发和部署的目录：

- `backend/`：Go 后端
- `frontend/`：Umi 前端
- `deploy/`：MySQL、Redis 部署配置
- `docker-compose.yml`：完整部署入口
- `runtime-data/`：运行时数据库、Redis 和上传文件（自动生成，不纳入版本管理）
- `legacy-runtime-data/`：旧运行数据归档（当前部署不挂载）

## 构建与启动

在仓库根目录执行：

```powershell
npm.cmd install -g pnpm@9.15.9
pnpm.cmd --dir .\go-code\frontend install --frozen-lockfile
pnpm.cmd --dir .\go-code\frontend build
docker compose -f .\go-code\docker-compose.yml up -d --build
```

默认端口：

- Web：`8002`
- MySQL：`13307`
- Redis：`16380`

停止服务：

```powershell
docker compose -f .\go-code\docker-compose.yml down
```
