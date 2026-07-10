import { request } from '@umijs/max';
import { BusinessListParams } from '@/pages/Business/types';

import { downloadFn, getFilenameByPath } from '@/utils/download';

// 业务列表数据
export async function getListApi(params: BusinessListParams) {
  return request('/api/v1/data/dict/list', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}



// 具体业务 配置 数据
export async function getBusinessDetailApi(sceneTemplateId: number) {
  return request(`/api/v1/data/business/detail?sceneTemplateId=${sceneTemplateId}`, {
    method: 'GET',
  });
}

// 知识检索
export async function getSearchListApi(params: any) {
  return request('/api/v1/data/business/knowledge/list', {
    method: 'POST',
    data: {
      ...params,
    },
  });
}

// 知识详情
export async function getKnowledgeDetailApi(knowledgeId: number) {
  return request(`/api/v1/data/business/knowledge/detail?knowledgeId=${knowledgeId}`, {
    method: 'GET',
  });
}

// 知识添加
export async function addKnowledgeApi(params: any) {
  return request('/api/v1/data/business/knowledge/add', {
    method: 'POST',
    data: {
      ...params,
    },
  });
}


// 知识编辑
export async function editKnowledgeApi(params: any) {
  return request('/api/v1/data/business/knowledge/edit', {
    method: 'POST',
    data: {
      ...params,
    },
  });
}

// 知识删除
export async function delKnowledgeApi(knowledgeId: number) {
  return request(`/api/v1/data/business/knowledge/delete`, {
    method: 'POST',
    data: {
      knowledgeId,
    }
  });
}


// 知识设置
export async function setKnowledgeSettingApi(params: any) {
  return request('/api/v1/data/business/knowledge/setting', {
    method: 'POST',
    data: {
      ...params,
    },
  });
}


// 导出模版
export async function exportTemplateApi(sceneTemplateId: any) {
  const result = await request(`/api/v1/data/business/knowledge/template/export?sceneTemplateId=${sceneTemplateId}`, {
    method: 'GET',
  });
  if (result && result.filePath) {
    downloadFn(result.filePath, getFilenameByPath(result.filePath))
    return Promise.resolve(result)
  } else {
    return Promise.reject(result)
  }
}

// 导出数据
export async function exportDataApi(sceneTemplateId: any) {
  const result = await request(`/api/v1/data/business/knowledge/data/export?sceneTemplateId=${sceneTemplateId}`, {
    method: 'GET',
  });
  if (result && result.filePath) {
    downloadFn(result.filePath, getFilenameByPath(result.filePath))
    return Promise.resolve(result)
  } else {
    return Promise.reject(result)
  }
}


// 导入数据
export async function importDataApi(params: any) {
  return await request(`/api/v1/data/business/knowledge/data/import`, {
    method: 'POST',
    data: params,
  });
}