package data

import (
	"context"

	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"

	"github.com/go-kratos/kratos/v2/log"
)

var _ biz.DataMangeRepo = &dataManageRepo{}

type dataManageRepo struct {
	data *Data
	log  *log.Helper
}

// NewDataMangeRepo .
func NewDataMangeRepo(data *Data, logger log.Logger) biz.DataMangeRepo {
	return &dataManageRepo{
		data: data,
		log:  log.NewHelper(logger),
	}
}

func (r *dataManageRepo) Save(ctx context.Context, g *biz.Greeter) (*biz.Greeter, error) {
	return g, nil
}
