import { SceneListParams } from '@/pages/System/Scene/types';
import { DictListParams } from '@/pages/System/Dict/types';

import { request } from '@umijs/max';

// 列表
export async function getSceneListApi(params: SceneListParams) {
    return request('/api/v1/data/scene/list', {
        method: 'GET',
        params: {
            ...params,
            searchSceneDisabled: 'enabled',
        },
    });
}

// 场景列表，启用停用
export async function setActionDisabledApi(params: any) {
    return request('/api/v1/data/scene/edit/status', {
        method: 'POST',
        data: {
            sceneTemplateId: params.id,
            isDisabled: params.isDisabled,
        },
    });
}

// 详情
export async function getSceneDetailApi(id: number) {
    return request(`/api/v1/data/scene/detail?sceneTemplateId=${id}`, {
        method: 'GET',
    });
}

// 场景内容复制
export async function copySceneApi(params: any) {
    return request('/api/v1/data/scene/copy', {
        method: 'POST',
        data: params,
    });
}

// 新增
export async function createSceneApi(params: any) {
    return request('/api/v1/data/scene/create', {
        method: 'POST',
        data: params,
    });
}

// 编辑
export async function editSceneApi(params: any) {
    return request('/api/v1/data/scene/edit', {
        method: 'POST',
        data: params,
    });
}


// 内容删除
export async function submitSceneDelApi(params: any) {
    return request(`/api/v1/data/scene/item/delete?sceneItemId=${params.id}`, {
        method: 'DELETE',
    });
}

// 获取目录列表
export async function getDictListApi(params: DictListParams) {
    return request('/api/v1/data/dict/list', {
        method: 'GET',
        params: {
            ...params,
        },
    });
}
