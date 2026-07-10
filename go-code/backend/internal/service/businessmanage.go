package service

import (
	"context"
	"fmt"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/businessmanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/login"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/transport/http"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/emptypb"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
)

type BusinessManageService struct {
	pb.UnimplementedBusinessManageServer
	businessUC *biz.BusinessManageUC
	conf       *conf.Data
}

func NewBusinessManageService(uc *biz.BusinessManageUC, c *conf.Data) *BusinessManageService {
	return &BusinessManageService{
		businessUC: uc,
		conf:       c,
	}
}

func (s *BusinessManageService) BusinessDetail(ctx context.Context, req *pb.BusinessDetailRequest) (*pb.BusinessDetailReply, error) {
	return s.businessUC.BusinessDetail(ctx, req.SceneTemplateId)
}

// AddBusinessKnowledge 新增知识
func (s *BusinessManageService) AddBusinessKnowledge(ctx context.Context, req *pb.AddBusinessKnowledgeRequest) (*pb.AddBusinessKnowledgeReply, error) {
	id, err := s.businessUC.AddBusinessKnowledge(ctx, req, login.UserInfo(ctx))
	ret := &pb.AddBusinessKnowledgeReply{KnowledgeId: id}
	return ret, err
}

// BusinessKnowledgeDetail 知识详情
func (s *BusinessManageService) BusinessKnowledgeDetail(ctx context.Context, req *pb.BusinessKnowledgeDetailRequest) (*pb.BusinessKnowledgeDetailReply, error) {
	return s.businessUC.BusinessKnowledgeDetail(ctx, req)
}

// EditBusinessKnowledge 编辑知识值
func (s *BusinessManageService) EditBusinessKnowledge(ctx context.Context, req *pb.EditBusinessKnowledgeRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.businessUC.EditBusinessKnowledge(ctx, req)
}

// DeleteBusinessKnowledge 删除知识
func (s *BusinessManageService) DeleteBusinessKnowledge(ctx context.Context, req *pb.DeleteBusinessKnowledgeRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.businessUC.DeleteBusinessKnowledge(ctx, req.KnowledgeId)
}

// BusinessKnowledgeSetting 知识设置，修改点击次数等
func (s *BusinessManageService) BusinessKnowledgeSetting(ctx context.Context, req *pb.BusinessKnowledgeSettingRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.businessUC.BusinessKnowledgeSetting(ctx, req)
}

// BusinessKnowledgeList 知识列表
func (s *BusinessManageService) BusinessKnowledgeList(ctx context.Context, req *pb.BusinessKnowledgeListRequest) (*pb.BusinessKnowledgeListReply, error) {
	return s.businessUC.BusinessKnowledgeList(ctx, req)
}

func (s *BusinessManageService) UploadFile(ctx http.Context) error {
	req := ctx.Request()
	fileName := req.FormValue("filename")
	file, _, err := req.FormFile("file")
	if err != nil {
		logz.Error(fmt.Sprintf("UploadFile error:%v", err.Error()))
		return err
	}
	defer file.Close()
	// 创建临时文件存储分片
	tempDir := path.Join(s.conf.FileCache.TempRootDir, uuid.New().String())
	err = helper.CreateDir(tempDir)
	if err != nil {
		logz.Error(fmt.Sprintf("UploadFile error:%v", err.Error()))
		return err
	}
	tempFilePath := filepath.Join(tempDir, fileName)
	f, err := os.OpenFile(tempFilePath, os.O_WRONLY|os.O_CREATE, 0o666)
	if err != nil {
		logz.Error(fmt.Sprintf("UploadFile error:%v", err.Error()))
		return err
	}
	defer f.Close()
	_, _ = io.Copy(f, file)
	if err != nil {
		logz.Error(fmt.Sprintf("UploadFile error:%v", err.Error()))
		return err
	}

	// 构建JSON对象
	resp := map[string]string{
		"status":    "success",
		"message":   fileName + " uploaded successfully",
		"file_path": strings.Replace(tempFilePath, s.conf.FileCache.TempRootDir, s.conf.FileCache.Prefix, 1),
	}
	return ctx.JSON(200, resp)
}

// BusinessKnowledgeTemplateExport 导出模版
func (s *BusinessManageService) BusinessKnowledgeTemplateExport(ctx context.Context, req *pb.BusinessKnowledgeTemplateExportRequest) (*pb.BusinessKnowledgeTemplateExportReply, error) {
	sceneTemplateId := req.SceneTemplateId

	ret := &pb.BusinessKnowledgeTemplateExportReply{}

	filepath, err := s.businessUC.BusinessKnowledgeTemplateExport(ctx, sceneTemplateId)
	if err != nil {
		return ret, err
	}

	ret.FilePath = strings.Replace(filepath, s.conf.FileCache.TempRootDir, s.conf.FileCache.Prefix, 1)
	return ret, nil
}

// BusinessKnowledgeDataImport 导入数据
func (s *BusinessManageService) BusinessKnowledgeDataImport(ctx context.Context, req *pb.BusinessKnowledgeDataImportRequest) (*emptypb.Empty, error) {
	return &emptypb.Empty{}, s.businessUC.BusinessKnowledgeDataImport(ctx, req.FilePath, req.SceneTemplateId, login.UserInfo(ctx))

}

// BusinessKnowledgeDataExport 场景知识数据导出
func (s *BusinessManageService) BusinessKnowledgeDataExport(ctx context.Context, req *pb.BusinessKnowledgeDataExportRequest) (*pb.BusinessKnowledgeDataExportReply, error) {
	sceneTemplateId := req.SceneTemplateId

	ret := &pb.BusinessKnowledgeDataExportReply{}

	filepath, err := s.businessUC.BusinessKnowledgeDataExport(ctx, sceneTemplateId)
	if err != nil {
		return ret, err
	}

	ret.FilePath = strings.Replace(filepath, s.conf.FileCache.TempRootDir, s.conf.FileCache.Prefix, 1)
	return ret, nil
}

// BusinessKnowledgeDataNumStatistics 按照场景----知识数量统计
func (s *BusinessManageService) BusinessKnowledgeDataNumStatistics(ctx context.Context, req *pb.BusinessKnowledgeDataNumStatisticsRequest) (*pb.BusinessKnowledgeDataNumStatisticsReply, error) {
	knoledgeNums, err := s.businessUC.BusinessKnowledgeDataNumStatistics(ctx, req)
	if err != nil {
		return nil, err
	}
	ret := &pb.BusinessKnowledgeDataNumStatisticsReply{
		Content:       nil,
		TotalElements: int32(len(knoledgeNums)),
	}
	for _, item := range knoledgeNums {
		ret.Content = append(ret.Content, &pb.BusinessKnowledgeDataNumStatisticsReplyKnowledgeNum{
			SceneName:              item.SceneTemplateName,
			KnowledgeNum:           item.KnowledgeCount,
			KnowledgeViewTimeCount: item.KnowledgeViewTimeCount,
		})
	}
	return ret, nil
}

// BusinessKnowledgeDataStatisticsBySceneAndCreator 按照场景和知识创建人----统计数据
func (s *BusinessManageService) BusinessKnowledgeDataStatisticsBySceneAndCreator(ctx context.Context, req *pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorRequest) (*pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorReply, error) {
	static, err := s.businessUC.BusinessKnowledgeDataStatisticsBySceneAndCreator(ctx, req)
	if err != nil {
		return nil, err
	}
	ret := &pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorReply{
		Content:       nil,
		TotalElements: int32(len(static)),
	}
	for _, item := range static {
		ret.Content = append(ret.Content, &pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorReplyKnowledge{
			KnowledgeNum: item.KnowledgeCount,
			CreatorName:  item.CreatorName,
		})
	}
	return ret, nil
}
