
import { request } from '@umijs/max';

// 获取场景列表
export async function getSceneListApi(params: any) {
    return request('/api/v1/data/scene/list', {
        method: 'GET',
        params: {
            ...params,
            searchSceneDisabled: 'all',
        },
    });
}

// 知识及点击量列表
export async function getCountApi(params: any) {
  return request('/api/v1/data/business/statistics/knowledge', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}

export async function getClickApi(params: any) {
  return request('/api/v1/data/dict/list', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}

export async function getHistoryClickApi(params: any) {
  return request('/api/v1/data/dict/list', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}

// 知识创建人列表
export async function getCreatorApi(params: any) {
  return request('/api/v1/data/business/statistics/creator', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}