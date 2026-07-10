import _ from 'lodash';
import type { DictDetailResult } from './types';

/**
 * 根据id，找到对应的节点
 * params:
 *  - data: 树形结构
 *  - id: 要查找的id
 * 
 * return: 返回找到的节点
 * */
export const findDictTreeById = (data: DictDetailResult[], id: number): DictDetailResult | null => {
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

/**
 * 添加子节点数据
 * @param data 
 * @param id 
 * @param child 子节点数据
 * @returns 新的树结构
 */
export const formatDictaddChild = (data: DictDetailResult[], id: any, child: any) => {
    // 更新节点的递归函数
    const updateNode = (node: any): any => {
        if (node.id === id) {
            node.children = node.children || [];
            node.children.push(child);
            return { ...node };
        }

        if (node.children && node.children.length > 0) {
            const updatedChildren = node.children.map(childNode => updateNode(childNode));
            return node.children !== updatedChildren ? { ...node, children: updatedChildren } : node;
        }

        return node;
    };

    if (Array.isArray(data)) {
        return data.map(rootNode => updateNode(rootNode));
    } else {
        return updateNode(data);
    }
};


// 获取当前节点的所有同级元素的name
export const getAllTreeChildName = (data: DictDetailResult[], parentId: number, id: number) => {
    let result: string[] = [];
    if (!parentId) {
        data.forEach(item => {
            if (item.id !== id) {
                result.push(item.name)
            }
        })
        return result;
    }

    const nowData = findDictTreeById(data, parentId);
    if (nowData && nowData?.children?.length) {
        nowData.children.forEach(item => {
            if (item.id !== id) {
                result.push(item.name)
            }
        })
        return result;
    }
    return []


}

// 根据节点id找到父节点
export const findAncestors = (data: DictDetailResult[], targetId: number): number[] | null => {
    const findNode = (nodes: DictDetailResult[], parentIds: number[] = []): number[] | null => {
        for (const node of nodes) {
            if (node.id === targetId) {
                return [...parentIds, node.id];
            }

            if (node.children && node.children.length > 0) {
                const result = findNode(node.children, [...parentIds, node.id]);
                if (result) {
                    return result;
                }
            }
        }
        return null;
    };

    return findNode(data);
};


/**
 * 根据id找到所有的子节点id
 * params:
 *  - data: 当前id的节点结构
 * 
 * return: ids
*/
export const findChildrenIDs = (data: DictDetailResult): number[] => {
    if (!data.children) {
        return [data.id]
    }
    const result: number[] = [data.id];
    const findChildren = (nodes: DictDetailResult[]) => {
        for (let node of nodes) {
            result.push(node.id)
            if (node.children) {
                findChildren(node.children)
            }
        }
    };
    findChildren(data.children);
    return result
}

/**
 * 删除指定的id及其子节点
 * params: 
 *  - data: 树形结构
 *  - id: 要删除的id
 * 
 * return: 返回删除后的树形结构
 */
export const deleteDictTreeById = (data: DictDetailResult[], id: number): DictDetailResult[] => {
    const delTree = (nodes: DictDetailResult[]) => {
        return nodes.filter((node: DictDetailResult) => {
            if (node.id === id) {
                return false
            }
            if (node.children && node.children.length) {
                node.children = delTree(node.children)
            }
            return true
        })
    }
    return _.cloneDeep(delTree(data));
}

/**
 * 判断直接节点的父级是不是只有单一的子节点，返回所有单一子节点的父元素
 * params:
 *  - data: 树形结构
 *  - id: 当前节点id
 * 
 * return: 当前id以及单一节点的父节点的id
*/
export const findSingleChildParent = (data: DictDetailResult[], id: number): number[] => {
    const ids: number[] = [];

    const getParentids = (pid: number) => {
        const node = findDictTreeById(data, pid);
        if (!node?.children || !node?.children.length) {
            ids.push(node?.id);
            if (node?.localParentId) {
                getParentids(node?.localParentId);
            }
        }
    }
    getParentids(id);
    return ids;
}

/** 
 * 修改指定id的数据
 * params:
 *  - data: 树形结构
 *  - id: 要修改的id
 * 
 * return:  返回修改后的树形结构
*/
export const updateDictTreeById = (data: DictDetailResult[], id: number, updateData: DictDetailResult): DictDetailResult[] => {
    const updateTree = (nodes: DictDetailResult[]) => {
        return nodes?.map((node: DictDetailResult) => {
            if (node.id === id) {
                return { ...node, ...updateData };
            }
            if (node.children && node.children.length) {
                node.children = updateTree(node.children);
            }
            return node;
        });
    };
    return _.cloneDeep(updateTree(data));
}

// 修改指定id及其子节点的数据
export const updateDictTreeAndChildrenById = (data: DictDetailResult[], id: number, updateData: DictDetailResult): DictDetailResult[] => {
    const updateTree = (nodes: DictDetailResult[], isChildren: boolean=false) => {
        return nodes?.map((node: DictDetailResult) => {
            let newData: DictDetailResult = { ...node };
            if(isChildren) {
                newData = { ...node, ...updateData };
                if(newData.children && newData.children.length) {
                    newData.children = updateTree(newData.children, true);
                }
                return newData; 
            }
            if (node.id === id) {
                newData = { ...node, ...updateData };
                if (node.children && node.children.length) {
                    newData.children = updateTree(node.children, true);
                }
                return newData;
            }
            if (node.children && node.children.length) {
                newData.children = updateTree(node.children, false);
            }
            return newData;
        });
    };
    return _.cloneDeep(updateTree(data, false));
}


// 格式化tree数据
export const formatTreeData = (data: DictDetailResult[]) => {
    const initid = Date.now();
    let count = 0
    const format = (nodes: DictDetailResult[]) => {
        return nodes?.map((node: DictDetailResult) => {
            const { children, ...rest } = node;
            const id = Number(`${initid}${count}`);
            count++;
            const item = {
                ...rest,
                level: Number(node.level || 0),
                contentId: node.id,
                localParentId: node.parentId,
                id,
                originName: node.name,
                hasSaved: true,
                type: 'server',
            };

            if (children && children.length) {
                item.children = format(children);
            }
            return item;
        });
    };
    return format(data);
}

// 查看tree中是否有未保存的数据
export const hasUnsavedData = (data: DictDetailResult[]) => {
    const check = (nodes: DictDetailResult[]) => {
        for (let node of nodes) {
            if (!node.hasSaved) {
                return true;
            }
            if (node.children && node.children.length > 0) {
                if (check(node.children)) {
                    return true;
                }
            }
        }
        return false;
    };
    return check(data);
};

// 过滤掉tree中来自于服务器的数据, 用于提交编辑操作
export const filterServerData = (data: DictDetailResult[]): DictDetailResult[] => {
    const filter = (nodes: DictDetailResult[], rt: DictDetailResult[] ) => {
        for(let node of nodes) {
            if(!node?.type) {
                rt.push(node)
            } else {
                if(node.children && node.children.length) {
                    filter(node.children, rt)
                }
            }
        }
    };
    const result: DictDetailResult[] = [];
    filter(data, result)
    return result;
};


// 去掉children为空时的children字段
export const removeEmptyChildren = (data: DictDetailResult[]) => {
    if (!data || !data.length) {
        return data;
    }
    const remove = (nodes: DictDetailResult[]) => {
        return nodes?.map((node: DictDetailResult) => {
            if (!node.children || node.children.length === 0) {
                const { children, ...other } = node;
                return { ...other };
            }
            if (node.children && node.children.length > 0) {
                node.children = remove(node.children);
            }
            return node;
        });
    };
    return remove(data);
};
