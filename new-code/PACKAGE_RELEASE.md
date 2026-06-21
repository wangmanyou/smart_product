# 只上传打包产物的上线方式

生产服务器不需要上传完整前后端源码。

推荐上传运行包，运行包只包含：

```text
backend-app/app.jar
frontend-dist/
deploy/
db/
docker-compose.runtime.yml
docker-compose.parallel.yml
START_STOP.md
PRODUCTION_SECURITY_HTTPS.md
```

## 本地打包

在本机项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File new-code/scripts/build-runtime-package.ps1
```

生成文件：

```text
new-code/release/smart-product-runtime.zip
```

## 上传服务器

把 `smart-product-runtime.zip` 上传到服务器：

```bash
/opt/smart-product-new
```

解压：

```bash
cd /opt/smart-product-new
unzip smart-product-runtime.zip -d new-code
```

## 导入最新数据并升级

启动 MySQL 和 Redis：

```bash
docker compose -f docker-compose.runtime.yml up -d mysql redis
```

先导入服务器最新导出的 `knowledge.sql`：

```bash
docker exec -i smart-product-mysql mysql -uroot -p'root' knowledge < knowledge.sql
```

再执行新版本升级脚本：

```bash
docker exec -i smart-product-mysql mysql -uroot -p'root' knowledge < db/001_auth_approval_upgrade.sql
```

## 启动运行包

```bash
cd /opt/smart-product-new/new-code
docker compose -f docker-compose.runtime.yml up -d
```

这种方式不会依赖旧项目目录，也不需要服务器上存在后端源码或前端源码。
