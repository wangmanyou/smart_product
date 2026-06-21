package com.smartproduct.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;

@TableName("scene_item")
public class SceneItemEntity {
    @TableId(type = IdType.AUTO)
    public Long id;
    public String name;
    @TableField("sort_number")
    public Long sortNumber;
    public String type;
    @TableField("dict_template_id")
    public Long dictTemplateId;
    @TableField("scene_template_id")
    public Long sceneTemplateId;
    public Integer del;
    @TableField("multi_value")
    public Boolean multiValue;
    @TableField("is_hide")
    public Boolean isHide;
    @TableField("is_required")
    public Boolean isRequired;
    @TableField("is_support_search")
    public Boolean isSupportSearch;
}
