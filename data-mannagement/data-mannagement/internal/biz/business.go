package biz

import (
	"context"
	"fmt"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/businessmanage/v1"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/log"
	"github.com/xuri/excelize/v2"
	"regexp"
	"strconv"
	"strings"
)

type BusinessMangeRepo interface {
	AddBusinessKnowledge(ctx context.Context, req *pb.AddBusinessKnowledgeRequest, header *dto.Header) (uint64, error)
	BusinessKnowledgeDetail(ctx context.Context, req *pb.BusinessKnowledgeDetailRequest) (*pb.BusinessKnowledgeDetailReply, error)
	EditBusinessKnowledge(ctx context.Context, req *pb.EditBusinessKnowledgeRequest) error
	DeleteBusinessKnowledge(ctx context.Context, KnowledgeId uint64) error
	BusinessKnowledgeSetting(ctx context.Context, req *pb.BusinessKnowledgeSettingRequest) error
	BusinessKnowledgeList(ctx context.Context, req *pb.BusinessKnowledgeListRequest) (*pb.BusinessKnowledgeListReply, error)
	ExportBusinessKnowledge(ctx context.Context, SceneTemplateId uint64) (*models.SceneTemplate, []*models.SceneItem, error)
	ExportBusinessKnowledgeData(ctx context.Context, SceneTemplateId uint64) (*pb.BusinessKnowledgeListReply, error)
	SceneItemDetail(ctx context.Context, SceneTemplateId uint64) (map[uint64]*models.SceneItem, error)
	BusinessKnowledgeDataNumStatistics(ctx context.Context, req *pb.BusinessKnowledgeDataNumStatisticsRequest) ([]*models.StatisticsKnowledgeNum, error)
	BusinessKnowledgeDataStatisticsBySceneAndCreator(ctx context.Context, req *pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorRequest) ([]*models.StatisticsKnowledgeByCreator, error)
}

// BusinessManageUC is a Greeter usecase.
type BusinessManageUC struct {
	repo BusinessMangeRepo
	log  *log.Helper
	conf *conf.Data
}

// NewBusinessManageUC new a Greeter usecase.
func NewBusinessManageUC(repo BusinessMangeRepo, logger log.Logger, c *conf.Data) *BusinessManageUC {
	return &BusinessManageUC{
		repo: repo,
		log:  log.NewHelper(logger),
		conf: c,
	}
}

func (uc *BusinessManageUC) BusinessDetail(ctx context.Context, SceneTemplateId uint64) (*pb.BusinessDetailReply, error) {
	SceneDetail, err := SceneManageBiz.SceneDetail(ctx, SceneTemplateId)
	if err != nil {
		return nil, err
	}

	ret := &pb.BusinessDetailReply{
		DictDetails: nil,
		SceneDetail: SceneDetail,
	}
	for _, item := range SceneDetail.SceneItem {
		if item.Type == "dict" {
			dictDetail, err := DictManageBiz.DictDetail(ctx, item.DictTemplateId)
			if err != nil {
				return nil, err
			}
			ret.DictDetails = append(ret.DictDetails, dictDetail)
		}
	}

	return ret, nil
}

func (uc *BusinessManageUC) AddBusinessKnowledge(ctx context.Context, req *pb.AddBusinessKnowledgeRequest, header *dto.Header) (uint64, error) {
	return uc.repo.AddBusinessKnowledge(ctx, req, header)
}

func (uc *BusinessManageUC) BusinessKnowledgeDetail(ctx context.Context, req *pb.BusinessKnowledgeDetailRequest) (*pb.BusinessKnowledgeDetailReply, error) {
	return uc.repo.BusinessKnowledgeDetail(ctx, req)
}

func (uc *BusinessManageUC) EditBusinessKnowledge(ctx context.Context, req *pb.EditBusinessKnowledgeRequest) error {
	return uc.repo.EditBusinessKnowledge(ctx, req)
}

func (uc *BusinessManageUC) DeleteBusinessKnowledge(ctx context.Context, KnowledgeId uint64) error {
	return uc.repo.DeleteBusinessKnowledge(ctx, KnowledgeId)
}

func (uc *BusinessManageUC) BusinessKnowledgeSetting(ctx context.Context, req *pb.BusinessKnowledgeSettingRequest) error {
	return uc.repo.BusinessKnowledgeSetting(ctx, req)
}

func (uc *BusinessManageUC) BusinessKnowledgeList(ctx context.Context, req *pb.BusinessKnowledgeListRequest) (*pb.BusinessKnowledgeListReply, error) {
	return uc.repo.BusinessKnowledgeList(ctx, req)
}

func (uc *BusinessManageUC) BusinessKnowledgeTemplateExport(ctx context.Context, SceneTemplateId uint64) (string, error) {
	sceneTemplate, sceneItems, err := uc.repo.ExportBusinessKnowledge(ctx, SceneTemplateId)
	if err != nil {
		return "", err
	}

	// 创建一个新的 Excel 文件
	f := excelize.NewFile()

	// 创建一个工作表
	sheetName := "Sheet1"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		logz.Err("Error saving file: %v", err)
		return "", errno.ErrorSystemError("创建文件失败")
	}

	// 设置表头
	var data []interface{}
	var total int
	for _, header := range sceneItems {
		// 跳过隐藏的、字典字段
		if header.IsHide || header.Type == "dict" {
			continue
		}
		// text: 文本，integer:整数，decimal:小数，datetime:日期，picture:图片，video:视频，audio:音频，file:文件
		if header.Type == "text" {
			data = append(data, "example-text")
		} else if header.Type == "integer" {
			data = append(data, 1)
		} else if header.Type == "decimal" {
			data = append(data, 1.1)
		} else if header.Type == "datetime" {
			data = append(data, "2025-01-02")
		} else {
			continue
		}

		cell := fmt.Sprintf("%s1", string('A'+total)) // A1, B1, C1, ...
		if err := f.SetCellValue(sheetName, cell, fmt.Sprintf("%s(%d)", header.Name, header.Id)); err != nil {
			logz.Err("Error setting header", err)
			return "", errno.ErrorSystemError("创建文件失败")
		}
		total += 1

	}

	// 添加一些数据
	for colIdx, value := range data {
		cell := fmt.Sprintf("%s%d", string('A'+colIdx), 2) // A2, B2, ...
		if err := f.SetCellValue(sheetName, cell, value); err != nil {
			logz.Err("Error setting cell value: %v", err)
			return "", errno.ErrorSystemError("创建文件失败")
		}
	}

	// 设置活动工作表
	f.SetActiveSheet(index)

	// 保存 Excel 文件
	outputFileName := fmt.Sprintf("%s/%s_知识导入模版示例.xlsx", uc.conf.FileCache.TempRootDir, sceneTemplate.Name)
	if err := f.SaveAs(outputFileName); err != nil {
		logz.Err("Error saving file: %v", err)
		return "", errno.ErrorSystemError("创建文件失败")
	}
	return outputFileName, nil
}

func parseStringsToUint64s(input []string) ([]uint64, error) {
	// 定义正则表达式，匹配括号内的数字
	re := regexp.MustCompile(`\((\d+)\)`)

	var result []uint64

	for _, str := range input {
		// 使用正则提取括号内的数字
		matches := re.FindStringSubmatch(str)
		if len(matches) > 1 {
			// 将提取到的字符串数字转换为 uint64
			num, err := strconv.ParseUint(matches[1], 10, 64)
			if err != nil {
				return nil, fmt.Errorf("解析失败: %v (输入: %s)", err, str)
			}
			result = append(result, num)
		}
	}

	return result, nil
}

func (uc *BusinessManageUC) BusinessKnowledgeDataImport(ctx context.Context, filePath string, SceneTemplateId uint64, header *dto.Header) error {
	// 打开 Excel 文件
	filePath = uc.conf.FileCache.TempRootDir + strings.TrimPrefix(filePath, uc.conf.FileCache.Prefix)
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		logz.Err("Failed to open file", err)
		return errno.ErrorSystemError("打开文件失败")
	}

	// 指定工作表
	sheetName := "Sheet1"

	// 获取所有行
	rows, err := f.GetRows(sheetName)
	if err != nil {
		logz.Err("Failed to get rows", err)
		return errno.ErrorSystemError("打开文件失败")
	}

	// 确保文件有数据
	if len(rows) < 1 {
		logz.Err("Invalid file format: less than 2 rows for headers", err)
		return nil
	}

	// 解析双层表头
	firstRow := rows[0] // 第一层表头
	sceneItemIds, err := parseStringsToUint64s(firstRow)
	if err != nil {
		return errno.ErrorSystemError("文件格式不对")
	}

	logz.Info(fmt.Sprintf("First Row Headers:%v", firstRow))

	// 读取数据部分
	sceneItemMap, err := uc.repo.SceneItemDetail(ctx, SceneTemplateId)
	if err != nil {
		return err
	}
	println(len(rows))
	for i := 1; i < len(rows); i++ { // 数据从第2行开始
		row := rows[i]
		addKnowledge := &pb.AddBusinessKnowledgeRequest{
			SceneTemplateId: SceneTemplateId,
			Knowledge:       nil,
		}
		logz.Info(fmt.Sprintf("Row %d Data: %v\n", i+1, row))
		for index, item := range rows[i] {
			SceneItemValue := strings.Split(item, ",")
			sceneItem, ok := sceneItemMap[sceneItemIds[index]]
			if ok && sceneItem.Type == "text" {
				SceneItemValue = []string{item}
			}
			addKnowledge.Knowledge = append(addKnowledge.Knowledge, &pb.AddBusinessKnowledgeRequest_Knowledge{
				SceneItemId: sceneItemIds[index],
				//SceneItemType:              "",
				SceneItemValue: SceneItemValue,
				//SceneItemSelectDictTreeIds: "",
			})
		}
		_, err = uc.AddBusinessKnowledge(ctx, addKnowledge, header)
		if err != nil {
			logz.Err("Error saving file: %v", err)
		}
	}

	return err
}

func (uc *BusinessManageUC) BusinessKnowledgeDataExport(ctx context.Context, SceneTemplateId uint64) (string, error) {
	sceneTemplate, sceneItems, err := uc.repo.ExportBusinessKnowledge(ctx, SceneTemplateId)
	if err != nil {
		return "", err
	}

	knowledgeList, err := uc.repo.ExportBusinessKnowledgeData(ctx, SceneTemplateId)
	if err != nil {
		return "", err
	}

	// 创建一个新的 Excel 文件
	f := excelize.NewFile()
	// 创建一个工作表
	sheetName := "Sheet1"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		logz.Err("Error saving file: %v", err)
		return "", errno.ErrorSystemError("创建文件失败")
	}

	var total int
	for _, header := range sceneItems {
		// 跳过隐藏的
		if header.IsHide {
			continue
		}

		cell := fmt.Sprintf("%s1", string('A'+total)) // A1, B1, C1, ...
		if err := f.SetCellValue(sheetName, cell, fmt.Sprintf("%s(%d)", header.Name, header.Id)); err != nil {
			logz.Err("Error setting header", err)
			return "", errno.ErrorSystemError("创建文件失败")
		}
		total += 1

	}

	// 添加一些数据
	for rolIdx, item := range knowledgeList.Content {
		for colIdx, knowledgeData := range item.KnowledgeShow {
			cell := fmt.Sprintf("%s%d", string('A'+colIdx), rolIdx+2) // A2, B2, ...
			data := strings.Join(knowledgeData.SceneItemValue, ",")
			if knowledgeData.SceneItemType == "dict" {
				data = knowledgeData.SceneItemSelectDictTreeIds
			}
			if err = f.SetCellValue(sheetName, cell, data); err != nil {
				logz.Err("Error setting cell value: %v", err)
				return "", errno.ErrorSystemError("创建文件失败")
			}
		}
	}

	// 设置活动工作表
	f.SetActiveSheet(index)

	// 保存 Excel 文件
	outputFileName := fmt.Sprintf("%s/%s_知识导出.xlsx", uc.conf.FileCache.TempRootDir, sceneTemplate.Name)
	if err := f.SaveAs(outputFileName); err != nil {
		logz.Err("Error saving file: %v", err)
		return "", errno.ErrorSystemError("创建文件失败")
	}
	return outputFileName, nil
}

func (uc *BusinessManageUC) BusinessKnowledgeDataNumStatistics(ctx context.Context, req *pb.BusinessKnowledgeDataNumStatisticsRequest) ([]*models.StatisticsKnowledgeNum, error) {
	return uc.repo.BusinessKnowledgeDataNumStatistics(ctx, req)
}

func (uc *BusinessManageUC) BusinessKnowledgeDataStatisticsBySceneAndCreator(ctx context.Context, req *pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorRequest) ([]*models.StatisticsKnowledgeByCreator, error) {
	return uc.repo.BusinessKnowledgeDataStatisticsBySceneAndCreator(ctx, req)
}
