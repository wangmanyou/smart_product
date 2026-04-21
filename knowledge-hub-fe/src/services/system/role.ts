import { request } from '@umijs/max';

// 列表
export async function getRoleListApi(params: any) {
    return request('/api/v1/data/scene/list', {
        method: 'GET',
        params,
    });
}