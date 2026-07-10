package middleware

import (
	"context"
	"fmt"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/login"
	"strings"
	"time"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/transport"
	"github.com/golang-jwt/jwt/v4"
)

// AuthMiddleware 验证 JWT Token
func AuthMiddleware() middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (interface{}, error) {
			// 获取请求路径
			var path string
			if tr, ok := transport.FromServerContext(ctx); ok {
				path = tr.Operation()
			}

			// 直接放行 `/v1/data/user/login` 接口
			if path == "/api.usermanage.v1.UserManage/Login" {
				return handler(ctx, req)
			}

			// 获取 Header
			var tokenString string
			if tr, ok := transport.FromServerContext(ctx); ok {
				header := tr.RequestHeader()
				authHeader := header.Get("Authorization")

				// 检查 Authorization 头
				if strings.HasPrefix(authHeader, "Bearer ") {
					tokenString = strings.TrimPrefix(authHeader, "Bearer ")
				}
			}

			// Token 为空，返回错误
			if tokenString == "" {
				return nil, errno.ErrorLoginError("凭证缺失，请重新登陆")
			}

			// 解析 JWT
			claims := login.Claims{}
			token, err := jwt.ParseWithClaims(tokenString, &claims, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errno.ErrorLoginError("凭证无效，请重新登陆")
				}
				return []byte(login.JWTKey), nil
			})

			// 验证 Token
			if err != nil || !token.Valid {
				return nil, errno.ErrorLoginError("凭证无效，请重新登陆")
			}

			// Token 过期
			if time.Now().Unix() > claims.ExpiresAt {
				return "", errno.ErrorLoginError("凭证过期，请重新登陆")
			}

			ctx = context.WithValue(context.WithValue(ctx, "userid", claims.UserID), "userAccount", claims.UserAccount)

			// 解析成功，打印 Token 信息
			fmt.Println("✅ 用户认证成功:", claims)

			// 刷新token

			// 继续处理请求
			return handler(ctx, req)
		}
	}
}
