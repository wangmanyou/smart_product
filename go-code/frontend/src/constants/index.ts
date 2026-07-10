export const DEFAULT_NAME = 'Umi Max';

export const LOGIN_PATH: string = '/user/login';

export const LOGIN_EXPIRE_MSG = '登录已过期，请重新登录';

export enum RequestCode {
  REQUEST_ERR_CODE = 200,
  ACCESS_TOPEN_EXPIRE = 4101,
  REFRESH_TOPEN_EXPIRE = 4102,
  RESPONSE_NOT_FOUND = 400,
}

export enum RequestStatus {
  RESPONSE_ERR_LOGIN_STATUS = 422,
  UNAUTHORIZED = 401,
}

export enum ResponseStatus {
  RESPONSE_ERR_LOGIN_STATUS = 422,
  UNAUTHORIZED = 401,
}
