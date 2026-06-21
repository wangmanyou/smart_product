# HTTPS 配置说明

本文档只说明 HTTPS 配置，不调整数据库。

## 前提

需要准备：

| 项目 | 说明 |
| --- | --- |
| 域名 | 例如 `demo.example.com` |
| DNS 解析 | 域名 A 记录指向服务器公网 IP |
| 安全组 | 放行 `80` 和 `443` |
| 新项目 | `http://127.0.0.1:18000` 可以访问 |

先在服务器确认新项目可访问：

```bash
curl -I http://127.0.0.1:18000
```

## 方式一：宿主机 Nginx 配置 HTTPS

适合宿主机 `80` 和 `443` 没有被旧项目占用的情况。

先确认端口：

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
ss -lntp | grep -E ':80|:443' || true
```

设置域名和邮箱：

```bash
export DOMAIN=你的域名
export EMAIL=你的邮箱
```

安装 Nginx 和 Certbot：

```bash
apt update
apt install -y nginx snapd

snap install core
snap refresh core
apt remove -y certbot python3-certbot-nginx || true
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot
```

写入 Nginx 配置：

```bash
cat > /etc/nginx/conf.d/smart-product-new.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:18000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
```

检查并启动 Nginx：

```bash
nginx -t
systemctl enable --now nginx
systemctl reload nginx
```

申请 HTTPS 证书：

```bash
certbot --nginx -d $DOMAIN --redirect -m $EMAIL --agree-tos --no-eff-email
```

验证：

```bash
curl -I https://$DOMAIN
certbot renew --dry-run
```

浏览器访问：

```text
https://你的域名
```

## 方式二：旧 Nginx 已占用 80/443

如果旧项目的 Nginx 已经占用了 `80` 或 `443`，不要直接装宿主机 Nginx 抢端口。

这种情况应在旧 Nginx 里新增一个域名配置，把新域名代理到：

```text
http://127.0.0.1:18000
```

先确认旧 Nginx 容器名：

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
```

如果当前旧 Nginx 容器叫 `nginx`，查看配置目录：

```bash
docker inspect nginx --format '{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}'
```

把输出发给开发人员，根据实际挂载目录添加 HTTPS 配置。

## 为什么必须 HTTPS

登录页使用浏览器安全加密能力。

公网 HTTP：

```text
http://服务器IP:18000
```

浏览器会禁用该能力，登录会提示：

```text
当前浏览器不支持安全登录，请升级浏览器后重试
```

正式访问应使用：

```text
https://你的域名
```
