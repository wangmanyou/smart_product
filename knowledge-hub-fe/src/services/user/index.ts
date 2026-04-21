import { request } from '@umijs/max';

export async function refreshTokenApi(
  body?: API.UserInfoVO,
  options?: { [key: string]: any },
) {
  return request<API.Result_UserInfo_>('/api/v1/user', {
    method: 'POST',
    data: body,
    ...(options || {}),
  });
}
