# Spring JWT 密钥配置说明

## 结论：真实密钥不进入运行包

上线 ZIP **不会、也不应该**包含真实 JWT 密钥。运行包只带密钥路径、Compose 只读挂载和本说明。真实密钥独立保存在服务器：

```text
/opt/smart-product-new/spring-server-secrets/jwt-secret
```

这样重新上传或解压运行包时不会覆盖密钥，也不会把可签发管理员 Token 的材料带入 Git、构建机产物或传输记录。

## 首次上线生成密钥

在服务器执行：

```bash
mkdir -p /opt/smart-product-new/spring-server-secrets
umask 077
openssl rand -base64 48 > /opt/smart-product-new/spring-server-secrets/jwt-secret
chmod 600 /opt/smart-product-new/spring-server-secrets/jwt-secret
```

该命令生成 48 个随机字节，再以 Base64 保存。后端解码后要求至少 32 字节（256 bit）；空文件、示例值、非 Base64 或弱密钥都会让 Spring 启动失败。

在 `.env.server` 中只写路径：

```dotenv
SPRING_JWT_SECRET_FILE=../spring-server-secrets/jwt-secret
```

Compose 会把文件只读挂载为容器内的：

```text
/run/secrets/spring-jwt-secret
```

后端只读取内容，不会打印密钥。不要把密钥内容写进 `.env.server`。

## 升级与备份

- 普通发版：保留原密钥文件，只替换运行包，现有有效 Token 可继续使用。
- 主动轮换：重新生成并覆盖密钥，然后重建 Spring 后端容器；所有旧 Spring Token 立即失效，用户必须重新登录。
- 密钥丢失：不能恢复旧 Token，只能生成新密钥并让用户重新登录。
- Go 旧版与 Spring 主线必须使用不同密钥；本配置不会修改 Go 旧版。

只重建后端容器：

```bash
cd /opt/smart-product-new/new-code
docker compose --env-file .env.server -f docker-compose.server.yml up -d --force-recreate spring-server
```

## 禁止事项

不要把以下文件放进 `new-code` 运行包目录、Git 或聊天记录：

- `jwt-secret`
- `.env.server`
- 任何包含 `APP_JWT_SECRET=真实值` 的文件

发布脚本会在目录打包前和 ZIP 生成后检查 `jwt-secret` 与 `.env.server`，发现后立即终止。
