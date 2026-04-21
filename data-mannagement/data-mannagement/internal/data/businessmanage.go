package data

import (
	"context"
	"fmt"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/businessmanage/v1"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/log"
	"strings"
	"time"
)

var _ biz.BusinessMangeRepo = &businessManageRepo{}

type businessManageRepo struct {
	*BaseRepo
	data *Data
	log  *log.Helper
}

// NewBusinessMangeRepo .
func NewBusinessMangeRepo(data *Data, logger log.Logger) biz.BusinessMangeRepo {
	return &businessManageRepo{
		BaseRepo: NewBaseRepo(data),
		data:     data,
		log:      log.NewHelper(logger),
	}
}

func (b businessManageRepo) AddBusinessKnowledge(ctx context.Context, req *pb.AddBusinessKnowledgeRequest, header *dto.Header) (uint64, error) {
	session := b.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	if err != nil {
		return 0, err
	}
	Knowledge := models.Knowledge{
		Id:              0,
		SceneTemplateId: req.SceneTemplateId,
		ViewTime:        0,
		ViewAt:          time.Time{},
		CreateAt:        time.Time{},
		UpdateAt:        time.Time{},
		CreatorId:       header.CreatorId,
		CreatorName:     header.CreatorName,
		Del:             0,
	}
	_, err = session.Insert(&Knowledge)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("AddBusinessKnowledge db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}
	sceneItems, err := b.SceneItemDetail(ctx, req.SceneTemplateId)
	if err != nil {
		return 0, err
	}
	for _, item := range req.Knowledge {
		one := models.KnowledgeItem{
			Id:             0,
			KnowledgeId:    Knowledge.Id,
			SceneItemId:    item.SceneItemId,
			SceneItemValue: strings.Join(item.SceneItemValue, ","),
			//SelectDictLeafIDs: Uint64SliceToCommaSeparatedString(item.SceneItemSelectDictLeafIds),
			SelectDictTreeIDs: item.SceneItemSelectDictTreeIds,
		}
		_, err = session.Insert(&one)
		if err != nil {
			tx.RollbackTrans()
			logz.Err("AddBusinessKnowledge db error", err)
			return 0, errno.ErrorDbError("网络问题，请再次重试")
		}
		delete(sceneItems, item.SceneItemId)
	}

	for _, item := range sceneItems {
		one := models.KnowledgeItem{
			Id:                0,
			KnowledgeId:       Knowledge.Id,
			SceneItemId:       item.Id,
			SceneItemValue:    "",
			SelectDictTreeIDs: "",
		}
		_, err = session.Insert(&one)
		if err != nil {
			tx.RollbackTrans()
			logz.Err("AddBusinessKnowledge db error", err)
			return 0, errno.ErrorDbError("网络问题，请再次重试")
		}
	}

	// 修改场景状态为已经使用
	one := models.SceneTemplate{
		Id:     req.SceneTemplateId,
		IsUsed: true,
	}
	_, err = session.Table(cons.TableSceneTemplate).Where("id=?", req.SceneTemplateId).MustCols("is_used").Update(&one)
	if err != nil {
		logz.Err("AddBusinessKnowledge db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}
	session.Commit()
	return Knowledge.Id, nil
}

func (b businessManageRepo) BusinessKnowledgeDetail(ctx context.Context, req *pb.BusinessKnowledgeDetailRequest) (*pb.BusinessKnowledgeDetailReply, error) {
	ret := &pb.BusinessKnowledgeDetailReply{
		KnowledgeShow: nil,
		CreatorName:   "",
		ViewTime:      0,
		UpdateTime:    0,
		CreateTime:    0,
		KnowledgeId:   0,
	}
	knowledge := models.Knowledge{}
	has, err := b.s(ctx).Table(cons.TableKnowledge).Where("id=? and del=0", req.KnowledgeId).Get(&knowledge)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if has == false {
		return nil, errno.ErrorDbError("该知识不存在")
	}
	ret.CreatorName = knowledge.CreatorName
	ret.ViewTime = knowledge.ViewTime
	ret.UpdateTime = knowledge.UpdateAt.Unix()
	ret.CreateTime = knowledge.CreateAt.Unix()
	ret.KnowledgeId = knowledge.Id

	knowledge.ViewTime += 1
	_, err = b.s(ctx).Table(cons.TableKnowledge).Where("id=? and del=0", req.KnowledgeId).Update(&knowledge)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	var knowledgeItems []*models.KnowledgeItem
	err = b.s(ctx).Table(cons.TableKnowledgeItem).Where("knowledge_id=?", req.KnowledgeId).Find(&knowledgeItems)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	var sceneItemAll []*models.SceneItem
	err = b.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=?", knowledge.SceneTemplateId).OrderBy("sort_number").Find(&sceneItemAll)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	knowledgeItemsAllMap := make(map[uint64]*models.KnowledgeItem, 0)
	for _, item := range knowledgeItems {
		knowledgeItemsAllMap[item.SceneItemId] = item
	}
	for _, item := range sceneItemAll {
		if item.IsHide {
			continue
		}
		knowledgeItem, ok := knowledgeItemsAllMap[item.Id]
		//var SceneItemSelectDictLeafIds []uint64
		var SceneItemValue []string
		var SelectDictTreeIDs string
		if ok {
			//SceneItemSelectDictLeafIds, err = CommaSeparatedStringToUint64Slice(knowledgeItem.SelectDictLeafIDs)
			//if err != nil {
			//	logz.Err("string convert []uint64 error", err)
			//}
			SceneItemValue = strings.Split(knowledgeItem.SceneItemValue, ",")
			if knowledgeItem.SceneItemValue == "" {
				SceneItemValue = nil
			}
			SelectDictTreeIDs = knowledgeItem.SelectDictTreeIDs
		}

		ret.KnowledgeShow = append(ret.KnowledgeShow, &pb.BusinessKnowledgeDetailReply_Knowledge{
			SceneItemId:    item.Id,
			SceneItemType:  item.Type,
			SceneItemValue: SceneItemValue,
			//SceneItemSelectDictLeafIds: SceneItemSelectDictLeafIds,
			SceneItemSelectDictTreeIds: SelectDictTreeIDs,
			//SelectDictTreeIds:          knowledgeItem.SelectDictTreeIDs,
			SceneItemName: item.Name,
		})
	}

	return ret, nil
}

func (b businessManageRepo) ExportBusinessKnowledge(ctx context.Context, SceneTemplateId uint64) (*models.SceneTemplate, []*models.SceneItem, error) {
	var sceneItemAll []*models.SceneItem
	err := b.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=?", SceneTemplateId).OrderBy("sort_number").Find(&sceneItemAll)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	var sceneTemplate models.SceneTemplate
	has, err := b.s(ctx).Table(cons.TableSceneTemplate).Where("id=?", SceneTemplateId).Get(&sceneTemplate)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	if has == false {
		logz.Err("BusinessKnowledgeDetail not exists", err)
		return nil, nil, errno.ErrorDbError("知识不存在")
	}

	return &sceneTemplate, sceneItemAll, nil
}

func (b businessManageRepo) ImportBusinessKnowledgeData(ctx context.Context, req *pb.AddBusinessKnowledgeRequest, header *dto.Header) (uint64, error) {
	session := b.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	if err != nil {
		return 0, err
	}
	Knowledge := models.Knowledge{
		Id:              0,
		SceneTemplateId: req.SceneTemplateId,
		ViewTime:        0,
		ViewAt:          time.Time{},
		CreateAt:        time.Time{},
		UpdateAt:        time.Time{},
		CreatorId:       header.CreatorId,
		CreatorName:     header.CreatorName,
		Del:             0,
	}
	_, err = session.Insert(&Knowledge)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("AddBusinessKnowledge db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}

	for _, item := range req.Knowledge {
		one := models.KnowledgeItem{
			Id:             0,
			KnowledgeId:    Knowledge.Id,
			SceneItemId:    item.SceneItemId,
			SceneItemValue: strings.Join(item.SceneItemValue, ","),
			//SelectDictTreeIDs: item.SceneItemSelectDictTreeIds,
		}
		_, err = session.Insert(&one)
		if err != nil {
			tx.RollbackTrans()
			logz.Err("AddBusinessKnowledge db error", err)
			return 0, errno.ErrorDbError("网络问题，请再次重试")
		}
	}
	session.Commit()
	return Knowledge.Id, nil
}

func (b businessManageRepo) ExportBusinessKnowledgeData(ctx context.Context, SceneTemplateId uint64) (*pb.BusinessKnowledgeListReply, error) {
	var knowledgeList []*models.KnowledgeList

	m := map[string]interface{}{
		"SceneTemplateId": SceneTemplateId,
	}

	var counts int64
	if err := b.SqlTplGet(ctx, "business_template_count.stpl", &m, &counts); err != nil {
		logz.Err(" BusinessKnowledgeList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if err := b.SqlTplFind(ctx, "business_template_list.stpl", &m, &knowledgeList); err != nil {
		logz.Err(" BusinessKnowledgeList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	var sceneItemAll []*models.SceneItem
	err := b.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=?", SceneTemplateId).OrderBy("sort_number").Find(&sceneItemAll)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	ret := &pb.BusinessKnowledgeListReply{
		Content:       nil,
		TotalElements: int32(counts),
	}
	for _, knowledgeItem := range knowledgeList {
		content := &pb.BusinessKnowledgeDetailReply{
			KnowledgeShow: nil,
			KnowledgeId:   knowledgeItem.KnowledgeID,
			CreatorName:   knowledgeItem.CreatorName,
			ViewTime:      knowledgeItem.ViewTime,
			UpdateTime:    knowledgeItem.UpdateAt.Unix(),
			CreateTime:    knowledgeItem.CreateAt.Unix(),
		}

		for _, sceneItem := range sceneItemAll {
			if sceneItem.IsHide {
				continue
			}
			knowledgeItemValue, ok := knowledgeItem.SceneItemMap[sceneItem.Id]
			var SceneItemSelectDictTreeIds string
			var SceneItemValue []string
			if ok {
				SceneItemSelectDictTreeIds = knowledgeItemValue.SelectDictTreeIDs
				SceneItemValue = strings.Split(knowledgeItemValue.SceneItemValue, ",")
				if knowledgeItemValue.SceneItemValue == "" {
					SceneItemValue = nil
				}
			}

			content.KnowledgeShow = append(content.KnowledgeShow, &pb.BusinessKnowledgeDetailReply_Knowledge{
				SceneItemId:                sceneItem.Id,
				SceneItemType:              sceneItem.Type,
				SceneItemName:              sceneItem.Name,
				SceneItemValue:             SceneItemValue,             // sql查询的
				SceneItemSelectDictTreeIds: SceneItemSelectDictTreeIds, // sql查询的
			})
		}
		ret.Content = append(ret.Content, content)
	}

	return ret, nil
}

func (b businessManageRepo) SceneItemDetail(ctx context.Context, SceneTemplateId uint64) (map[uint64]*models.SceneItem, error) {
	var sceneItems []*models.SceneItem
	err := b.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=? and del=0", SceneTemplateId).OrderBy("sort_number asc").Find(&sceneItems)
	if err != nil {
		logz.Err("SceneDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	ret := make(map[uint64]*models.SceneItem)
	for _, item := range sceneItems {
		ret[item.Id] = item
	}
	return ret, nil
}

func (b businessManageRepo) EditBusinessKnowledge(ctx context.Context, req *pb.EditBusinessKnowledgeRequest) error {
	var knowledgeItemsExists []*models.KnowledgeItem
	err := b.s(ctx).Table(cons.TableKnowledgeItem).Where("knowledge_id=?", req.KnowledgeId).Find(&knowledgeItemsExists)
	if err != nil {
		logz.Err("EditBusinessKnowledge db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	knowledgeItemsExistsMap := make(map[uint64]*models.KnowledgeItem, 0)
	for _, item := range knowledgeItemsExists {
		knowledgeItemsExistsMap[item.SceneItemId] = item
	}
	session := b.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	if err != nil {
		return err
	}
	for _, item := range req.KnowledgeItem {
		itemexists, ok := knowledgeItemsExistsMap[item.SceneItemId]
		if ok {
			itemexists.SceneItemValue = strings.Join(item.SceneItemValue, ",")
			itemexists.SelectDictTreeIDs = item.SceneItemSelectDictTreeIds
			//itemexists.SelectDictLeafIDs = Uint64SliceToCommaSeparatedString(item.SceneItemSelectDictLeafIds)
			_, err := session.Table(cons.TableKnowledgeItem).Where("id=?", itemexists.Id).Update(itemexists)
			if err != nil {
				tx.RollbackTrans()
				logz.Err("update knowledge item error", err)
			}
		} else {
			one := models.KnowledgeItem{
				Id:                0,
				KnowledgeId:       req.KnowledgeId,
				SceneItemId:       item.SceneItemId,
				SceneItemValue:    strings.Join(item.SceneItemValue, ","),
				SelectDictTreeIDs: item.SceneItemSelectDictTreeIds,
				//SelectDictLeafIDs: Uint64SliceToCommaSeparatedString(item.SceneItemSelectDictLeafIds),
			}
			_, err = session.Insert(&one)
			if err != nil {
				tx.RollbackTrans()
				logz.Err("insert knowledge item error", err)
			}
		}
	}
	session.Commit()
	return nil
}

func (b businessManageRepo) DeleteBusinessKnowledge(ctx context.Context, KnowledgeId uint64) error {
	session := b.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	if err != nil {
		return err
	}
	var deleteKnowledge models.Knowledge
	_, err = session.Table(cons.TableKnowledge).Where("id=?", KnowledgeId).Get(&deleteKnowledge)
	if err != nil {
		return errno.ErrorDbError("网络问题，请再次重试")
	}

	_, err = session.Table(cons.TableKnowledge).Where("id=?", KnowledgeId).Delete(&models.Knowledge{})
	if err != nil {
		return errno.ErrorDbError("网络问题，请再次重试")
	}

	_, err = session.Table(cons.TableKnowledgeItem).Where("knowledge_id=?", KnowledgeId).Delete(&models.KnowledgeItem{})
	if err != nil {
		tx.RollbackTrans()
		return errno.ErrorDbError("网络问题，请再次重试")
	}

	total, err := session.Table(cons.TableKnowledge).Where("scene_template_id=?", deleteKnowledge.SceneTemplateId).Count(&models.Knowledge{})
	if err == nil && total == 0 {
		// 修改场景状态为未使用
		one := models.SceneTemplate{
			Id:     deleteKnowledge.SceneTemplateId,
			IsUsed: false,
		}
		_, err = session.Table(cons.TableSceneTemplate).Where("id=?", deleteKnowledge.SceneTemplateId).MustCols("is_used").Update(&one)
		if err != nil {
			tx.RollbackTrans()
			logz.Err("DeleteBusinessKnowledge db error", err)
			return errno.ErrorDbError("网络问题，请再次重试")
		}
	}
	session.Commit()
	return nil
}

func (b businessManageRepo) BusinessKnowledgeSetting(ctx context.Context, req *pb.BusinessKnowledgeSettingRequest) error {
	var one models.Knowledge
	_, err := b.s(ctx).Table(cons.TableKnowledge).Where("id=?", req.KnowledgeId).Get(&one)
	if err != nil {
		logz.Err("BusinessKnowledgeSetting error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	one.CreateAt = time.Unix(req.CreateTime, 0)
	one.ViewAt = time.Unix(req.ViewAt, 0)
	one.CreatorId = req.CreatorId
	one.CreatorName = req.CreatorName
	totalViewTime := int32(one.ViewTime) + req.ViewTime
	if totalViewTime < 0 {
		totalViewTime = 0
	}
	one.ViewTime = uint32(totalViewTime)
	_, err = b.s(ctx).Table(cons.TableKnowledge).Where("id=?", req.KnowledgeId).MustCols("view_time").Update(&one)
	if err != nil {
		logz.Err("BusinessKnowledgeSetting error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (b businessManageRepo) BusinessKnowledgeList(ctx context.Context, req *pb.BusinessKnowledgeListRequest) (*pb.BusinessKnowledgeListReply, error) {
	var knowledgeList []*models.KnowledgeList
	m := helper.S2M(req)
	if req.SearchUpdateTime != nil {
		m["SearchUpdateTimeBegin"] = req.SearchUpdateTime[0]
		m["SearchUpdateTimeEnd"] = req.SearchUpdateTime[1]
	}
	if req.SearchCreateTime != nil {
		m["SearchCreateTimeBegin"] = req.SearchCreateTime[0]
		m["SearchCreateTimeEnd"] = req.SearchCreateTime[1]
	}
	//	AND EXISTS (
	//		SELECT 1
	//	FROM knowledge_item ki_sub
	//	WHERE ki_sub.knowledge_id = k.id
	//	AND (
	//		(ki_sub.scene_item_id = 1 AND ki_sub.select_dict_tree_ids REGEXP '1')
	//	OR (ki_sub.scene_item_id = 2 AND ki_sub.select_dict_tree_ids REGEXP '8')
	//	OR (ki_sub.scene_item_id = 3 AND ki_sub.select_dict_tree_ids REGEXP '13')
	//)
	//)

	//(ki.scene_item_id = 1 AND ki.select_dict_tree_ids REGEXP '1')
	//OR (ki.scene_item_id = 2 AND ki.select_dict_tree_ids REGEXP '8')
	//OR (ki.scene_item_id = 3 AND ki.select_dict_tree_ids REGEXP '13')

	sql := ""
	for index, item := range req.SearchKnowledgeItem {
		if item.SceneItemValue == nil && item.SceneItemSelectDictIds == "" {
			continue
		}

		sql += fmt.Sprintf("( ki.select_dict_tree_ids <> '' AND ki.scene_item_id = %d ", item.SceneItemId)

		result := strings.Join(item.SceneItemValue, "|")

		if result != "" {
			sql += fmt.Sprintf(" and ki.scene_item_value REGEXP '%s'", result)
		}

		// SceneItemSelectDictIds
		if item.SceneItemSelectDictIds != "" {
			//sql += "and (ki.select_dict_tree_ids REGEXP '" + item.SceneItemSelectDictIds + "')"
			sql += fmt.Sprintf(" and JSON_CONTAINS(CAST(ki.select_dict_tree_ids AS JSON), '\"%s\"')", item.SceneItemSelectDictIds)
		}

		if index < len(req.SearchKnowledgeItem)-1 {
			sql += " )or "
		} else {
			sql += ")"
		}

	}

	if sql != "" {
		m["sql"] = sql
	}

	var counts int64
	if err := b.SqlTplGet(ctx, "business_template_count.stpl", &m, &counts); err != nil {
		logz.Err(" BusinessKnowledgeList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if err := b.SqlTplFind(ctx, "business_template_list.stpl", &m, &knowledgeList); err != nil {
		logz.Err(" BusinessKnowledgeList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	var sceneItemAll []*models.SceneItem
	err := b.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=?", req.SceneTemplateId).OrderBy("sort_number").Find(&sceneItemAll)
	if err != nil {
		logz.Err("BusinessKnowledgeDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	ret := &pb.BusinessKnowledgeListReply{
		Content:       nil,
		TotalElements: int32(counts),
	}
	for _, knowledgeItem := range knowledgeList {
		content := &pb.BusinessKnowledgeDetailReply{
			KnowledgeShow: nil,
			KnowledgeId:   knowledgeItem.KnowledgeID,
			CreatorName:   knowledgeItem.CreatorName,
			ViewTime:      knowledgeItem.ViewTime,
			UpdateTime:    knowledgeItem.UpdateAt.Unix(),
			CreateTime:    knowledgeItem.CreateAt.Unix(),
		}

		for _, sceneItem := range sceneItemAll {
			if sceneItem.IsHide {
				continue
			}
			knowledgeItemValue, ok := knowledgeItem.SceneItemMap[sceneItem.Id]
			var SceneItemSelectDictTreeIds string
			var SceneItemValue []string
			if ok {
				SceneItemSelectDictTreeIds = knowledgeItemValue.SelectDictTreeIDs
				SceneItemValue = strings.Split(knowledgeItemValue.SceneItemValue, ",")
				if sceneItem.Type == "text" {
					SceneItemValue = []string{knowledgeItemValue.SceneItemValue}
				}
				if knowledgeItemValue.SceneItemValue == "" {
					SceneItemValue = nil
				}
			}

			content.KnowledgeShow = append(content.KnowledgeShow, &pb.BusinessKnowledgeDetailReply_Knowledge{
				SceneItemId:                sceneItem.Id,
				SceneItemType:              sceneItem.Type,
				SceneItemName:              sceneItem.Name,
				SceneItemValue:             SceneItemValue,             // sql查询的
				SceneItemSelectDictTreeIds: SceneItemSelectDictTreeIds, // sql查询的
			})
		}
		ret.Content = append(ret.Content, content)
	}

	return ret, nil

}

func getCurrentMonthRange() (string, string) {
	// 获取当前时间
	now := time.Now()

	// 获取当月的第一天 00:00:00
	firstDay := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())

	// 获取当月的最后一天 23:59:59
	lastDay := firstDay.AddDate(0, 1, -1).Add(time.Hour*23 + time.Minute*59 + time.Second*59)

	// 格式化为字符串
	startTime := firstDay.Format("2006-01-02 15:04:05")
	endTime := lastDay.Format("2006-01-02 15:04:05")

	return startTime, endTime
}

func (b businessManageRepo) BusinessKnowledgeDataNumStatistics(ctx context.Context, req *pb.BusinessKnowledgeDataNumStatisticsRequest) ([]*models.StatisticsKnowledgeNum, error) {
	var KnowledgeNumList []*models.StatisticsKnowledgeNum
	m := make(map[string]interface{})
	if req.SearchCreateTime != nil {
		m["SearchCreateTimeBegin"] = req.SearchCreateTime[0]
		m["SearchCreateTimeEnd"] = req.SearchCreateTime[1]
	} else {
		SearchCreateTimeBegin, SearchCreateTimeEnd := getCurrentMonthRange()
		m["SearchCreateTimeBegin"] = SearchCreateTimeBegin
		m["SearchCreateTimeEnd"] = SearchCreateTimeEnd
	}
	if err := b.SqlTplFind(ctx, "business_statistics_knowledge_num.stpl", &m, &KnowledgeNumList); err != nil {
		logz.Err(" BusinessKnowledgeDataNumStatistics db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	return KnowledgeNumList, nil
}

func (b businessManageRepo) BusinessKnowledgeDataStatisticsBySceneAndCreator(ctx context.Context, req *pb.BusinessKnowledgeDataStatisticsBySceneAndCreatorRequest) ([]*models.StatisticsKnowledgeByCreator, error) {
	var KnowledgeList []*models.StatisticsKnowledgeByCreator
	m := make(map[string]interface{})
	m["SceneTemplateId"] = req.SceneTemplateId
	if req.SearchCreateTime != nil {
		m["SearchCreateTimeBegin"] = req.SearchCreateTime[0]
		m["SearchCreateTimeEnd"] = req.SearchCreateTime[1]
	} else {
		SearchCreateTimeBegin, SearchCreateTimeEnd := getCurrentMonthRange()
		m["SearchCreateTimeBegin"] = SearchCreateTimeBegin
		m["SearchCreateTimeEnd"] = SearchCreateTimeEnd
	}
	if err := b.SqlTplFind(ctx, "business_statistics_knowledge_by_creator.stpl", &m, &KnowledgeList); err != nil {
		logz.Err(" BusinessKnowledgeDataStatisticsBySceneAndCreator db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	return KnowledgeList, nil
}
