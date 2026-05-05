import { history } from '@umijs/max';
import { message } from 'antd';

const API_PREFIX = '/api';
const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

function buildUrl(path: string, params?: any) {
  const url = new URL(`${API_PREFIX}${path}`, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return `${url.pathname}${url.search}`;
}

async function apiRequest(path: string, options: RequestInit & { params?: any } = {}) {
  const { params, headers, body, ...rest } = options;
  const token = localStorage.getItem(TOKEN_KEY);
  const finalHeaders: Record<string, string> = {
    ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers as Record<string, string>),
  };
  if (token) finalHeaders.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers: finalHeaders,
    body,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const msg = data?.message || `请求失败：${response.status}`;
    message.error(msg);
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      history.push('/login');
    }
    throw data;
  }

  return data;
}

function post(path: string, data?: any) {
  return apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(data || {}),
  });
}

export const authApi = {
  login: (params: { userAccount: string; userPassword: string }) =>
    apiRequest('/v1/data/user/login', { method: 'GET', params }),
  current: () => apiRequest('/v1/data/user/current/detail', { method: 'GET' }),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  getToken: () => localStorage.getItem(TOKEN_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  setCurrentUser: (user: any) => localStorage.setItem(USER_KEY, JSON.stringify(user || {})),
  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || '{}');
    } catch {
      return {};
    }
  },
};

export const sceneApi = {
  list: (params?: any) =>
    apiRequest('/v1/data/scene/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 100, ...params },
    }),
  detail: (sceneTemplateId: number | string) =>
    apiRequest('/v1/data/scene/detail', {
      method: 'GET',
      params: { sceneTemplateId },
    }),
  editStatus: (data: any) => post('/v1/data/scene/edit/status', data),
  create: (data: any) => post('/v1/data/scene/create', data),
  edit: (data: any) => post('/v1/data/scene/edit', data),
  deleteItem: (sceneItemId: number | string) =>
    apiRequest('/v1/data/scene/item/delete', {
      method: 'DELETE',
      params: { sceneItemId },
    }),
};

export const dictApi = {
  list: (params?: any) =>
    apiRequest('/v1/data/dict/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 100, ...params },
    }),
  detail: (dictTemplateId: number | string) =>
    apiRequest('/v1/data/dict/detail', {
      method: 'GET',
      params: { dictTemplateId },
    }),
  editStatus: (data: any) => post('/v1/data/dict/edit/status', data),
  create: (data: any) => post('/v1/data/dict/create', data),
  edit: (data: any) => post('/v1/data/dict/edit', data),
  editDirectoryName: (data: any) => post('/v1/data/dict/directory/edit/name', data),
  editDirectoryStatus: (data: any) => post('/v1/data/dict/directory/edit/status', data),
  deleteDirectory: (dictDirectoryId: number | string) =>
    apiRequest('/v1/data/dict/directory/delete', {
      method: 'DELETE',
      params: { dictDirectoryId },
    }),
};

export const businessApi = {
  detail: (sceneTemplateId: number | string) =>
    apiRequest('/v1/data/business/detail', {
      method: 'GET',
      params: { sceneTemplateId },
    }),
  knowledgeList: (data: any) => post('/v1/data/business/knowledge/list', data),
  knowledgeDetail: (knowledgeId: number | string) =>
    apiRequest('/v1/data/business/knowledge/detail', {
      method: 'GET',
      params: { knowledgeId },
    }),
  addKnowledge: (data: any) => post('/v1/data/business/knowledge/add', data),
  editKnowledge: (data: any) => post('/v1/data/business/knowledge/edit', data),
  deleteKnowledge: (knowledgeId: number | string) =>
    post('/v1/data/business/knowledge/delete', { knowledgeId: Number(knowledgeId) }),
  exportTemplate: (sceneTemplateId: number | string) =>
    apiRequest('/v1/data/business/knowledge/template/export', {
      method: 'GET',
      params: { sceneTemplateId },
    }),
  importData: (data: any) => post('/v1/data/business/knowledge/data/import', data),
  statisticsKnowledge: () =>
    apiRequest('/v1/data/business/statistics/knowledge', { method: 'GET' }),
};

export const fileApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    form.append('filename', file.name);
    return apiRequest('/v1/data/business/upload/file', {
      method: 'POST',
      body: form,
    });
  },
};

export const userApi = {
  list: (params?: any) =>
    apiRequest('/v1/data/user/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 100, ...params },
    }),
};
