import _ from 'lodash';
import { SceneType } from '@/constants/type';

// 将 tree id 拼接上 目录id
export const formatTreeidAndDictId = (tree: any, dictId: number, sceneItemid: number) => {
    return tree.map(item => {
        const nowItem = {
            ...item,
            localId: `${sceneItemid}-${dictId}-${item.id}`,
        };
        if (item.children && item.children.length) {
            nowItem.children = formatTreeidAndDictId(nowItem.children, dictId, sceneItemid);
        }
        return nowItem;
    })
}
// 将plane id 拼接上 目录id
export const formatPlaneidAndDictId = (plane: any, dictId: number, sceneItemid: number) => {
    return plane.map(item => {
        return {
            ...item,
            localId: `${sceneItemid}-${dictId}-${item.id}`,
        }
    })
}

// 根据目录id查找目录详情
export const getDictDetail = (dictDetails: any, dictId: number, sceneItemid: number, sceneItemName: string) => {
    const data = dictDetails.find((item: any) => item.dictTemplate.dictTemplateId === dictId);

    if (data) {
        const { dictTemplate, treeDict, planeDict } = data;
        if (dictTemplate.dictType === 'tree' && treeDict?.treeDict?.length) {
            return {
                localId: sceneItemid,
                id: dictTemplate.dictTemplateId,
                sceneItemid,
                name: sceneItemName,
                dictName: dictTemplate.dictName,
                children: formatTreeidAndDictId(treeDict.treeDict, dictTemplate.dictTemplateId, sceneItemid),
                type: dictTemplate.dictType,
                dictDisabled: dictTemplate.dictDisabled,
                disabled: true,
            };
        } else if (dictTemplate.dictType === 'plane' && planeDict?.planeDict?.length) {
            return {
                localId: sceneItemid,
                id: dictTemplate.dictTemplateId,
                sceneItemid,
                name: sceneItemName,
                dictName: dictTemplate.dictName,
                children: formatPlaneidAndDictId(planeDict.planeDict || [], dictTemplate.dictTemplateId, sceneItemid),
                type: dictTemplate.dictType,
                dictDisabled: dictTemplate.dictDisabled,
                disabled: true,
            };
        }
        return null
    }
    return null;
}

// 过滤掉平面目录中被禁用的数据
export const filterPlaneDict = (dictDetails: any) => {
    if (!dictDetails || !dictDetails.length) {
        return [];
    }
    return dictDetails.filter((item: any) => !item.isDisabled);
}

// 过滤掉树形目录中被禁用的数据
export const filterTreeDict = (dictDetails: any) => {
    if (!dictDetails || !dictDetails.length) {
        return [];
    }

    function getTreeDict(nodes: any) {
        return nodes.map(dict => {
            if (dict.isDisabled) {
                return null;
            }
            if (dict.children && dict.children.length) {
                const children = getTreeDict(dict.children);
                if (children) {
                    return {
                        ...dict,
                        children,
                    }
                }
                return null
            }
            return dict
        }).filter(Boolean)
    }
    return getTreeDict(dictDetails);
}

// 格式化business detail 数据
export const formatBusinessDetail = (data: any) => {
    const { dictDetails, sceneDetail: { sceneItem, sceneTemplateDetail } } = data;
    const tree: any = [];
    const newSceneItem: any = [];
    sceneItem.forEach(item => {
        if (item.type === SceneType.dict) {
            const dictDetail = getDictDetail(dictDetails, item.dictTemplateId, item.id, item.sceneItemName);
            
            if (item.isSupportSearch && dictDetail) {
                tree.push(dictDetail);
            }
            newSceneItem.push({
                ...item,
                dict: dictDetail?.type === 'tree' ? filterTreeDict(dictDetail?.children) : filterPlaneDict(dictDetail?.children),
                dictType: dictDetail?.type,
            });
        } else {
            newSceneItem.push(item);
        }
    })
    return {
        sceneTemplateDetail,
        sceneItem: newSceneItem,
        tree,
    }
}

// 格式化business检索的表格数据
export const formatBusinessSearchData = (data) => {

    const result: any = [];
    data.forEach(item => {
        const { createTime, updateTime, viewTime, creatorName, knowledgeId, knowledgeShow } = item;
        const nowItem: any = {
            knowledgeId,
            createTime,
            updateTime,
            creatorName,
            viewTime,
        }
        knowledgeShow.forEach(k => {
            nowItem[k.sceneItemId] = k;
        })
        result.push(nowItem)
    })
    return result;
}

// tree oncheck 时只保留叶子结点id, 并对叶子结点id进行分组
export const filterLeafNode = (checkedNodes: any) => {
    if (!checkedNodes || !checkedNodes.length) {
        return [];
    }
    let result: string[] = [];
    checkedNodes.forEach(item => {
        if (!(item.children && item.children.length)) {
            result.push(item.localId);
        }
    })

    const map: Record<string, string[]> = {};
    result?.forEach((item: string) => {
        const [dictId, id] = item.split('-');
        if (map[dictId]) {
            map[dictId].push(id);
        } else {
            map[dictId] = [id];
        }
    })

    return map;
}


export const findDictTreeById = (data: any, id: number) => {
    for (let node of data) {
        if (node.id === id) {
            return node;
        }
        // 否则，递归查找子节点
        if (node.children && node.children.length > 0) {
            const result = findDictTreeById(node.children, id);
            if (result) {
                return result; // 找到则返回
            }
        }
    }
    return null; // 如果没有找到，返回 null
};

// 查找知识详情中给定id的字典名称
export const findDictNameInBusiness = (data: any, ids: any, type: string) => {
    if (type === 'plane') {
        return ids.map(id => {
            const deal = data.find(d => d.id === id);
            return deal?.name || null
        }).filter(Boolean);
    }
    if (type === 'tree') {
        return ids.map(id => {
            let str: string[] = [];
            id.forEach(nd => {
                const deal = findDictTreeById(data, nd);
                if (deal) {
                    str.push(deal.name)
                }
            })
            return str.join('/');
        }).filter(Boolean)
    }
    return ''
}

// 根据id查找plane字典数据
export const findPlaneDictById = (data: any, ids: number[]) => {
    return ids.map(id => {
        if (Array.isArray(id)) {
            return data.find(d => d.id === id[0])?.name || null
        }
        return data.find(d => d.id === id)?.name || null
    }).filter(Boolean);
}

// 根据id查找tree字典数据
const findTreeDictNameByNodeIds = (tree: any, ids: string[]) => {
    const names: string[] = []
    const findName = (treeNode: any, nowIds: string[]) => {
        const node = treeNode.find(node => node.id === nowIds[0]);
        names.push(node.name);
        if (node.children && node.children.length) {
            nowIds.shift();
            findName(node.children, nowIds)
        }
    }

    findName(tree, ids)
    return names.join('/')
}

export const findTreeDictById = (data: any, ids: any) => {
    if(!ids || !ids.length) {
        return ''
    }   
    const isDeep = arr => arr.some(item => item instanceof Array);
    
    if (isDeep(ids)) {
        return ids.map(id => {
            return findTreeDictNameByNodeIds(data, id);
        });
    }
    return findTreeDictNameByNodeIds(data, ids);
}

// 获取树的所有节点id
export const getTreeAllNodeKey = (treeData: any, ids: string[] = []) => {
    treeData.forEach(item => {
        ids.push(item.localId);
        if (item.children && item.children.length) {
            getTreeAllNodeKey(item.children, ids);
        }
    })
    return ids;
}

// 获取树的所有叶子结点
export const getTreeAllLeafNodeKey = (treeData: any, ids: string[] = []) => {
    treeData.forEach(item => {
        if (!item.children || !item.children.length) {
            const [_, id] = item.localId.split('-');
            ids.push(id);
        } else {
            getTreeAllLeafNodeKey(item.children, ids);
        }
    })
    return ids;
}

// 获取目录的所有叶子结点
export const getPlaneAllLeafNodeKey = (treeData: any) => {
    const ids: Record<string, string[]> = {};
    treeData.forEach(item => {
        ids[item.localId] = getTreeAllLeafNodeKey(item.children, []);
    })
    return ids;
}



// 根据文件路径获取文件名称
export const getFilenameByPath = (path: string = '') => {
    const parts = path.split('/');
    return parts[parts.length - 1];
}