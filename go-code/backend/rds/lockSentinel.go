package rds

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

func LockSentinel(ctx context.Context, c *redis.ClusterClient, key, uniID string, expiration time.Duration) (success bool) {
	start := time.Now()
	defer func() {
		fmt.Println(fmt.Sprintf("Lock consume:%v, success:%v, key:%s", time.Since(start), success, key))
	}()
	success = c.SetNX(ctx, key, uniID, expiration).Val()
	return
}

func UnlockSentinel(ctx context.Context, c *redis.ClusterClient, key, uniID string) (success bool) {
	start := time.Now()
	defer func() {
		fmt.Println(fmt.Sprintf("Unlock consume:%v, success:%v, key:%s, uniID:%s", time.Since(start), success, key, uniID))
	}()
	if c.Get(ctx, key).Val() == uniID {
		delResult := c.Del(ctx, key).Val()
		success = delResult == 1 || delResult == 0
		return
	}
	success = false
	return
}
