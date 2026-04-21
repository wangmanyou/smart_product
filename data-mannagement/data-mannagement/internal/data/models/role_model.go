package models

import "time"

type Role struct {
	Id          uint32    `json:"id" xorm:"pk autoincr"`
	IsDisabled  bool      `json:"is_disabled" xorm:"is_disabled default false comment('是否禁用')"`
	IsBuiltin   bool      `json:"is_builtin" xorm:"is_builtin default 0 comment('是否内置,0:否 1：内置')"`
	IsUsed      bool      `json:"is_used" xorm:"is_used default false comment('是否使用中，0否，1使用中')"`
	Name        string    `json:"name" xorm:"name  comment('角色名称')"`
	Remark      string    `json:"remark" xorm:"remark  comment('角色备注')"`
	SettingJson string    `json:"setting_json" xorm:"setting_json  comment('角色设置的权限json')"`
	CreateAt    time.Time `json:"create_at" xorm:"created comment('创建时间')"`
	UpdateAt    time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
	Del         uint8     `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
}
