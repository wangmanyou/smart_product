import { DictListParams } from '@/pages/System/Dict/types';
import { request } from '@umijs/max';

// 列表
export async function getDictListApi(params: DictListParams) {
  return request('/api/v1/data/dict/list', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}

// 列表目录，启用停用
export async function setActionDisabledApi(params: any) {
  return request('/api/v1/data/dict/edit/status', {
    method: 'POST',
    data: {
      dictTemplateId: Number(params.id || 0),
      isDisabled: params.isDisabled,
    },
  });
}

// 详情
export async function getDictDetailApi(id: number) {
  return request('/api/v1/data/dict/detail', {
    method: 'GET',
    params: {
      dictTemplateId: id,
    },
  });
}

// 新增
export async function createDictApi(params: any) {
  return request('/api/v1/data/dict/create', {
    method: 'POST',
    data: params,
  });
}

// 编辑
export async function editDictApi(params: any) {
  return request('/api/v1/data/dict/edit', {
    method: 'POST',
    data: params,
  });
}

// 目录内容启用停用
export async function submitDictDisabledApi(params: any) {
  return request('/api/v1/data/dict/directory/edit/status', {
    method: 'POST',
    data: {
      // dictTemplateId: params.dictTemplateId,
      dictDirectoryId: Number(params.id),
      isDisabled: params.isDisabled,
    },
  });
}

// 目录内容名称编辑
export async function submitDictNameApi(params: any) {
  return request('/api/v1/data/dict/directory/edit/name', {
    method: 'POST',
    data: {
      dictTemplateId: Number(params.dictTemplateId),
      dictDirectoryId: Number(params.id),
      dictDirectoryName: params.dictName,
    },
  });
}

// 目录内容删除
export async function submitDictDelApi(params: any) {
  return request(`/api/v1/data/dict/directory/delete?dictDirectoryId=${Number(params.id)}`, {
    method: 'DELETE',
    // data: {
    //   dictTemplateId: params.dictTemplateId,
    //   dictDirectoryId: Number(params.id),
    // },
  });
}