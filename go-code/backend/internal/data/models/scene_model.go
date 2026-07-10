package models

import "time"

type SceneTemplate struct {
	Id          uint64    `json:"id" xorm:"pk autoincr"`
	CopyFromId  uint64    `json:"copy_from_id" xorm:"copy_from_id default 0 comment('拷贝源')"`
	Name        string    `json:"name" xorm:"name comment('场景模版名称')"`
	IsBuiltin   bool      `json:"is_builtin" xorm:"is_builtin default 0 comment('是否内置场景,0:否 1：内置场景')"`
	IsDisabled  bool      `json:"is_disabled" xorm:"is_disabled default false comment('是否禁用')"`
	IsUsed      bool      `json:"is_used" xorm:"is_used comment('是否使用中，0否，1使用中')"`
	CreateAt    time.Time `json:"create_at" xorm:"created comment('创建时间')"`
	UpdateAt    time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
	CreatorId   uint32    `json:"user_id" xorm:"user_id varchar(100) comment('创建者') index"`
	CreatorName string    `json:"user_name" xorm:"user_name varchar(100) comment('创建者')"`
	Del         uint8     `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
}

type SceneItem struct {
	Id              uint64 `json:"id" xorm:"pk autoincr"`
	Name            string `json:"name" xorm:"name comment('场景条目名称')"`
	SortNumber      uint64 `json:"sort_number" xorm:"sort_number not null index comment('排列顺序，从1开始')"`
	Type            string `json:"type" xorm:"type comment('场景类型，dict:字典类型，text: 文本，integer:整数，decimal:小数，datetime:日期，picture:图片，video:视频，audio:音频，file:文件')"`
	DictTemplateId  uint64 `json:"dict_template_id" xorm:"dict_template_id comment('选择的字典模版id')"`
	SceneTemplateId uint64 `json:"scene_template_id" xorm:"scene_template_id comment('场景模版id')"`
	Del             uint8  `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
	MultiValue      bool   `json:"multi_value" xorm:"multi_value not null default false comment('是否可写多个值，0:否 1:是')"`
	IsHide          bool   `json:"is_hide" xorm:"is_hide not null default false comment('是否隐藏，0:否 1:是')"`
	IsRequired      bool   `json:"is_required" xorm:"is_required not null default false comment('是否必填，0:否 1:是')"`
	IsSupportSearch bool   `json:"is_support_search" xorm:"is_support_search not null default true comment('是否必填，0:否 1:是')"`
}
