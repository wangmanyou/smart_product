package models

import "time"

type User struct {
	Id           uint32    `json:"id" xorm:"pk autoincr"`
	IsDisabled   bool      `json:"is_disabled" xorm:"is_disabled default false comment('是否禁用')"`
	IsBuiltin    bool      `json:"is_builtin" xorm:"is_builtin default 0 comment('是否内置,0:否 1：内置')"`
	Account      string    `json:"account" xorm:"account comment('用户账号，唯一不可修改')"`
	NickName     string    `json:"nickname" xorm:"nickname comment('用户昵称')"`
	Email        string    `json:"email" xorm:"email comment('用户邮箱')"`
	PhoneNum     string    `json:"phone_num" xorm:"phone_num comment('用户手机号码')"`
	Sex          string    `json:"sex" xorm:"sex default '未知' comment('用户性别，只能输入：男，女')"`
	HashPassword string    `json:"password" xorm:"password default '$2a$10$.qIRmuIe9HWt6eVhxM0BEezfSMDGeaDydK669iiXST4i0S/8TZWzy' comment('用户密码')"`
	PicturePath  string    `json:"picture" xorm:"picture comment('用户头像路径')"`
	CreateAt     time.Time `json:"create_at" xorm:"created comment('创建时间')"`
	UpdateAt     time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
	Del          uint8     `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
	RoleId       uint32    `json:"role_id" xorm:"role_id  comment('用户设置的角色id')"`
}
