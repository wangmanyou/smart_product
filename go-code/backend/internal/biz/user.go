package biz

import (
	"context"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/usermanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"github.com/go-kratos/kratos/v2/log"
	"math/rand"
	"time"
)

type UserMangeRepo interface {
	AddUser(ctx context.Context, req *pb.AddUserRequest) (uint32, error)
	UserDetail(ctx context.Context, userId uint32) (*pb.UserDetailReply, error)
	EditUser(ctx context.Context, req *pb.EditUserRequest) error
	EditUserDisabled(ctx context.Context, reqData *pb.EditUserDisabledRequest) error
	ResetUserPassword(ctx context.Context, userid uint32, password string) error
	DeleteUser(ctx context.Context, userid uint32) error
	UserList(ctx context.Context, req *pb.UserListRequest) (*pb.UserListReply, error)
	Login(ctx context.Context, req *pb.LoginRequest) (string, error)
}

// UserManageUC is a Greeter usecase.
type UserManageUC struct {
	repo UserMangeRepo
	log  *log.Helper
	conf *conf.Data
}

// NewUserManageUC new a Greeter usecase.
func NewUserManageUC(repo UserMangeRepo, logger log.Logger, c *conf.Data) *UserManageUC {
	return &UserManageUC{
		repo: repo,
		log:  log.NewHelper(logger),
		conf: c,
	}
}

func (uc *UserManageUC) AddUser(ctx context.Context, req *pb.AddUserRequest) (uint32, error) {
	return uc.repo.AddUser(ctx, req)
}

const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/~"

func (uc *UserManageUC) GenerateRandomPasswordSimple(length int) string {
	rand.Seed(time.Now().UnixNano())
	password := make([]byte, length)
	for i := range password {
		password[i] = charset[rand.Intn(len(charset))]
	}
	return string(password)
}

func (uc *UserManageUC) UserDetail(ctx context.Context, userId uint32) (*pb.UserDetailReply, error) {
	return uc.repo.UserDetail(ctx, userId)
}

func (uc *UserManageUC) EditUser(ctx context.Context, req *pb.EditUserRequest) error {
	return uc.repo.EditUser(ctx, req)
}

func (uc *UserManageUC) EditUserDisabled(ctx context.Context, reqData *pb.EditUserDisabledRequest) error {
	return uc.repo.EditUserDisabled(ctx, reqData)
}

func (uc *UserManageUC) ResetUserPassword(ctx context.Context, userid uint32, password string) error {
	return uc.repo.ResetUserPassword(ctx, userid, password)
}

func (uc *UserManageUC) DeleteUser(ctx context.Context, userid uint32) error {
	return uc.repo.DeleteUser(ctx, userid)
}

func (uc *UserManageUC) UserList(ctx context.Context, req *pb.UserListRequest) (*pb.UserListReply, error) {
	return uc.repo.UserList(ctx, req)
}

func (uc *UserManageUC) Login(ctx context.Context, req *pb.LoginRequest) (string, error) {
	return uc.repo.Login(ctx, req)
}
