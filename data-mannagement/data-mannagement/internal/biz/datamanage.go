package biz

import (
	"context"

	"github.com/go-kratos/kratos/v2/log"
)

var (
// ErrUserNotFound is user not found.
)

// Greeter is a Greeter model.
type Greeter struct {
	Hello string
}

// DataMangeRepo is a Greater repo.
type DataMangeRepo interface {
	Save(context.Context, *Greeter) (*Greeter, error)
}

// DataManageUC is a Greeter usecase.
type DataManageUC struct {
	repo DataMangeRepo
	log  *log.Helper
}

// NewDataManageUC new a Greeter usecase.
func NewDataManageUC(repo DataMangeRepo, logger log.Logger) *DataManageUC {
	return &DataManageUC{repo: repo, log: log.NewHelper(logger)}
}

// CreateGreeter creates a Greeter, and returns the new Greeter.
func (uc *DataManageUC) CreateGreeter(ctx context.Context, g *Greeter) (*Greeter, error) {
	uc.log.WithContext(ctx).Infof("CreateGreeter: %v", g.Hello)
	return uc.repo.Save(ctx, g)
}
