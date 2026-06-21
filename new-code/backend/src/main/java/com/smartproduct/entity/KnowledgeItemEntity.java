package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("knowledge_item")
public class KnowledgeItemEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    @TableField("knowledge_id")
    public Long knowledgeId;
    @TableField("scene_item_id")
    public Long sceneItemId;
    @TableField("scene_item_value")
    public String sceneItemValue;
    @TableField("select_dict_tree_ids")
    public String selectDictTreeIds;
}
