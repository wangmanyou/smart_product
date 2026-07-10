package biz

import (
	"context"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/scenemanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"github.com/go-kratos/kratos/v2/log"
)

type SceneMangeRepo interface {
	CreateScene(ctx context.Context, req *pb.CreateSceneRequest, header *dto.Header) (uint64, error)
	EditSceneDisabled(ctx context.Context, dictData *pb.EditSceneDisabledRequest) error
	EditScene(ctx context.Context, reqData *pb.EditSceneRequest, header *dto.Header) error
	SceneDetail(ctx context.Context, SceneTemplateId uint64) (*pb.SceneDetailReplay, error)
	SceneTemplateList(ctx context.Context, dictData *pb.SceneTemplateListRequest) (*pb.SceneTemplateListReply, error)
	DeleteSceneItem(ctx context.Context, req *pb.DeleteSceneItemRequest) error
	CopyScene(ctx context.Context, req *pb.CopySceneRequest) (*pb.CopySceneReply, error)
}

// SceneManageUC is a Greeter usecase.
type SceneManageUC struct {
	repo SceneMangeRepo
	log  *log.Helper
}

var SceneManageBiz *SceneManageUC

// NewSceneManageUC new a Greeter usecase.
func NewSceneManageUC(repo SceneMangeRepo, logger log.Logger) *SceneManageUC {
	SceneManageBiz = &SceneManageUC{repo: repo, log: log.NewHelper(logger)}
	return SceneManageBiz
}

func (uc *SceneManageUC) CreateScene(ctx context.Context, req *pb.CreateSceneRequest, header *dto.Header) (uint64, error) {
	return uc.repo.CreateScene(ctx, req, header)
}

func (uc *SceneManageUC) EditSceneDisabled(ctx context.Context, reqData *pb.EditSceneDisabledRequest) error {
	return uc.repo.EditSceneDisabled(ctx, reqData)
}

func (uc *SceneManageUC) EditScene(ctx context.Context, reqData *pb.EditSceneRequest, header *dto.Header) error {
	return uc.repo.EditScene(ctx, reqData, header)
}

func (uc *SceneManageUC) SceneDetail(ctx context.Context, SceneTemplateId uint64) (*pb.SceneDetailReplay, error) {
	return uc.repo.SceneDetail(ctx, SceneTemplateId)
}

func (uc *SceneManageUC) SceneTemplateList(ctx context.Context, reqData *pb.SceneTemplateListRequest) (*pb.SceneTemplateListReply, error) {
	return uc.repo.SceneTemplateList(ctx, reqData)

}

func (uc *SceneManageUC) DeleteSceneItem(ctx context.Context, req *pb.DeleteSceneItemRequest) error {
	return uc.repo.DeleteSceneItem(ctx, req)
}

func (uc *SceneManageUC) CopyScene(ctx context.Context, req *pb.CopySceneRequest) (*pb.CopySceneReply, error) {
	return uc.repo.CopyScene(ctx, req)
}
