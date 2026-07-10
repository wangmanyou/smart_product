package data

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/rds"
	_ "github.com/go-sql-driver/mysql" //nolint
	"github.com/google/wire"
	"github.com/redis/go-redis/v9"
	"github.com/xormplus/xorm"
	"github.com/xormplus/xorm/names"
	"go.uber.org/zap"
	"os"
	"strings"
	"time"
)

// ProviderSet is data providers.
var ProviderSet = wire.NewSet(NewRds, NewDB, NewData, NewDataMangeRepo,
	NewDictMangeRepo, NewSceneMangeRepo, NewBusinessMangeRepo,
	NewUserMangeRepo, NewRoleMangeRepo)

// Data .
type Data struct {
	// TODO wrapped database client
	x   *xorm.Engine
	rds *redis.Client
}

// NewData .
func NewData(x *xorm.Engine, rds *redis.Client) (*Data, func(), error) {
	d := &Data{
		x:   x,
		rds: rds,
	}
	cleanup := func() {
		logz.Info("closing the data resources")
		if err := d.x.Close(); err != nil {
			logz.Error("mysql disconnect failed", zap.Error(err))
			return
		}
		logz.Info("mysql disconnected~")
	}
	return d, cleanup, nil
}

func NewRds(conf *conf.Data) *redis.Client {

	c := rds.NewClient(conf.Redis.Addr, conf.Redis.Password, int(conf.Redis.Db))
	pingRes, err := c.Ping(context.TODO()).Result()
	if err != nil {
		logz.Err("redis ping failed", err)
		panic(err)
	}
	logz.Info("redis ping", zap.String("result", pingRes))
	return c
}

func NewDB(conf *conf.Data, r *redis.Client) *xorm.Engine {
	var (
		x              *xorm.Engine
		err            error
		ctx            = context.TODO()
		url            = conf.Database.Url
		maxIdle        = int(conf.Database.MaxIdle)
		tpl            = conf.Database.Tpl
		initDBFilePath = conf.Database.InitDbFile
	)
	if x, err = xorm.NewEngine(xorm.MYSQL_DRIVER, url); err != nil {
		panic(err)
	}
	x.SetMaxIdleConns(maxIdle)
	x.SetConnMaxLifetime(time.Hour * 2)
	x.SetTableMapper(names.GonicMapper{})
	x.SetColumnMapper(names.GonicMapper{})

	if err = x.RegisterSqlTemplate(xorm.Pongo2(tpl, ".stpl")); err != nil {
		panic(err)
	}
	if err = x.Ping(); err != nil {
		panic(err)
	}
	ts := helper.NanoTimestampStr()
	if rds.Lock(ctx, r, cons.LockKeyMysqlSyncModel, ts, time.Minute) {
		defer rds.Unlock(ctx, r, cons.LockKeyMysqlSyncModel, ts)
		err = x.Sync2(
			new(models.DictTemplate),
			new(models.DictDirectory),
			new(models.SceneTemplate),
			new(models.SceneItem),
			//new(models.Business),
			new(models.Knowledge),
			new(models.KnowledgeItem),
			new(models.User),
			//new(models.Role),
		)
		if err != nil {
			panic(err)
		}

		// 读取SQL脚本文件内容
		sqlScript, err := os.ReadFile(initDBFilePath)
		if err != nil {
			logz.Error("init db error:" + err.Error())
			panic(err)
		}

		// 执行SQL脚本
		// 拆分为单个语句
		statements := strings.Split(string(sqlScript), ";")

		// 逐个执行语句
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt) // 去掉空白字符
			if stmt == "" {
				continue
			}
			_, err := x.Exec(stmt)
			if err != nil {
				logz.Error("init db error:" + err.Error())
				panic(err)
			}
			logz.Info(stmt)
		}
	}
	logz.Info("db connected~")
	x.DatabaseTZ = time.Local
	x.TZLocation = time.Local
	x.ShowSQL(true)
	return x
}
