package data

import (
	"context"
	errno "gitee.com/kangdan0404/backend-of-knowledge-base/api/err/v1"
	v1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/usermanage/v1"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/cons"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data/models"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/helper"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/login"
	"gitee.com/kangdan0404/backend-of-knowledge-base/pkg/logz"
	"github.com/go-kratos/kratos/v2/log"
	"golang.org/x/crypto/bcrypt"
	"time"
)

var _ biz.UserMangeRepo = &userManageRepo{}

type userManageRepo struct {
	*BaseRepo
	data *Data
	log  *log.Helper
}

func (u userManageRepo) Login(ctx context.Context, req *v1.LoginRequest) (string, error) {
	one := models.User{Account: req.UserAccount}
	has, err := u.s(ctx).Table(cons.TableUser).Where("account=? and del=0 and is_disabled=false", req.UserAccount).Get(&one)
	if err != nil {
		logz.Err("Login db error", err)
		return "", errno.ErrorDbError("用户不存在")
	}
	if has == false {
		return "", errno.ErrorDbError("用户不存在")
	}
	if !checkPassword(req.UserPassword, one.HashPassword) {
		return "", errno.ErrorDbError("密码错误")
	}

	// 解析用户请求（这里省略用户验证）
	// 生成 JWT
	token, err := login.GenerateJWT(one.Id, one.Account)
	if err != nil {
		logz.Err("Login db error", err)
		return "", errno.ErrorDbError("生成token失败")
	}

	// 返回 JWT
	return token, nil

}

func (u userManageRepo) UserList(ctx context.Context, req *v1.UserListRequest) (*v1.UserListReply, error) {

	var users []*models.User
	m := helper.S2M(*req)

	var total int64
	if err := u.SqlTplGet(ctx, "user_count.stpl", &m, &total); err != nil {
		logz.Err(" UserList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if err := u.SqlTplFind(ctx, "user_list.stpl", &m, &users); err != nil {
		logz.Err(" UserList db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	//err = u.s(ctx).Table(cons.TableUser).Where("del=0").Find(&users)
	ret := &v1.UserListReply{
		Content:       nil,
		TotalElements: int32(total),
	}
	for _, item := range users {
		ret.Content = append(ret.Content, &v1.UserListReply_User{
			UserAccount:  item.Account,
			UserNickname: item.NickName,
			UserEmail:    item.Email,
			UserPhoneNum: item.PhoneNum,
			UserSex:      item.Sex,
			UserPicture:  item.PicturePath,
			IsDisabled:   item.IsDisabled,
			UserId:       item.Id,
			IsBuiltin:    item.IsBuiltin,
			UpdateTime:   item.UpdateAt.Unix(),
			CreateTime:   item.CreateAt.Unix(),
		})
	}
	return ret, nil
}

func (u userManageRepo) DeleteUser(ctx context.Context, userid uint32) error {
	_, err := u.s(ctx).Table(cons.TableUser).Where("id=?", userid).Delete(&models.User{})
	if err != nil {
		logz.Err("DeleteUser db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (u userManageRepo) ResetUserPassword(ctx context.Context, userid uint32, password string) error {
	hashPassword, err := hashPassword(password)
	if err != nil {
		return errno.ErrorSystemError("网络问题，请再次重试")
	}
	one := models.User{
		Id:           userid,
		HashPassword: hashPassword,
	}
	// 启用和停用
	_, err = u.s(ctx).Table(cons.TableUser).Where("id=?", userid).Update(&one)
	if err != nil {
		logz.Err("ResetUserPassword db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (u userManageRepo) EditUserDisabled(ctx context.Context, reqData *v1.EditUserDisabledRequest) error {
	one := models.User{
		IsDisabled: reqData.IsDisabled,
	}
	// 启用和停用
	_, err := u.s(ctx).Table(cons.TableUser).Where("id=?", reqData.UserId).MustCols("is_disabled").Update(&one)
	if err != nil {
		logz.Err("EditUserDisabled db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (u userManageRepo) EditUser(ctx context.Context, req *v1.EditUserRequest) error {
	user := models.User{
		Id:          req.UserId,
		NickName:    req.UserNickname,
		Email:       req.UserEmail,
		PhoneNum:    req.UserPhoneNum,
		Sex:         req.UserSex,
		PicturePath: req.UserPicture,
	}
	colName := []string{
		"nickname",
		"email",
		"phone_num",
		"sex",
		"picture",
	}
	_, err := u.s(ctx).Table(cons.TableUser).MustCols(colName...).Where("id=? and del=0", req.UserId).Update(&user)
	if err != nil {
		logz.Err("EditUser db error", err)
		return errno.ErrorDbError("网络问题，请再次重试")
	}
	return nil
}

func (u userManageRepo) UserDetail(ctx context.Context, userId uint32) (*v1.UserDetailReply, error) {
	user := models.User{
		Id: userId,
	}
	has, err := u.s(ctx).Table(cons.TableUser).Where("id=? and del=0", userId).Get(&user)
	if err != nil {
		logz.Err("UserDetail db error", err)
		return nil, errno.ErrorDbError("网络问题，请再次重试")
	}

	if has == false {
		return nil, errno.ErrorDbError("用户不存在")
	}
	ret := v1.UserDetailReply{
		UserAccount:  user.Account,
		UserNickname: user.NickName,
		UserEmail:    user.Email,
		UserPhoneNum: user.PhoneNum,
		UserSex:      user.Sex,
		UserPicture:  user.PicturePath,
		IsDisabled:   user.IsDisabled,
		IsBuiltin:    user.IsBuiltin,
		UpdateTime:   user.UpdateAt.Unix(),
		CreateTime:   user.CreateAt.Unix(),
	}
	return &ret, nil
}

// 哈希密码
func hashPassword(password string) (string, error) {
	// bcrypt.DefaultCost 是加密强度的默认值，可根据需求调整
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// 验证密码
func checkPassword(password, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

func (u userManageRepo) AddUser(ctx context.Context, req *v1.AddUserRequest) (uint32, error) {
	hashPassword, err := hashPassword(req.UserPassword)
	if err != nil {
		return 0, errno.ErrorSystemError("网络问题，请再次重试")
	}
	one := models.User{
		Id:           0,
		Account:      req.UserAccount,
		NickName:     req.UserNickname,
		Email:        req.UserEmail,
		PhoneNum:     req.UserPhoneNum,
		Sex:          req.UserSex,
		HashPassword: hashPassword,
		PicturePath:  req.UserPicture,
		CreateAt:     time.Time{},
		UpdateAt:     time.Time{},
		Del:          0,
	}
	_, err = u.d.x.Insert(&one)
	if err != nil {
		logz.Err("AddUser db error", err)
		return 0, errno.ErrorDbError("网络问题，请再次重试")
	}
	return one.Id, nil
}

// NewUserMangeRepo .
func NewUserMangeRepo(data *Data, logger log.Logger) biz.UserMangeRepo {
	return &userManageRepo{
		BaseRepo: NewBaseRepo(data),
		data:     data,
		log:      log.NewHelper(logger),
	}
}
