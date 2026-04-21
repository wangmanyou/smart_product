package biz

import (
	"context"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/rolemanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"github.com/go-kratos/kratos/v2/log"
)

type RoleMangeRepo interface {
	AddRole(ctx context.Context, req *pb.AddRoleRequest) (uint32, error)
	EditRole(ctx context.Context, req *pb.EditRoleRequest) error
	EditRoleDisabled(ctx context.Context, req *pb.EditRoleDisabledRequest) error
	DeleteRole(ctx context.Context, roleid uint32) error
	RoleDetail(ctx context.Context, roleId uint32) (*pb.RoleDetailReply, error)
	RoleList(ctx context.Context, req *pb.RoleListRequest) (*pb.RoleListReply, error)
}

// RoleManageUC is a Greeter usecase.
type RoleManageUC struct {
	repo RoleMangeRepo
	log  *log.Helper
	conf *conf.Data
}

// NewRoleManageUC new a Greeter usecase.
func NewRoleManageUC(repo RoleMangeRepo, logger log.Logger, c *conf.Data) *RoleManageUC {
	return &RoleManageUC{
		repo: repo,
		log:  log.NewHelper(logger),
		conf: c,
	}
}

func (uc *RoleManageUC) AddRole(ctx context.Context, req *pb.AddRoleRequest) (uint32, error) {
	return uc.repo.AddRole(ctx, req)
}

func (uc *RoleManageUC) EditRole(ctx context.Context, req *pb.EditRoleRequest) error {
	return uc.repo.EditRole(ctx, req)
}

func (uc *RoleManageUC) EditRoleDisabled(ctx context.Context, req *pb.EditRoleDisabledRequest) error {
	return uc.repo.EditRoleDisabled(ctx, req)
}

func (uc *RoleManageUC) DeleteRole(ctx context.Context, roleid uint32) error {
	return uc.repo.DeleteRole(ctx, roleid)
}

func (uc *RoleManageUC) RoleDetail(ctx context.Context, roleId uint32) (*pb.RoleDetailReply, error) {
	return uc.repo.RoleDetail(ctx, roleId)
}

func (uc *RoleManageUC) RoleList(ctx context.Context, req *pb.RoleListRequest) (*pb.RoleListReply, error) {
	return uc.repo.RoleList(ctx, req)
}
