package data

import (
	"context"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/scenemanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"

	v1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/scenemanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/log"
	"go.uber.org/zap"
	"time"
)

var _ biz.SceneMangeRepo = &sceneManageRepo{}

type sceneManageRepo struct {
	*BaseRepo
	data *Data
	log  *log.Helper
}

// NewSceneMangeRepo .
func NewSceneMangeRepo(data *Data, logger log.Logger) biz.SceneMangeRepo {
	return &sceneManageRepo{
		BaseRepo: NewBaseRepo(data),
		data:     data,
		log:      log.NewHelper(logger),
	}
}

func (s sceneManageRepo) CreateScene(ctx context.Context, req *v1.CreateSceneRequest, header *dto.Header) (uint64, error) {
	session := s.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	one := models.SceneTemplate{
		Id:          0,
		Name:        req.SceneName,
		IsBuiltin:   false,
		IsDisabled:  false,
		IsUsed:      false,
		CreateAt:    time.Time{},
		UpdateAt:    time.Time{},
		CreatorId:   header.CreatorId,
		CreatorName: header.CreatorName,
		Del:         0,
	}
	affected, err := session.Insert(&one)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("CreateScene db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}
	logz.Info("insert into SceneTemplate", zap.Any("affected", affected))

	for _, item := range req.SceneItem {
		sceneItem := models.SceneItem{
			Id:              0,
			Name:            item.SceneItemName,
			SortNumber:      item.SortNumber,
			Type:            item.Type,
			DictTemplateId:  item.DictTemplateId,
			SceneTemplateId: one.Id,
			Del:             0,
			MultiValue:      item.MultiValue,
			IsHide:          item.IsHide,
			IsRequired:      item.IsRequired,
			IsSupportSearch: item.IsSupportSearch,
		}
		_, err = session.Insert(&sceneItem)
		if err != nil {
			tx.RollbackTrans()
			logz.Err("CreateScene db error", err)
			return 0, errno.ErrorDbError("网络问题，请再次重试")
		}
	}
	session.Commit()
	return one.Id, nil
}

func (s sceneManageRepo) EditSceneDisabled(ctx context.Context, sceneData *pb.EditSceneDisabledRequest) error {
	one := models.SceneTemplate{
		IsDisabled: sceneData.IsDisabled,
	}
	// 启用和停用
	_, err := s.s(ctx).Table(cons.TableSceneTemplate).Where("id=?", sceneData.SceneTemplateId).MustCols("is_disabled").Update(&one)
	if err != nil {
		logz.Err("EditSceneDisabled db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (s sceneManageRepo) ExistsNameExcludeCurrentSceneName(ctx context.Context, sceneTemplateId uint64, SceneName string) (bool, error) {
	// 同一模型集下的version名字不能重复
	one := models.SceneTemplate{
		Name: SceneName,
	}
	has, err := s.s(ctx).Table(cons.TableSceneTemplate).Where("id!=? and del=0", sceneTemplateId).Exist(&one)
	if err != nil {
		logz.Err("ExistsNameExcludeCurrentSceneName db error", err)
		return false, errno.ErrorDbError("网络问题，请再次重试")
	}
	return has, nil
}

func (s sceneManageRepo) EditScene(ctx context.Context, reqData *v1.EditSceneRequest, header *dto.Header) error {
	session := s.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	if err != nil {
		return err
	}
	has, err := s.ExistsNameExcludeCurrentSceneName(ctx, reqData.SceneTemplateId, reqData.SceneName)
	if err != nil {
		return err
	}
	if has == true {
		return errno.ErrorSceneParamError("场景名字不能重复")
	}
	sceneTemplate := models.SceneTemplate{
		Name:        reqData.SceneName,
		CreatorId:   header.CreatorId,
		CreatorName: header.CreatorName,
		Del:         0,
	}
	affected, err := session.Table(cons.TableSceneTemplate).Where("id=?", reqData.SceneTemplateId).Update(&sceneTemplate)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("EditScene db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	logz.Info("insert into EditScene", zap.Any("affected", affected))

	//先删除原来的
	//_, err = session.Table(cons.TableSceneItem).Where("scene_template_id=?", reqData.SceneTemplateId).Delete(&models.SceneItem{})
	//if err != nil {
	//	tx.RollbackTrans()
	//	logz.Err("EditScene db error", err)
	//	return errno.ErrorDbError("网络问题，请再次重试")
	//}

	// 添加全量
	for _, item := range reqData.SceneItem {
		one := models.SceneItem{
			Id:              item.Id,
			SortNumber:      item.SortNumber,
			Type:            item.Type,
			DictTemplateId:  item.DictTemplateId,
			SceneTemplateId: reqData.SceneTemplateId,
			Name:            item.SceneItemName,
			Del:             0,
			MultiValue:      item.MultiValue,
			IsHide:          item.IsHide,
			IsRequired:      item.IsRequired,
			IsSupportSearch: item.IsSupportSearch,
		}
		if item.Id == 0 {
			_, err = session.Table(cons.TableSceneItem).Insert(&one)
		} else {
			_, err = session.Table(cons.TableSceneItem).Where("id=?", item.Id).Update(&one)
		}
		if err != nil {
			tx.RollbackTrans()
			logz.Err("insert SceneItem db error", err)
			return errno.ErrorDbError("网络问题，请再次重试")
		}
	}

	session.Commit()
	return err
}

func (s sceneManageRepo) SceneDetail(ctx context.Context, SceneTemplateId uint64) (*v1.SceneDetailReplay, error) {
	sceneTemplate := models.SceneTemplate{
		Id: SceneTemplateId,
	}
	has, err := s.s(ctx).Table(cons.TableSceneTemplate).Where("id=? and del=0", SceneTemplateId).Get(&sceneTemplate)
	if err != nil {
		logz.Err("SceneDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if has == false {
		return nil, errno.ErrorDbError("场景模版不存在")
	}

	var sceneItems []*models.SceneItem
	err = s.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=? and del=0", SceneTemplateId).OrderBy("sort_number asc").Find(&sceneItems)
	if err != nil {
		logz.Err("SceneDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	ret := &v1.SceneDetailReplay{
		SceneItem: nil,
		SceneTemplateDetail: &v1.SceneTemplate{
			SceneTemplateId: sceneTemplate.Id,
			SceneName:       sceneTemplate.Name,
			SceneIsDisabled: sceneTemplate.IsDisabled,
			SceneIsUsed:     sceneTemplate.IsUsed,
			CreatorName:     sceneTemplate.CreatorName,
			UpdateTime:      sceneTemplate.UpdateAt.Unix(),
		},
	}
	for _, item := range sceneItems {
		DictTemplateName := ""
		if item.Type == "dict" {
			dictTemplate := models.DictTemplate{
				Id: item.DictTemplateId,
			}
			has, err := s.s(ctx).Table(cons.TableDictTemplate).Where("id=? and del=0", item.DictTemplateId).Get(&dictTemplate)
			if err != nil {
				logz.Err("SceneDetail db error", err)
				//return nil, errno.ErrorDbError("网络问题，请再次重试")
			}

			if has == false {
				logz.Error("dict not exists!", zap.Uint64p("id", &item.DictTemplateId))

				//return nil, errno.ErrorDbError("字典模版不存在")
			}
			DictTemplateName = dictTemplate.Name

		}
		ret.SceneItem = append(ret.SceneItem, &pb.SceneDetailReplay_SceneItem{
			Id:               item.Id,
			Type:             item.Type,
			SceneItemName:    item.Name,
			DictTemplateId:   item.DictTemplateId,
			DictTemplateName: DictTemplateName,
			MultiValue:       item.MultiValue,
			IsHide:           item.IsHide,
			IsRequired:       item.IsRequired,
			IsSupportSearch:  item.IsSupportSearch,
			SortNumber:       item.SortNumber,
		})
	}
	return ret, nil
}

func (s sceneManageRepo) SceneTemplateList(ctx context.Context, data *pb.SceneTemplateListRequest) (*pb.SceneTemplateListReply, error) {
	var sceneTemplateItems []*models.DictTemplate
	m := helper.S2M(*data)
	var counts int64
	if err := s.SqlTplGet(ctx, "scene_template_count.stpl", &m, &counts); err != nil {
		logz.Err(" SceneTemplateList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if err := s.SqlTplFind(ctx, "scene_template_list.stpl", &m, &sceneTemplateItems); err != nil {
		logz.Err(" SceneTemplateList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	ret := &pb.SceneTemplateListReply{
		TotalElements: int32(counts),
	}

	for _, item := range sceneTemplateItems {
		ret.Content = append(ret.Content, &pb.SceneTemplate{
			SceneTemplateId: item.Id,
			SceneName:       item.Name,
			SceneIsDisabled: item.IsDisabled,
			SceneIsUsed:     item.IsUsed,
			CreatorName:     item.CreatorName,
			UpdateTime:      item.UpdateAt.Unix(),
		})
	}

	return ret, nil
}

func (s sceneManageRepo) DeleteSceneItem(ctx context.Context, req *pb.DeleteSceneItemRequest) error {
	_, err := s.s(ctx).Table(cons.TableSceneItem).Where("id=? and del=0", req.SceneItemId).Delete(&models.SceneItem{})
	if err != nil {
		logz.Err("DeleteSceneItem db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (s sceneManageRepo) CopyScene(ctx context.Context, req *v1.CopySceneRequest) (*v1.CopySceneReply, error) {
	reply := v1.CopySceneReply{SceneTemplateId: 0}
	sceneTemplate := models.SceneTemplate{}
	has, err := s.s(ctx).Table(cons.TableSceneTemplate).Where("id=? and del=0", req.SceneTemplateId).Get(&sceneTemplate)
	if err != nil {
		logz.Err("CopyScene db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if has == false {
		return nil, errno.ErrorDbError("源场景模版不存在")
	}
	session := s.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	sceneTemplate.IsBuiltin = false
	sceneTemplate.CopyFromId = sceneTemplate.Id
	sceneTemplate.Id = 0
	sceneTemplate.Name = req.SceneName
	_, err = session.Insert(&sceneTemplate)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("CopyScene db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	var sceneItems []*models.SceneItem
	err = s.s(ctx).Table(cons.TableSceneItem).Where("scene_template_id=? and del=0", req.SceneTemplateId).Find(&sceneItems)
	if err != nil {
		logz.Err("CopyScene db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	for _, item := range sceneItems {
		item.Id = 0
		item.SceneTemplateId = sceneTemplate.Id
		_, err = session.Insert(item)
		if err != nil {
			tx.RollbackTrans()
			logz.Err("CopyScene db error", err)
			return nil, errno.ErrorDbError("网络问题，请再次重试")
		}
	}
	reply.SceneTemplateId = sceneTemplate.Id
	session.Commit()
	return &reply, nil
}
