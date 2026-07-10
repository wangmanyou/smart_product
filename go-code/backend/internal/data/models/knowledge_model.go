package models

import "time"

//type Business struct {
//	Id              uint64    `json:"id" xorm:"pk autoincr"`
//	SceneTemplateId uint64    `json:"scene_template_id" xorm:"scene_template_id comment('场景模版id')"`
//	CreateAt        time.Time `json:"create_at" xorm:"created comment('创建时间')"`
//	UpdateAt        time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
//	CreatorId       uint64    `json:"user_id" xorm:"user_id varchar(100) comment('创建者id') index"`
//	CreatorName     string    `json:"user_name" xorm:"user_name varchar(100) comment('创建者')"`
//	Del             uint8     `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
//}

type Knowledge struct {
	Id              uint64    `json:"id" xorm:"pk autoincr"`
	SceneTemplateId uint64    `json:"scene_template_id" xorm:"scene_template_id comment('场景模版id')"`
	ViewTime        uint32    `json:"view_time" xorm:"view_time not null default 0 comment('点击次数')"`
	ViewAt          time.Time `json:"view_at" xorm:"comment('次数记录时间')"`
	CreateAt        time.Time `json:"create_at" xorm:"created comment('创建时间')"`
	UpdateAt        time.Time `json:"update_at" xorm:"updated comment('更新时间')"`
	CreatorId       uint32    `json:"creator_id" xorm:" creator_id varchar(100) comment('创建者id') index"`
	CreatorName     string    `json:"creator_name" xorm:"creator_name varchar(100) comment('创建者')"`
	Del             uint8     `json:"del" xorm:"del not null default 0 comment('软删，0:未删除 1:删除')"`
}

type KnowledgeItem struct {
	Id             uint64 `json:"id" xorm:"pk autoincr"`
	KnowledgeId    uint64 `json:"knowledge_id" xorm:"knowledge_id comment('每一行知识id')"`
	SceneItemId    uint64 `json:"scene_item_id" xorm:"scene_item_id comment('场景子项id')"`
	SceneItemValue string `json:"scene_item_value" xorm:"TEXT scene_item_value comment('添加知识项的值')"`
	//SelectDictLeafIDs string `json:"select_dict_leaf_ids" xorm:"select_dict_leaf_ids comment('选择的字典叶子结点id,多个逗号分隔')"`
	SelectDictTreeIDs string `json:"select_dict_tree_ids" xorm:"select_dict_tree_ids comment('选择的字典全链结点id,是二维数组的字符串[[1,2,3],[4]]')"`
}

//////////////////////////////// 查询使用       //////////////////////////////////////

type SceneItemData struct {
	SceneItemValue    string `json:"scene_item_value"`
	SelectDictTreeIDs string `json:"select_dict_tree_ids"`
}

type KnowledgeList struct {
	KnowledgeID     uint64                    `json:"knowledge_id"`
	SceneTemplateID uint64                    `json:"scene_template_id"`
	ViewTime        uint32                    `json:"view_time"`
	ViewAt          string                    `json:"view_at"`
	CreateAt        time.Time                 `json:"create_at"`
	UpdateAt        time.Time                 `json:"update_at"`
	CreatorID       uint64                    `json:"creator_id"`
	CreatorName     string                    `json:"creator_name"`
	SceneItemMap    map[uint64]*SceneItemData `json:"scene_item_map"`
}

type StatisticsKnowledgeNum struct {
	SceneTemplateId        uint64 `json:"scene_template_id"`
	KnowledgeCount         uint32 `json:"knowledge_count"`
	SceneTemplateName      string `json:"scene_template_name"`
	KnowledgeViewTimeCount uint32 `json:"knowledge_view_time_count"`
}

type StatisticsKnowledgeByCreator struct {
	CreatorName    string `json:"creator_name"`
	KnowledgeCount uint32 `json:"knowledge_count"`
}
