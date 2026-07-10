package service

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"google.golang.org/protobuf/types/known/emptypb"

	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/rolemanage/v1"
)

type RoleManageService struct {
	pb.UnimplementedRoleManageServer
	roleUC *biz.RoleManageUC
}

func NewRoleManageService(roleUC *biz.RoleManageUC) *RoleManageService {
	return &RoleManageService{
		roleUC: roleUC,
	}
}

func (s *RoleManageService) AddRole(ctx context.Context, req *pb.AddRoleRequest) (*pb.AddRoleReply, error) {
	id, err := s.roleUC.AddRole(ctx, req)
	return &pb.AddRoleReply{RoleId: id}, err
}

// EditRole 编辑角色
func (s *RoleManageService) EditRole(ctx context.Context, req *pb.EditRoleRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.roleUC.EditRole(ctx, req)
}

// EditRoleDisabled 编辑角色状态
func (s *RoleManageService) EditRoleDisabled(ctx context.Context, req *pb.EditRoleDisabledRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.roleUC.EditRoleDisabled(ctx, req)
}

// DeleteRole 删除角色
func (s *RoleManageService) DeleteRole(ctx context.Context, req *pb.DeleteRoleRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.roleUC.DeleteRole(ctx, req.RoleId)
}

// RoleDetail 角色详情
func (s *RoleManageService) RoleDetail(ctx context.Context, req *pb.RoleDetailRequest) (*pb.RoleDetailReply, error) {
	return s.roleUC.RoleDetail(ctx, req.RoleId)
}

// RoleList 角色列表
func (s *RoleManageService) RoleList(ctx context.Context, req *pb.RoleListRequest) (*pb.RoleListReply, error) {
	return s.roleUC.RoleList(ctx, req)
}
