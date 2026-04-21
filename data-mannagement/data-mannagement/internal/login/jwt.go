package login

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"github.com/golang-jwt/jwt/v4"
	"time"
)

// JWTKey JWT 密钥（建议存入环境变量）
var JWTKey = []byte("your_secret_key")

// Token 过期时长
const tokenExpireDuration = 24 * time.Hour

// Claims JWT 结构体
type Claims struct {
	UserID      uint32 `json:"user_id"`
	UserAccount string `json:"user_account"`
	ExpiresAt   int64  `json:"expires_at"`
	jwt.RegisteredClaims
}

// GenerateJWT 生成 JWT
func GenerateJWT(userID uint32, userAccount string) (string, error) {
	expirationTime := time.Now().Add(tokenExpireDuration) // 24 小时
	claims := &Claims{
		UserID:           userID,
		UserAccount:      userAccount,
		ExpiresAt:        expirationTime.Unix(),
		RegisteredClaims: jwt.RegisteredClaims{},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTKey)
}

func UserInfo(ctx context.Context) *dto.Header {
	userid := ctx.Value("userid").(uint32)
	useraccount := ctx.Value("userAccount").(string)
	return &dto.Header{
		CreatorId:   userid,
		CreatorName: useraccount,
	}
}
