package data

import (
	"context"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	v1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/rolemanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/log"
	"time"
)

var _ biz.RoleMangeRepo = &roleManageRepo{}

type roleManageRepo struct {
	*BaseRepo
	data *Data
	log  *log.Helper
}

func (r roleManageRepo) RoleList(ctx context.Context, req *v1.RoleListRequest) (*v1.RoleListReply, error) {

	var users []*models.Role
	m := helper.S2M(*req)

	var total int64
	if err := r.SqlTplGet(ctx, "role_count.stpl", &m, &total); err != nil {
		logz.Err(" RoleList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if err := r.SqlTplFind(ctx, "role_list.stpl", &m, &users); err != nil {
		logz.Err(" RoleList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	ret := &v1.RoleListReply{
		Content:       nil,
		TotalElements: int32(total),
	}
	for _, item := range users {
		ret.Content = append(ret.Content, &v1.RoleListReply_Role{
			RoleName:   item.Name,
			RoleRemark: item.Remark,
			IsUsed:     item.IsUsed,
			IsBuiltin:  item.IsBuiltin,
			IsDisabled: item.IsDisabled,
			RoleId:     item.Id,
			UpdateTime: item.UpdateAt.Unix(),
			CreateTime: item.CreateAt.Unix(),
		})
	}
	return ret, nil
}

func (r roleManageRepo) RoleDetail(ctx context.Context, roleId uint32) (*v1.RoleDetailReply, error) {
	role := models.Role{
		Id: roleId,
	}
	has, err := r.s(ctx).Table(cons.TableRole).Where("id=? and del=0", roleId).Get(&role)
	if err != nil {
		logz.Err("RoleDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if has == false {
		return nil, errno.ErrorDbError("用户不存在")
	}
	ret := v1.RoleDetailReply{
		RoleName:   role.Name,
		RoleRemark: role.Remark,
		IsDisabled: role.IsDisabled,
		IsUsed:     role.IsUsed,
		IsBuiltin:  role.IsBuiltin,
		UpdateTime: role.UpdateAt.Unix(),
		CreateTime: role.CreateAt.Unix(),
	}
	return &ret, nil
}

func (r roleManageRepo) DeleteRole(ctx context.Context, roleid uint32) error {
	_, err := r.s(ctx).Table(cons.TableRole).Where("id=?", roleid).Delete(&models.Role{})
	if err != nil {
		logz.Err("DeleteRole db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}
func (r roleManageRepo) EditRoleDisabled(ctx context.Context, req *v1.EditRoleDisabledRequest) error {
	one := models.Role{
		IsDisabled: req.IsDisabled,
	}
	// 启用和停用
	_, err := r.s(ctx).Table(cons.TableRole).Where("id=?", req.RoleId).MustCols("is_disabled").Update(&one)
	if err != nil {
		logz.Err("EditRoleDisabled db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (r roleManageRepo) EditRole(ctx context.Context, req *v1.EditRoleRequest) error {
	one := models.Role{
		Id:     req.RoleId,
		Name:   req.RoleName,
		Remark: req.RoleRemark,
		Del:    0,
	}
	colName := []string{
		"name",
		"remark",
	}
	_, err := r.s(ctx).Table(cons.TableRole).MustCols(colName...).Where("id=? and del=0", req.RoleId).Update(&one)
	if err != nil {
		logz.Err("EditRole db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (r roleManageRepo) AddRole(ctx context.Context, req *v1.AddRoleRequest) (uint32, error) {
	one := models.Role{
		Id:       0,
		Name:     req.RoleName,
		Remark:   req.RoleRemark,
		CreateAt: time.Time{},
		UpdateAt: time.Time{},
		Del:      0,
	}
	_, err := r.d.x.Insert(&one)
	if err != nil {
		logz.Err("AddRole db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}
	return one.Id, nil
}

// NewRoleMangeRepo .
func NewRoleMangeRepo(data *Data, logger log.Logger) biz.RoleMangeRepo {
	return &roleManageRepo{
		BaseRepo: NewBaseRepo(data),
		data:     data,
		log:      log.NewHelper(logger),
	}
}
