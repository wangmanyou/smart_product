
import { request } from '@umijs/max';

// 登录
type LoginParams = {
  userAccount: string;
  userPassword: string;
};
export async function loginApi(params: LoginParams) {
  return request('/api/v1/data/user/login', {
    method: 'GET',
    params: {
      ...params,
    },
  });
}

// 获取当前登录用户信息
export async function getUserInfoApi() {
  return request('/api/v1/data/user/current/detail', {
    method: 'GET',
  });
}