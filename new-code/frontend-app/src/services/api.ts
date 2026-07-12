import { history } from '@umijs/max';
import { message } from 'antd';
import * as forge from 'node-forge';

const API_PREFIX = '/api';
const TOKEN_KEY = 'accessToken';
const USER_KEY = 'currentUser';

function isPublicAuthPath(path: string) {
  return path === '/v1/data/user/login' || path === '/v1/data/user/login/key';
}

function buildUrl(path: string, params?: any) {
  const url = new URL(`${API_PREFIX}${path}`, window.location.origin);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== '') {
          url.searchParams.append(key, String(item));
        }
      });
      return;
    }
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
  if (token && !isPublicAuthPath(path)) finalHeaders.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path, params), {
    ...rest,
    headers: finalHeaders,
    body,
  });

  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

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

function base64ToArrayBuffer(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(value: ArrayBuffer) {
  const bytes = new Uint8Array(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary);
}

function getRandomBinary(length: number) {
  const bytes = new Uint8Array(length);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return binary;
}

async function encryptLoginPassword(password: string) {
  const keyInfo = await apiRequest('/v1/data/user/login/key', { method: 'GET' });
  const publicKeyBase64 = keyInfo.publicKey;

  if (window.crypto?.subtle) {
    try {
      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        base64ToArrayBuffer(publicKeyBase64),
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt'],
      );
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        publicKey,
        new TextEncoder().encode(password),
      );
      return arrayBufferToBase64(encrypted);
    } catch {
      // Public HTTP can disable WebCrypto. Fall back to JS RSA for temporary access.
    }
  }

  try {
    const der = forge.util.decode64(publicKeyBase64);
    const asn1 = forge.asn1.fromDer(der);
    const publicKey = forge.pki.publicKeyFromAsn1(asn1);
    const encrypted = publicKey.encrypt(forge.util.encodeUtf8(password), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
      seed: getRandomBinary(32),
    } as any);
    return forge.util.encode64(encrypted);
  } catch (error) {
    const msg = '临时登录加密失败，请刷新页面后重试';
    message.error(msg);
    throw error instanceof Error ? error : new Error(msg);
  }
}

async function buildLoginPasswordPayload(password: string) {
  if (!window.isSecureContext || !window.crypto?.subtle) {
    return { userPassword: password };
  }
  try {
    return { encryptedPassword: await encryptLoginPassword(password) };
  } catch {
    return { userPassword: password };
  }
}

export const authApi = {
  login: async (params: { userAccount: string; userPassword: string }) =>
    post('/v1/data/user/login', {
      userAccount: params.userAccount,
      ...(await buildLoginPasswordPayload(params.userPassword)),
    }),
  logout: () => post('/v1/data/user/logout'),
  current: () => apiRequest('/v1/data/user/current/detail', { method: 'GET' }),
  updateProfile: (data: any) => post('/v1/data/user/current/edit', data),
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
  logs: (params?: any) =>
    apiRequest('/v1/data/scene/log/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 10, ...params },
    }),
  editStatus: (data: any) => post('/v1/data/scene/edit/status', data),
  create: (data: any) => post('/v1/data/scene/create', data),
  copy: (data: any) => post('/v1/data/scene/copy', data),
  edit: (data: any) => post('/v1/data/scene/edit', data),
  requiredEligibility: (sceneItemId: number | string) =>
    apiRequest('/v1/data/scene/item/required-eligibility', {
      method: 'GET',
      params: { sceneItemId },
    }),
  typeMigrationPreview: (sceneItemId: number | string, targetType: string) =>
    apiRequest('/v1/data/scene/item/type-migration-preview', {
      method: 'GET',
      params: { sceneItemId, targetType },
    }),
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
  delete: (dictTemplateId: number | string) =>
    post('/v1/data/dict/delete', { dictTemplateId: Number(dictTemplateId) }),
  create: (data: any) => post('/v1/data/dict/create', data),
  edit: (data: any) => post('/v1/data/dict/edit', data),
  editDirectoryName: (data: any) => post('/v1/data/dict/directory/edit/name', data),
  editDirectoryStatus: (data: any) => post('/v1/data/dict/directory/edit/status', data),
  sortDirectories: (data: any) => post('/v1/data/dict/directory/sort', data),
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
  knowledgeLogs: (knowledgeId: number | string, params?: any) =>
    apiRequest('/v1/data/business/knowledge/log/list', {
      method: 'GET',
      params: { knowledgeId, pageNumber: 1, pageSize: 10, ...params },
    }),
  knowledgeLogOperators: (knowledgeId: number | string) =>
    apiRequest('/v1/data/business/knowledge/log/operator/list', {
      method: 'GET',
      params: { knowledgeId },
    }),
  knowledgeVersions: (knowledgeId: number | string, params?: any) =>
    apiRequest('/v1/data/business/knowledge/version/list', {
      method: 'GET',
      params: { knowledgeId, pageNumber: 1, pageSize: 10, ...params },
    }),
  knowledgeVersionDetail: (versionId: number | string) =>
    apiRequest('/v1/data/business/knowledge/version/detail', {
      method: 'GET',
      params: { versionId },
    }),
  sceneKnowledgeLogs: (sceneTemplateId: number | string, params?: any) =>
    apiRequest('/v1/data/business/scene/knowledge-log/list', {
      method: 'GET',
      params: { sceneTemplateId, pageNumber: 1, pageSize: 10, ...params },
    }),
  sceneKnowledgeLogOperators: (sceneTemplateId: number | string) =>
    apiRequest('/v1/data/business/scene/knowledge-log/operator/list', {
      method: 'GET',
      params: { sceneTemplateId },
    }),
  addKnowledge: (data: any) => post('/v1/data/business/knowledge/add', data),
  editKnowledge: (data: any) => post('/v1/data/business/knowledge/edit', data),
  deleteKnowledge: (knowledgeId: number | string) =>
    post('/v1/data/business/knowledge/delete', { knowledgeId: Number(knowledgeId) }),
  exportTemplate: (sceneTemplateId: number | string, includeDirectory = false) =>
    apiRequest('/v1/data/business/knowledge/template/export', {
      method: 'GET',
      params: { sceneTemplateId, includeDirectory },
    }),
  importData: (data: any) => post('/v1/data/business/knowledge/data/import', data),
  statisticsKnowledge: (params?: any) =>
    apiRequest('/v1/data/business/statistics/knowledge', { method: 'GET', params }),
  dashboardOverview: (params?: any) =>
    apiRequest('/v1/data/business/dashboard/overview', { method: 'GET', params }),
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
  detail: (userId: number | string) =>
    apiRequest('/v1/data/user/detail', {
      method: 'GET',
      params: { userId },
    }),
  add: (data: any) => post('/v1/data/user/add', data),
  edit: (data: any) => post('/v1/data/user/edit', data),
  editStatus: (data: any) => post('/v1/data/user/edit/status', data),
  resetPassword: (data: any) => post('/v1/data/user/password/reset', data),
};

export const roleApi = {
  list: (params?: any) =>
    apiRequest('/v1/data/role/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 100, ...params },
    }),
  options: () =>
    apiRequest('/v1/data/role/options', {
      method: 'GET',
    }),
  detail: (roleId: number | string) =>
    apiRequest('/v1/data/role/detail', {
      method: 'GET',
      params: { roleId },
    }),
  add: (data: any) => post('/v1/data/role/add', data),
  edit: (data: any) => post('/v1/data/role/edit', data),
  editStatus: (data: any) => post('/v1/data/role/edit/status', data),
  delete: (roleId: number | string) => post('/v1/data/role/delete', { roleId: Number(roleId) }),
};

export const permissionApi = {
  list: () => apiRequest('/v1/data/permission/list', { method: 'GET' }),
  add: (data: any) => post('/v1/data/permission/add', data),
  edit: (data: any) => post('/v1/data/permission/edit', data),
  editStatus: (data: any) => post('/v1/data/permission/edit/status', data),
  delete: (permissionId: number | string) => post('/v1/data/permission/delete', { permissionId: Number(permissionId) }),
};

export const approvalApi = {
  mine: (params?: any) =>
    apiRequest('/v1/data/business/knowledge/change-request/my', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 10, ...params },
    }),
  list: (params?: any) =>
    apiRequest('/v1/data/business/knowledge/change-request/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 10, ...params },
    }),
  update: (data: any) => post('/v1/data/business/knowledge/change-request/update', data),
  withdraw: (changeRequestId: number | string) =>
    post('/v1/data/business/knowledge/change-request/withdraw', { changeRequestId: Number(changeRequestId) }),
  delete: (changeRequestId: number | string) =>
    post('/v1/data/business/knowledge/change-request/delete', { changeRequestId: Number(changeRequestId) }),
  approve: (data: any) => post('/v1/data/business/knowledge/change-request/approve', data),
  reject: (data: any) => post('/v1/data/business/knowledge/change-request/reject', data),
};

export const notificationApi = {
  list: (params?: any) =>
    apiRequest('/v1/notifications', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 5, ...params },
    }),
  unreadCount: () => apiRequest('/v1/notifications/unread-count', { method: 'GET' }),
  read: (notificationId: number | string) => post('/v1/notifications/read', { notificationId: Number(notificationId) }),
  readAll: () => post('/v1/notifications/read-all'),
};

export const accessLogApi = {
  list: (params?: any) =>
    apiRequest('/v1/data/system/access-log/list', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 10, ...params },
    }),
  myLoginLogs: (params?: any) =>
    apiRequest('/v1/data/user/login-log/my', {
      method: 'GET',
      params: { pageNumber: 1, pageSize: 10, ...params },
    }),
  userLoginLogs: (userId: number | string, params?: any) =>
    apiRequest('/v1/data/user/login-log/list', {
      method: 'GET',
      params: { userId, pageNumber: 1, pageSize: 10, ...params },
    }),
};
