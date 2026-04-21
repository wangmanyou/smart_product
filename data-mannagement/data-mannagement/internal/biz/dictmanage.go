package biz

import (
	"context"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/dictmanage/v1"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"github.com/go-kratos/kratos/v2/log"
)

type DictMangeRepo interface {
	CreateDict(ctx context.Context, dictData *pb.CreateDictRequest, header *dto.Header) (uint64, error)
	EditDict(ctx context.Context, dictData *pb.EditDictRequest) error
	DictTemplateList(ctx context.Context, dictData *pb.DictTemplateListRequest) (*pb.DictTemplateListReply, error)
	EditDictDirectoryName(ctx context.Context, dictData *pb.EditDictDirectoryNameRequest) error
	ExistsNameExcludeCurrentDirectoryName(ctx context.Context, dictTemplateId uint64, directoryId uint64, directoryName string) (bool, error)
	EditDictDirectoryDisabled(ctx context.Context, dictData *pb.EditDictDirectoryDisabledRequest) error
	EditDictDisabled(ctx context.Context, dictData *pb.EditDictDisabledRequest) error
	DeleteDictDirectory(ctx context.Context, dictData *pb.DeleteDictDirectoryRequest) error
	DictDetail(ctx context.Context, DictTemplateId uint64) (*pb.DictDetailReplay, error)
	GetDictBaseInfo(ctx context.Context, dictTemplateId uint64) (*models.DictTemplate, error)
}

// DictManageUC is a Greeter usecase.
type DictManageUC struct {
	repo DictMangeRepo
	log  *log.Helper
}

var DictManageBiz *DictManageUC

// NewDictManageUC new a Greeter usecase.
func NewDictManageUC(repo DictMangeRepo, logger log.Logger) *DictManageUC {
	DictManageBiz = &DictManageUC{repo: repo, log: log.NewHelper(logger)}
	return DictManageBiz
}

func (uc *DictManageUC) CreateDict(ctx context.Context, dictData *pb.CreateDictRequest, header *dto.Header) (uint64, error) {
	return uc.repo.CreateDict(ctx, dictData, header)

}

func (uc *DictManageUC) EditDict(ctx context.Context, dictData *pb.EditDictRequest) error {
	dictDetail, err := uc.repo.GetDictBaseInfo(ctx, dictData.DictTemplateId)
	if err != nil {
		return err
	}
	if (dictDetail.Type == "tree" && dictData.PlaneDict != nil) || (dictDetail.Type == "plane" && dictData.TreeDict != nil) {
		return errno.ErrorDictParamError("字典模版类型与实际传值不符")
	}
	return uc.repo.EditDict(ctx, dictData)

}

func (uc *DictManageUC) DictTemplateList(ctx context.Context, reqData *pb.DictTemplateListRequest) (*pb.DictTemplateListReply, error) {
	return uc.repo.DictTemplateList(ctx, reqData)

}

func (uc *DictManageUC) EditDictDirectoryName(ctx context.Context, reqData *pb.EditDictDirectoryNameRequest) error {
	// 名字查重
	has, err := uc.repo.ExistsNameExcludeCurrentDirectoryName(ctx, reqData.DictTemplateId, reqData.DictDirectoryId, reqData.DictDirectoryName)
	if has == false {
		return uc.repo.EditDictDirectoryName(ctx, reqData)
	}
	return err
}

func (uc *DictManageUC) EditDictDirectoryDisabled(ctx context.Context, reqData *pb.EditDictDirectoryDisabledRequest) error {
	return uc.repo.EditDictDirectoryDisabled(ctx, reqData)
}

func (uc *DictManageUC) EditDictDisabled(ctx context.Context, reqData *pb.EditDictDisabledRequest) error {
	return uc.repo.EditDictDisabled(ctx, reqData)
}

func (uc *DictManageUC) DeleteDictDirectory(ctx context.Context, reqData *pb.DeleteDictDirectoryRequest) error {
	return uc.repo.DeleteDictDirectory(ctx, reqData)
}

func (uc *DictManageUC) DictDetail(ctx context.Context, DictTemplateId uint64) (*pb.DictDetailReplay, error) {
	return uc.repo.DictDetail(ctx, DictTemplateId)
}
