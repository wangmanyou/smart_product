package data

import (
	"context"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/errors"
	"github.com/xormplus/builder"
	"github.com/xormplus/xorm"
	"go.uber.org/zap"
)

type BaseRepo struct {
	d *Data
}

func NewBaseRepo(d *Data) *BaseRepo {
	return &BaseRepo{d: d}
}

//	func (r *BaseRepo) InsertOne(ctx context.Context, table string, val interface{}) error {
//		if _, err := r.s(ctx).Table(table).InsertOne(val); err != nil {
//			r.d.log.Ctx(ctx).Error("InsertOne execute failed", zap.Error(err))
//			return dbErr(err)
//		}
//		return nil
//	}
//
//	func (r *BaseRepo) InsertMulti(ctx context.Context, table string, sli interface{}) error {
//		if _, err := r.s(ctx).Table(table).InsertMulti(sli); err != nil {
//			r.d.log.Ctx(ctx).Error("InsertMulti execute failed", zap.Error(err))
//			return dbErr(err)
//		}
//		return nil
//	}
//
//	func (r *BaseRepo) ExistsByID(ctx context.Context, table string, id uint64) (bool, error) {
//		return r.ExistsByCond(ctx, table, builder.Eq{"id": id})
//	}
func (r *BaseRepo) ExistsByCond(ctx context.Context, table string, cond builder.Cond) (bool, error) {
	var (
		err   error
		exist bool
	)
	if exist, err = r.s(ctx).Table(table).Where(cond).Exist(); err != nil {
		logz.Err("ExistsByCond execute failed", err)
		return true, dbErr(err)
	}
	return exist, nil
}

//func (r *BaseRepo) CountByCond(ctx context.Context, table string, cond builder.Cond) (uint64, error) {
//	var (
//		err   error
//		count int64
//	)
//	if count, err = r.s(ctx).Table(table).Where(cond).Count(); err != nil {
//		r.d.log.Ctx(ctx).Error("CountByCond execute failed", zap.Error(err))
//		return 0, dbErr(err)
//	}
//	return uint64(count), nil
//}
//
//func (r *BaseRepo) OneByID(ctx context.Context, table string, id uint64, bean interface{}) error {
//	var (
//		exi bool
//		err error
//	)
//	if exi, err = r.s(ctx).Table(table).Where("id=?", id).Get(bean); err != nil {
//		r.d.log.Ctx(ctx).Error("OneByID execute failed", zap.Error(err))
//		return dbErr(err)
//	}
//	if !exi {
//		return cons.ErrNotFound
//	}
//	return nil
//}
//
//func (r *BaseRepo) OneByCond(ctx context.Context, table string, cond builder.Cond, bean interface{}) error {
//	var (
//		exi bool
//		err error
//	)
//	if exi, err = r.s(ctx).Table(table).Where(cond).Get(bean); err != nil {
//		r.d.log.Ctx(ctx).Error("OneByCond execute failed", zap.Error(err))
//		return dbErr(err)
//	}
//	if !exi {
//		return cons.ErrNotFound
//	}
//	return nil
//}
//
//func (r *BaseRepo) ListByCond(ctx context.Context, table string, cond builder.Cond, rowsSlicePtr interface{}) error {
//	if err := r.s(ctx).Table(table).Where(cond).Find(rowsSlicePtr); err != nil {
//		r.d.log.Ctx(ctx).Error("ListByCond execute failed", zap.Error(err))
//		return dbErr(err)
//	}
//	return nil
//}
//
//func (r *BaseRepo) All(ctx context.Context, table string, rowsSlicePtr interface{}) error {
//	if err := r.s(ctx).Table(table).Find(rowsSlicePtr); err != nil {
//		r.d.log.Ctx(ctx).Error("All execute failed", zap.Error(err))
//		return dbErr(err)
//	}
//	return nil
//}
//
//func (r *BaseRepo) UpdateByID(ctx context.Context, table string, id uint64, bean interface{}, columns ...string) error {
//	if _, err := r.s(ctx).Table(table).MustCols(columns...).Where("id=?", id).Update(bean); err != nil {
//		r.d.log.Ctx(ctx).Error("UpdateByID execute failed", zap.Error(err))
//		return dbErr(err)
//	}
//	return nil
//}
//
//func (r *BaseRepo) UpdateByCond(ctx context.Context, table string, cond builder.Cond, bean interface{}, columns ...string) error {
//	if _, err := r.s(ctx).Table(table).MustCols(columns...).Where(cond).Update(bean); err != nil {
//		r.d.log.Ctx(ctx).Error("UpdateByCond execute failed", zap.Error(err))
//		return dbErr(err)
//	}
//	return nil
//}

//	func (r *BaseRepo) incrOne(ctx context.Context, table, column string, id int64, step ...int64) error {
//		if len(step) == 0 {
//			step = []int64{1}
//		}
//		if _, err := r.s(ctx).Table(table).Where("id=?", id).Incr(column, step[0]).Update(&struct{}{}); err != nil {
//			r.l().Err("incrOne execute failed", err)
//			return dbErr(err)
//		}
//		return nil
//	}
//
//	func (r *BaseRepo) incrOneWithColumns(ctx context.Context, table string, id int64, columnM map[string]int64) error {
//		var (
//			err error
//			s   = r.s(ctx).Table(table).Where("id=?", id)
//		)
//		for column, step := range columnM {
//			if step < 1 {
//				step = 1
//			}
//			s.Incr(column, step)
//		}
//		if _, err = s.Update(&struct{}{}); err != nil {
//			r.l().Err("incrOneWithColumns execute failed", err)
//			return dbErr(err)
//		}
//		return nil
//	}
//
//	func (r *BaseRepo) incrMulti(ctx context.Context, table, column string, ids []int64, step ...int64) error {
//		if len(step) == 0 {
//			step = []int64{1}
//		}
//		if _, err := r.s(ctx).Table(table).In("id", ids).Incr(column, step[0]).Update(&struct{}{}); err != nil {
//			r.l().Err("incrMulti execute failed", err)
//			return dbErr(err)
//		}
//		return nil
//
// }
//
//	func (r *BaseRepo) DeleteByID(ctx context.Context, table string, id uint64, bean interface{}) error {
//		if _, err := r.s(ctx).Table(table).Where("id=?", id).Delete(bean); err != nil {
//			r.d.log.Ctx(ctx).Error("DeleteByID execute failed", zap.Error(err))
//			return dbErr(err)
//		}
//		return nil
//	}
//
//	func (r *BaseRepo) DeleteByCond(ctx context.Context, table string, cond builder.Cond, bean interface{}) error {
//		if _, err := r.s(ctx).Table(table).Where(cond).Delete(bean); err != nil {
//			r.d.log.Ctx(ctx).Error("DeleteByCond execute failed", zap.Error(err))
//			return dbErr(err)
//		}
//		return nil
//	}
//
// SqlTplGet SQL模板相关
func (r *BaseRepo) SqlTplGet(ctx context.Context, tpl string, args *map[string]interface{}, bean interface{}) error {
	if _, err := r.s(ctx).SqlTemplateClient(tpl, args).Get(bean); err != nil {
		logz.Error("SqlTplGet execute failed", zap.Error(err))
		return errno.ErrorDbError("SqlTplGet:" + err.Error())
	}
	r.s(ctx).SqlTemplateClient(tpl, args).Execute()
	return nil
}

func (r *BaseRepo) SqlTplFind(ctx context.Context, tpl string, args *map[string]interface{}, rowsSlicePtr interface{}) error {
	if err := r.s(ctx).SqlTemplateClient(tpl, args).Find(rowsSlicePtr); err != nil {
		logz.Error("SqlTplFind execute failed", zap.Error(err))
		return errno.ErrorDbError("SqlTplFind:" + err.Error())
	}
	return nil
}

func (r *BaseRepo) SqlTplExecute(ctx context.Context, tpl string, args *map[string]interface{}, bean interface{}) error {
	if _, err := r.s(ctx).SqlTemplateClient(tpl, args).Execute(); err != nil {
		logz.Error("SqlTplExecute execute failed", zap.Error(err))
		return errno.ErrorDbError("SqlTplExecute:" + err.Error())
	}
	return nil
}

func (r *BaseRepo) SqlTplQueryList(ctx context.Context, tpl string, args *map[string]interface{}) ([]map[string]interface{}, error) {
	res, err := r.s(ctx).SqlTemplateClient(tpl, args).Query().List()
	if err != nil {
		logz.Error("SqlTplQuery execute failed", zap.Error(err))
		return nil, errno.ErrorDbError("SqlTplQuery:" + err.Error())
	}
	return res, nil
}

// 事务
func (r *BaseRepo) s(ctx context.Context) *xorm.Session {
	if s, ok := ctx.Value(th.sKey).(*xorm.Session); ok {
		return s
	}
	return r.d.x.NewSession()
}

// log
//func (r *BaseRepo) l() *Logger {
//	return r.d.log
//}

// 分布式锁
//func (r *BaseRepo) lock(ctx context.Context, key, uniID string, expiration ...time.Duration) bool {
//	exp := cons.DefaultDistributedLockExpiration
//	if len(expiration) > 0 {
//		exp = expiration[0]
//	}
//	return rds.Lock(r.d.rds, ctx, key, uniID, exp)
//}
//
//func (r *BaseRepo) unlock(ctx context.Context, key, uniID string) bool {
//	return rds.Unlock(r.d.rds, ctx, key, uniID)
//}

func dbErr(err error) *errors.Error {
	return errno.ErrorDbError(err.Error()).WithCause(err)
}
