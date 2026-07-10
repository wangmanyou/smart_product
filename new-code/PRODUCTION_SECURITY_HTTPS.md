# Spring 主线 HTTPS 配置说明

## HTTPS 是否需要域名

对公网正式环境，**建议准备独立域名**，例如 `spring.example.com`：

1. 域名的 A/AAAA 记录指向服务器公网 IP。
2. Nginx 根据域名把请求转发到 Spring Web。
3. 使用 Certbot 或云厂商证书为该域名签发受浏览器信任的证书。

直接使用公网 IP 申请受信任证书的支持和运维条件都更受限，不建议作为常规生产方案。`localhost` 只适用于本地开发。

## 当前服务关系

Spring 运行包默认对外提供：

```text
Spring Web: http://服务器IP:18000
```

Go 旧版如果已经占用服务器的 `80/443`，不要再让 Spring 容器抢占这两个端口。正确方式是让当前负责公网入口的 Nginx 根据新域名转发到 Spring Web。

## 上线前检查

准备：

| 项目 | 说明 |
| --- | --- |
| 域名 | 例如 `spring.example.com` |
| DNS | 域名 A/AAAA 记录指向服务器公网 IP |
| 安全组 | 放行 `80` 和 `443`；通常无需公网放行 `18001`、`23306`、`26379` |
| Spring Web | 服务器本机访问 `http://127.0.0.1:18000` 正常 |
| 证书 | 为新域名签发的证书和私钥 |

先验证 Spring：

```bash
curl -I http://127.0.0.1:18000
```

## 方式一：公网入口是宿主机 Nginx

如果监听 `80/443` 的 Nginx 直接运行在宿主机，可以代理到宿主机发布端口：

```nginx
server {
    listen 80;
    server_name spring.example.com;

    location / {
        proxy_pass http://127.0.0.1:18000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查配置：

```bash
nginx -t
systemctl reload nginx
```

如果使用 Certbot：

```bash
certbot --nginx -d spring.example.com --redirect -m your-email@example.com --agree-tos --no-eff-email
certbot renew --dry-run
```

## 方式二：公网入口是 Go 旧版的 Nginx 容器

先找出真正监听 `80/443` 的容器和配置挂载：

```bash
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
docker inspect Go入口Nginx容器 --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

容器内的 `127.0.0.1` 指向该 Nginx 容器自身，**不能**在这个容器里写 `proxy_pass http://127.0.0.1:18000` 来访问宿主机 Spring 端口。

推荐让入口 Nginx 同时加入 Spring 网络：

```bash
docker network connect smart-product-spring-net Go入口Nginx容器
```

然后在入口 Nginx 的新域名配置中代理到 Spring Web 容器名：

```nginx
server {
    listen 80;
    server_name spring.example.com;

    location / {
        proxy_pass http://smart-product-spring-web:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

注意：手工执行 `docker network connect` 在入口 Nginx 容器被重建后可能失效。长期方案应把 `smart-product-spring-net` 作为 external network 写进入口 Nginx 自己的 Compose。修改服务器 Go 旧版 Compose 前，应先根据真实容器名和网络配置确认，不能直接套用本地文件。

证书的申请、挂载和续期应沿用当前入口 Nginx 已有方案；如果现状不明确，先提供下面两条命令的输出再修改：

```bash
docker inspect Go入口Nginx容器
docker network inspect smart-product-spring-net
```

## 验证

```bash
curl -I https://spring.example.com
```

浏览器正式访问：

```text
https://spring.example.com
```

登录流程使用浏览器安全加密能力，公网环境必须处于受信任的 HTTPS 安全上下文；仅通过 `http://服务器IP:18000` 访问可能导致安全登录能力不可用。
