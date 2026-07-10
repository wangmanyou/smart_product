package service

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/login"
	"google.golang.org/protobuf/types/known/emptypb"

	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/scenemanage/v1"
)

type SceneManageService struct {
	pb.UnimplementedSceneManageServer
	sceneUC *biz.SceneManageUC
}

func NewSceneManageService(uc *biz.SceneManageUC) *SceneManageService {
	return &SceneManageService{
		sceneUC: uc,
	}
}

func (s *SceneManageService) CreateScene(ctx context.Context, req *pb.CreateSceneRequest) (*pb.CreateSceneReply, error) {
	ret := &pb.CreateSceneReply{SceneTemplateId: 0}
	id, err := s.sceneUC.CreateScene(ctx, req, login.UserInfo(ctx))
	ret.SceneTemplateId = id
	return ret, err
}

// EditSceneDisabled 编辑场景模版状态
func (s *SceneManageService) EditSceneDisabled(ctx context.Context, req *pb.EditSceneDisabledRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.sceneUC.EditSceneDisabled(ctx, req)
}

// EditScene 编辑场景(包括编辑名字，新增场景item，默认为可用)
func (s *SceneManageService) EditScene(ctx context.Context, req *pb.EditSceneRequest) (*emptypb.Empty, error) {
	ret := &emptypb.Empty{}
	err := s.sceneUC.EditScene(ctx, req, login.UserInfo(ctx))
	return ret, err
}

// SceneDetail 场景详情
func (s *SceneManageService) SceneDetail(ctx context.Context, req *pb.SceneDetailRequest) (*pb.SceneDetailReplay, error) {
	return s.sceneUC.SceneDetail(ctx, req.SceneTemplateId)
}

// SceneTemplateList 场景模版列表
func (s *SceneManageService) SceneTemplateList(ctx context.Context, req *pb.SceneTemplateListRequest) (*pb.SceneTemplateListReply, error) {
	return s.sceneUC.SceneTemplateList(ctx, req)
}

// DeleteSceneItem 删除场景条目
func (s *SceneManageService) DeleteSceneItem(ctx context.Context, req *pb.DeleteSceneItemRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.sceneUC.DeleteSceneItem(ctx, req)
}

// CopyScene 复制场景
func (s *SceneManageService) CopyScene(ctx context.Context, req *pb.CopySceneRequest) (*pb.CopySceneReply, error) {
	return s.sceneUC.CopyScene(ctx, req)
}
