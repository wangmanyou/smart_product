import { request } from '@umijs/max';

// 列表
export async function getUserListApi(params: any) {
    return request('/api/v1/data/user/list', {
        method: 'GET',
        params: {
            ...params,
        },
    });
}

// 添加
export async function createUserApi(params: any) {
    return request('/api/v1/data/user/add', {
        method: 'POST',
        data: params,
    });
}

// 详情
export async function getUserDetailApi(id: any) {
    return request(`/api/v1/data/user/detail?userId=${id}`, {
        method: 'GET',
    });
}

// 编辑
export async function editUserApi(params: any) {
    console.log(8888, params)
    return request('/api/v1/data/user/edit', {
        method: 'POST',
        data: params,
    });
}

// 删除
export async function deleteUserApi(params: any) {
    return request('/api/v1/data/user/delete', {
        method: 'POST',
        data: params,
    });
}

// 停用
export async function stopApi(params: any) {
    return request('/api/v1/data/user/edit/status', {
        method: 'POST',
        data: {
            ...params,
        },
    })
}

// 启用
export async function startApi(params: any) {
    return request('/api/v1/data/user/edit/status', {
        method: 'POST',
        data: {
            ...params,
        },
    })
}

// 重置密码
export async function resetUserPasswordApi(params: any) {
    return request('/api/v1/data/user/password/reset', {
        method: 'POST',
        data: params,
    });
}

// 配置角色
export async function roleConfigApi(params: any) {
    return request('/api/v1/data/scene/edit', {
        method: 'POST',
        data: params,
    });
}