package data

import (
	"context"
	pb "gitee.com/kangdan0404/backend-of-knowledge-base/api/dictmanage/v1"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/dto"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/log"
	"go.uber.org/zap"
	"time"
)

var _ biz.DictMangeRepo = &dictManageRepo{}

type dictManageRepo struct {
	*BaseRepo
	data *Data
	log  *log.Helper
}

// NewDictMangeRepo .
func NewDictMangeRepo(data *Data, logger log.Logger) biz.DictMangeRepo {
	return &dictManageRepo{
		BaseRepo: NewBaseRepo(data),
		data:     data,
		log:      log.NewHelper(logger),
	}
}

func (d dictManageRepo) CreateDict(ctx context.Context, dictData *pb.CreateDictRequest, header *dto.Header) (uint64, error) {
	session := d.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	dictTemplate := models.DictTemplate{
		Id:          0,
		CreatorId:   header.CreatorId,
		CreatorName: header.CreatorName,
		Name:        dictData.DictName,
		Type:        dictData.DictType,
		IsBuiltin:   false,
		IsDisabled:  false,
		CreateAt:    time.Time{},
		UpdateAt:    time.Time{},
		Del:         0,
	}
	affected, err := session.Insert(&dictTemplate)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("Create DictTemplate db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}
	logz.Info("insert into DictTemplate", zap.Any("affected", affected))

	if dictData.PlaneDict != nil {
		for _, item := range dictData.PlaneDict.PlaneDict {
			dictDirectory := models.DictDirectory{
				Id:             0,
				DictTemplateId: dictTemplate.Id,
				Name:           item.Name,
				IsDisabled:     item.IsDisabled,
				ParentId:       0,
				Level:          0,
				CreateAt:       time.Time{},
				UpdateAt:       time.Time{},
			}
			_, err := session.Insert(&dictDirectory)
			if err != nil {
				tx.RollbackTrans()
				logz.Err("Create dictDirectory db error", err)
				return 0, errno.ErrorDbError("网络问题，请再次重试")
			}
		}
	}

	if dictData.TreeDict != nil {
		// 递归构建树
		var build func([]*pb.CreateTreeDict, uint64, uint64) error
		build = func(TreeDict []*pb.CreateTreeDict, ParentId, level uint64) error {
			for _, item := range TreeDict {
				dictDirectory := models.DictDirectory{
					Id:             0,
					DictTemplateId: dictTemplate.Id,
					Name:           item.Name,
					ParentId:       ParentId,
					Level:          level,
					CreateAt:       time.Time{},
					UpdateAt:       time.Time{},
				}
				_, err = session.Insert(&dictDirectory)
				if err != nil {
					tx.RollbackTrans()
					logz.Err("Create dictDirectory db error", err)
					return errno.ErrorDbError("网络问题，请再次重试")
				}
				if item.Children != nil {
					build(item.Children, dictDirectory.Id, level+1)
				}
			}
			return nil
		}
		err = build(dictData.TreeDict, 0, 0)
	}

	session.Commit()
	return dictTemplate.Id, nil
}

func (d dictManageRepo) EditDict(ctx context.Context, dictData *pb.EditDictRequest) error {
	session := d.s(ctx)
	defer session.Close()
	tx, err := session.BeginTrans()
	dictTemplate := models.DictTemplate{
		Id:         dictData.DictTemplateId,
		Name:       dictData.DictName,
		IsBuiltin:  false,
		IsDisabled: dictData.IsDisabled,
		CreateAt:   time.Time{},
		UpdateAt:   time.Time{},
		Del:        0,
	}
	affected, err := session.Table(cons.TableDictTemplate).Where("id=?", dictData.DictTemplateId).Update(&dictTemplate)
	if err != nil {
		tx.RollbackTrans()
		logz.Err("Create DictTemplate db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	logz.Info("insert into DictTemplate", zap.Any("affected", affected))

	if dictData.PlaneDict != nil {
		//插入新的
		for _, item := range dictData.PlaneDict.PlaneDict {
			dictDirectory := models.DictDirectory{
				Id:             0,
				DictTemplateId: dictTemplate.Id,
				Name:           item.Name,
				IsDisabled:     false,
				ParentId:       0,
				Level:          0,
				CreateAt:       time.Time{},
				UpdateAt:       time.Time{},
			}
			_, err = session.Insert(&dictDirectory)
			if err != nil {
				tx.RollbackTrans()
				logz.Err("Create dictDirectory db error", err)
				return errno.ErrorDbError("网络问题，请再次重试")
			}
		}
	}

	if dictData.TreeDict != nil {

		// 递归构建树
		var build func([]*pb.AddDictItem, uint64) error
		build = func(TreeDict []*pb.AddDictItem, ParentId uint64) error {
			for _, item := range TreeDict {
				itemParentId := ParentId
				if item.ParentId != 0 {
					itemParentId = item.ParentId
				}
				dictDirectory := models.DictDirectory{
					Id:             0,
					DictTemplateId: dictTemplate.Id,
					Name:           item.Name,
					ParentId:       itemParentId,
					Level:          item.Level,
					CreateAt:       time.Time{},
					UpdateAt:       time.Time{},
				}
				_, err = session.Insert(&dictDirectory)
				if err != nil {
					tx.RollbackTrans()
					logz.Err("Create dictDirectory db error", err)
					return errno.ErrorDbError("网络问题，请再次重试")
				}
				if item.Children != nil {
					build(item.Children, dictDirectory.Id)
				}
			}
			return nil
		}
		err = build(dictData.TreeDict, 0)

	}

	session.Commit()
	return err
}

func (d dictManageRepo) DictTemplateList(ctx context.Context, dictData *pb.DictTemplateListRequest) (*pb.DictTemplateListReply, error) {
	var dictTemplateItems []*models.DictTemplate
	m := helper.S2M(*dictData)
	var counts int64
	if err := d.SqlTplGet(ctx, "dict_template_count.stpl", &m, &counts); err != nil {
		logz.Err(" DictTemplateList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if err := d.SqlTplFind(ctx, "dict_template_list.stpl", &m, &dictTemplateItems); err != nil {
		logz.Err(" DictTemplateList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	ret := &pb.DictTemplateListReply{
		TotalElements: int32(counts),
	}

	for _, item := range dictTemplateItems {
		ret.Content = append(ret.Content, &pb.DictTemplate{
			DictTemplateId: item.Id,
			DictName:       item.Name,
			DictType:       item.Type,
			DictDisabled:   item.IsDisabled,
			DictIsUsed:     item.IsUsed,
			UpdateTime:     item.UpdateAt.Unix(),
			CreatorName:    item.CreatorName,
		})
	}

	return ret, nil
}

func (d dictManageRepo) ExistsNameExcludeCurrentDirectoryName(ctx context.Context, dictTemplateId uint64, directoryId uint64, directoryName string) (bool, error) {
	// 同一模型集下的version名字不能重复
	one := models.DictDirectory{
		Name: directoryName,
	}
	has, err := d.s(ctx).Table(cons.TableDictDirectory).Where("dict_template_id=? and del=0", dictTemplateId).And("id!=?", directoryId).Exist(&one)
	if err != nil {
		logz.Err("ExistsNameExcludeCurrentDirectoryName db error", err)
		return false, errno.ErrorDbError("网络问题，请再次重试")
	}
	return has, nil
}

func (d dictManageRepo) EditDictDirectoryName(ctx context.Context, dictData *pb.EditDictDirectoryNameRequest) error {
	one := models.DictDirectory{
		Id:   dictData.DictDirectoryId,
		Name: dictData.DictDirectoryName,
	}
	_, err := d.s(ctx).Table(cons.TableDictDirectory).Where("id=?", dictData.DictDirectoryId).Update(&one)
	if err != nil {
		logz.Err("Create DictTemplate db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (d dictManageRepo) EditDictDirectoryDisabled(ctx context.Context, dictData *pb.EditDictDirectoryDisabledRequest) error {
	one := models.DictDirectory{
		IsDisabled: dictData.IsDisabled,
	}
	//// 级联启用和停用
	//_, err := d.s(ctx).Table(cons.TableDictDirectory).Where("id=? or parent_id=?", dictData.DictDirectoryId, dictData.DictDirectoryId).MustCols("is_disabled").Update(&one)
	//if err != nil {
	//	logz.Err("EditDictDirectoryDisabled db error", err)
	//	return errno.ErrorDbError("网络问题，请再次重试")
	//}
	//return nil

	// Step 1: 获取所有子节点的 ID（包括自己）
	var idsToEdit []uint64
	err := d.FindAllChildren(ctx, dictData.DictDirectoryId, &idsToEdit)
	if err != nil {
		logz.Err("EditDictDirectoryDisabled find children error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}

	// Step 2: 修改所有相关节点状态
	_, err = d.s(ctx).Table(cons.TableDictDirectory).In("id", idsToEdit).MustCols("is_disabled").Update(&one)
	if err != nil {
		logz.Err("EditDictDirectoryDisabled db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (d dictManageRepo) EditDictDisabled(ctx context.Context, dictData *pb.EditDictDisabledRequest) error {
	one := models.DictDirectory{
		IsDisabled: dictData.IsDisabled,
	}
	// 启用和停用
	_, err := d.s(ctx).Table(cons.TableDictTemplate).Where("id=?", dictData.DictTemplateId).MustCols("is_disabled").Update(&one)
	if err != nil {
		logz.Err("EditDictDisabled db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

// FindAllChildren 递归查找所有子节点的 ID
func (d dictManageRepo) FindAllChildren(ctx context.Context, parentId uint64, ids *[]uint64) error {
	*ids = append(*ids, parentId) // 添加当前节点 ID

	var childIds []uint64
	err := d.s(ctx).
		Table(cons.TableDictDirectory).
		Cols("id").
		Where("parent_id = ?", parentId).
		Find(&childIds)
	if err != nil {
		return err
	}

	for _, childId := range childIds {
		if err := d.FindAllChildren(ctx, childId, ids); err != nil {
			return err
		}
	}

	return nil
}

func (d dictManageRepo) DeleteDictDirectory(ctx context.Context, dictData *pb.DeleteDictDirectoryRequest) error {
	// Step 1: 获取所有子节点的 ID（包括自己）
	var idsToDelete []uint64
	err := d.FindAllChildren(ctx, dictData.DictDirectoryId, &idsToDelete)
	if err != nil {
		logz.Err("DeleteDictDirectory find children error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}

	// Step 2: 删除所有相关节点
	_, err = d.s(ctx).Table(cons.TableDictDirectory).In("id", idsToDelete).Delete(&models.DictDirectory{})
	if err != nil {
		logz.Err("DeleteDictDirectory db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

// BuildTree - 递归构建树形结构
func BuildTree(nodes []*models.DictDirectory) []*pb.Dict {
	// 将所有节点按照 ParentId 分组
	nodeMap := make(map[uint64][]*models.DictDirectory)
	for _, node := range nodes {
		nodeMap[node.ParentId] = append(nodeMap[node.ParentId], node)
	}

	// 递归构建树
	var build func(parentId uint64) []*pb.Dict
	build = func(parentId uint64) []*pb.Dict {
		var tree []*pb.Dict
		if children, ok := nodeMap[parentId]; ok {
			for _, child := range children {
				// 构建当前节点的子树
				dict := &pb.Dict{
					Id:         child.Id,
					ParentId:   child.ParentId,
					Name:       child.Name,
					Level:      child.Level,
					IsDisabled: child.IsDisabled,
					IsUsed:     child.IsUsed,
					Children:   build(child.Id), // 递归查找子节点
				}
				tree = append(tree, dict)
			}
		}
		return tree
	}

	// 从根节点开始构建
	return build(0)
}

func (d dictManageRepo) GetDictBaseInfo(ctx context.Context, dictTemplateId uint64) (*models.DictTemplate, error) {
	one := models.DictTemplate{}
	_, err := d.s(ctx).Table(cons.TableDictTemplate).Where("id=?", dictTemplateId).Get(&one)
	if err != nil {
		logz.Err("GetDictBaseInfo db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	return &one, nil
}

func (d dictManageRepo) DictDetail(ctx context.Context, DictTemplateId uint64) (*pb.DictDetailReplay, error) {

	dictTemplate := models.DictTemplate{
		Id: DictTemplateId,
	}
	has, err := d.s(ctx).Table(cons.TableDictTemplate).Where("id=? and del=0", DictTemplateId).Get(&dictTemplate)
	if err != nil {
		logz.Err("DictDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if has == false {
		return nil, errno.ErrorDbError("字典模版不存在")
	}

	var dictDirectors []*models.DictDirectory
	err = d.s(ctx).Table(cons.TableDictDirectory).Where("dict_template_id=? and del=0", DictTemplateId).OrderBy("level asc").Find(&dictDirectors)
	if err != nil {
		logz.Err("DictDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}
	ret := &pb.DictDetailReplay{
		DictTemplate: &pb.DictTemplate{
			DictName:       dictTemplate.Name,
			DictType:       dictTemplate.Type,
			DictDisabled:   dictTemplate.IsDisabled,
			UpdateTime:     dictTemplate.UpdateAt.Unix(),
			CreatorName:    dictTemplate.CreatorName,
			DictTemplateId: dictTemplate.Id,
			DictIsUsed:     dictTemplate.IsUsed,
		},
		TreeDict:  &pb.TreeDict{},
		PlaneDict: &pb.PlaneDict{},
	}
	if dictTemplate.Type == "plane" {
		for _, item := range dictDirectors {
			ret.PlaneDict.PlaneDict = append(ret.PlaneDict.PlaneDict, &pb.PlaneDict_Plane{
				IsDisabled: item.IsDisabled,
				Name:       item.Name,
				Id:         item.Id,
				IsUsed:     item.IsUsed,
			})
		}

	}

	if dictTemplate.Type == "tree" {
		// 构建树形结构
		ret.TreeDict.TreeDict = BuildTree(dictDirectors)
	}

	return ret, nil
}
