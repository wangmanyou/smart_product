package service

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"google.golang.org/protobuf/types/known/emptypb"

	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/usermanage/v1"
)

type UserManageService struct {
	pb.UnimplementedUserManageServer
	userUC *biz.UserManageUC
}

func NewUserManageService(userUC *biz.UserManageUC) *UserManageService {
	return &UserManageService{
		userUC: userUC,
	}
}

func (s *UserManageService) AddUser(ctx context.Context, req *pb.AddUserRequest) (*pb.AddUserReply, error) {
	id, err := s.userUC.AddUser(ctx, req)
	return &pb.AddUserReply{UserId: id}, err
}

// RandomPassword 生成随机密码
func (s *UserManageService) RandomPassword(ctx context.Context, req *emptypb.Empty) (*pb.RandomPasswordReply, error) {
	pass := s.userUC.GenerateRandomPasswordSimple(12)
	return &pb.RandomPasswordReply{RandomPassword: pass}, nil
}

// UserDetail 用户详情
func (s *UserManageService) UserDetail(ctx context.Context, req *pb.UserDetailRequest) (*pb.UserDetailReply, error) {
	return s.userUC.UserDetail(ctx, req.UserId)
}

// CurrentUserDetail 当前登陆用户详情
func (s *UserManageService) CurrentUserDetail(ctx context.Context, req *emptypb.Empty) (*pb.UserDetailReply, error) {
	userid := ctx.Value("userid").(uint32)
	return s.userUC.UserDetail(ctx, userid)
}

// EditUser 编辑用户
func (s *UserManageService) EditUser(ctx context.Context, req *pb.EditUserRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.userUC.EditUser(ctx, req)
}

// EditUserDisabled 编辑用户状态
func (s *UserManageService) EditUserDisabled(ctx context.Context, req *pb.EditUserDisabledRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.userUC.EditUserDisabled(ctx, req)
}

// ResetUserPassword 重置用户密码
func (s *UserManageService) ResetUserPassword(ctx context.Context, req *pb.ResetUserPasswordRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.userUC.ResetUserPassword(ctx, req.UserId, req.UserPassword)
}

// DeleteUser 删除用户
func (s *UserManageService) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.userUC.DeleteUser(ctx, req.UserId)
}

// UserList 用户列表
func (s *UserManageService) UserList(ctx context.Context, req *pb.UserListRequest) (*pb.UserListReply, error) {
	return s.userUC.UserList(ctx, req)
}

// Login 登陆
func (s *UserManageService) Login(ctx context.Context, req *pb.LoginRequest) (*pb.LoginReply, error) {
	token, err := s.userUC.Login(ctx, req)
	ret := &pb.LoginReply{Token: token}
	return ret, err
}
