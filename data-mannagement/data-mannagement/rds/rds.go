package rds

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

var (
	m        map[int]*redis.Client
	addr     string
	password string
	sg       singleflight.Group
)

func NewClient(addr, pwd string, db int) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr:     addr,
		DB:       db,
		Password: pwd,
	})
}

// NewSentinelClusterClient deprecated!!! 连接cluster模式的redis集群  哨兵集群请使用NewSentinelClient方法
func NewSentinelClusterClient(masterName, sentinelPassword, pwd string, sentinelAddrs []string, db int) *redis.ClusterClient {
	return redis.NewFailoverClusterClient(&redis.FailoverOptions{
		MasterName:       masterName,
		SentinelAddrs:    sentinelAddrs,
		SentinelPassword: sentinelPassword,
		Password:         pwd,
		DB:               db,
	})
}

func NewSentinelClient(masterName, sentinelPassword, pwd string, sentinels []string, db int) *redis.Client {
	return redis.NewFailoverClient(&redis.FailoverOptions{
		MasterName:       masterName,
		SentinelAddrs:    sentinels,
		SentinelPassword: sentinelPassword,
		Password:         pwd,
		DB:               db,
		PoolSize:         200,
		MaxIdleConns:     50,
		ConnMaxIdleTime:  time.Minute,
		ConnMaxLifetime:  time.Minute * 3,
	})
}

func Init(add, pwd string) error {
	addr = add
	password = pwd
	c := NewClient(addr, pwd, 0)
	pingRes, err := c.Ping(context.TODO()).Result()
	if err != nil {
		return err
	}
	fmt.Println(pingRes)
	return nil
}

func DB(db int) *redis.Client {
	if addr == "" {
		return nil
	}
	if _, err, _ := sg.Do("RDS.M.Init", func() (interface{}, error) {
		if m == nil {
			m = make(map[int]*redis.Client, 16)
		}
		return nil, nil
	}); err != nil {
		return nil
	}
	ret, _, _ := sg.Do(strconv.Itoa(db), func() (interface{}, error) {
		if _, ok := m[db]; !ok {
			m[db] = NewClient(addr, password, db)
		}
		return m[db], nil
	})
	return ret.(*redis.Client)
}
