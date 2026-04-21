package service

import (
	"context"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/login"
	"google.golang.org/protobuf/types/known/emptypb"

	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/dictmanage/v1"
)

type DictManageService struct {
	pb.UnimplementedDictManageServer
	dictUC *biz.DictManageUC
}

func NewDictManageService(uc *biz.DictManageUC) *DictManageService {
	return &DictManageService{dictUC: uc}
}

func (s *DictManageService) CreateDict(ctx context.Context, req *pb.CreateDictRequest) (*pb.CreateDictReply, error) {
	ret := &pb.CreateDictReply{}
	if req.TreeDict != nil && req.PlaneDict != nil {
		return ret, errno.ErrorDictParamError("字典输入参数错误")
	}

	dictId, err := s.dictUC.CreateDict(ctx, req, login.UserInfo(ctx))
	if err != nil {
		return nil, err
	}
	ret.DictTemplateId = dictId
	return ret, nil
}

// EditDict 编辑字典
func (s *DictManageService) EditDict(ctx context.Context, req *pb.EditDictRequest) (*emptypb.Empty, error) {
	ret := &emptypb.Empty{}
	if req.TreeDict != nil && req.PlaneDict != nil {
		return ret, errno.ErrorDictParamError("字典输入参数错误")
	}
	err := s.dictUC.EditDict(ctx, req)
	if err != nil {
		return nil, err
	}
	return ret, nil
}

// DictDetail 字典详情(包括字典名字，目录结构)
func (s *DictManageService) DictDetail(ctx context.Context, req *pb.DictDetailRequest) (*pb.DictDetailReplay, error) {
	return s.dictUC.DictDetail(ctx, req.DictTemplateId)
}

// EditDictDisabled 编辑字典模版状态
func (s *DictManageService) EditDictDisabled(ctx context.Context, req *pb.EditDictDisabledRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.dictUC.EditDictDisabled(ctx, req)
}

// DictTemplateList 字典模版列表
func (s *DictManageService) DictTemplateList(ctx context.Context, req *pb.DictTemplateListRequest) (*pb.DictTemplateListReply, error) {
	return s.dictUC.DictTemplateList(ctx, req)
}

// EditDictDirectoryName 编辑字典目录名字
func (s *DictManageService) EditDictDirectoryName(ctx context.Context, req *pb.EditDictDirectoryNameRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.dictUC.EditDictDirectoryName(ctx, req)
}

// EditDictDirectoryDisabled 编辑字典目录是否可用
func (s *DictManageService) EditDictDirectoryDisabled(ctx context.Context, req *pb.EditDictDirectoryDisabledRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.dictUC.EditDictDirectoryDisabled(ctx, req)
}

// DeleteDictDirectory 删除字典目录（级联删除）
func (s *DictManageService) DeleteDictDirectory(ctx context.Context, req *pb.DeleteDictDirectoryRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.dictUC.DeleteDictDirectory(ctx, req)
}
