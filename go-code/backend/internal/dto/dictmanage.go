package dto

type DictData struct {
	//Id         uint64    `json:"id" xorm:"pk autoincr"`
	//DictName   string    //字典模版名称
	//DictType   string    //字典类型，tree:树形结构， plane：平面结构
	//IsBuiltin  bool      `json:"is_builtin" xorm:"is_builtin comment('是否内置字典')"`
	//IsDisabled bool      `json:"is_disabled" xorm:"is_disabled comment('是否禁用')"`
	//CreateAt   time.Time `json:"create_at" xorm:"created comment('创建时间')"`
	//UpdateAt   time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
	//Del        uint8     `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
	//
	//Id             uint64    `json:"id" xorm:"pk autoincr comment('字典目录id')"`
	//DictTemplateId uint64    `json:"dict_template_id" xorm:"dict_template_id index comment('字典模版ID')"`
	//Name           string    `json:"name" xorm:"name comment('分类标签名称')"`
	//ParentId       uint64    `json:"parent_id" xorm:"parent_id index comment('父级分类标签ID')"`
	//Level          uint64    `json:"level" xorm:"level comment('分类标签级别,根目录为0')" `
	//CreateAt       time.Time `json:"create_at" xorm:"created comment('创建时间')"`
	//UpdateAt       time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
}
