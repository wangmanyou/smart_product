import { ResponseStatus } from '@/constants';
import { TokenManager } from '@/utils/auth';
import type { AxiosResponse, RequestOptions } from '@@/plugin-request/request';
import { getRequestInstance } from '@@/plugin-request/request';
import { type Settings as LayoutSettings } from '@ant-design/pro-components';
import { RunTimeLayoutConfig, history } from '@umijs/max';
import { Dropdown, message } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
// import HeaderRender from '@/components/HeaderRender/index';
// import RightContent from '@/components/HeaderRender';
import defaultSettings from '../config/defaultSettings';

import { getUserInfoApi } from './services/user/login';

import { RouteScope, getRouteScope } from './constants/route';


const tokenManager = new TokenManager();
// 运行时配置
// import { request } from '@/utils/service';
// 全局初始化数据配置，用于 Layout 用户信息和权限初始化
// 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate

const getUserInfo = async () => {
  try {
    const response = await getUserInfoApi()
    return response;
  } catch (error) {
    return {};
  }
};


const handleLayout = async () => {
  try {
    localStorage.removeItem('accessToken');
    history.push('/login');
  } catch (error) {
    message.error('退出失败');
  }
}

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  userInfo: any;
}> {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) {
    history.push('/login');
  }
  let userInfo = {};


  if (window.location.pathname !== '/login') {
    userInfo = await getUserInfo()

  }
  return {
    settings: defaultSettings as Partial<LayoutSettings>,
    userInfo,
  };
}

let prevScope: RouteScope | null = null;

export function onRouteChange({ location }) {
  console.log('[route change]', location.pathname);

  (window as any).__PREV_SCOPE__ = prevScope;
  prevScope = getRouteScope(location.pathname);

}

export const layout: RunTimeLayoutConfig = ({ initialState }) => {

  return {
    logo: false,
    locale: 'zh-CN',
    // headerRender: () => <HeaderRender />,
    // rightRender: () => <RightContent />,
    avatarProps: {
      src: initialState?.userInfo?.userPicture || 'https://gw.alipayobjects.com/zos/antfincdn/efFD%24IOql2/weixintupian_20170331104822.jpg',
      size: 'small',
      title: initialState?.userInfo?.userNickname || '--',
      render: (props, dom) => {
        return (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'logout',
                  icon: <LogoutOutlined />,
                  label: '退出登录',
                  onClick: handleLayout,
                },
              ],
            }}
          >
            {dom}
          </Dropdown>
        )
      },
    },
    ...initialState?.settings,
  };
};
// This function is used to make a request again with a new token
function requestAgain(token: string, url: string, options: RequestOptions) {
  const { headers } = options;
  const requestInstance = getRequestInstance();
  let currentUrl: string = url;
  const newOptions = {
    ...options,
    headers: {

      ...headers,
      Authorization: `Bearer ${token}`,
    },
  };
  // 此时请求失败需要注意重新请求需要标准请求实例，并不是二次封装的request
  return requestInstance(currentUrl, newOptions);
}
const requestInterceptors = (url: string, options: RequestOptions) => {
  let tranUrl = url;
  const reg = /^\/@(\w+)\//;
  let headers = { ...options.headers };
  tranUrl = tranUrl.match(reg) ? tranUrl.replace(reg, '/$1/') : `${tranUrl}`;
  const {
    params,
    requestConf = { needAuthorization: true },
    ...argsOpts
  } = options;
  const { needAuthorization } = requestConf;

  if (needAuthorization) {
    const accessToken = window.localStorage.getItem('accessToken');
    // @ts-ignore eslint-disable-next-line
    headers = { ...headers, Authorization: `Bearer ${accessToken}`, };
  }


  return {
    url: tranUrl,
    options: {
      ...argsOpts,
      headers,
      params,
    },
  };
};

const responseInterceptors = (response: AxiosResponse) => {
  console.log('response33333', response);

  const { config, data={} } = response;

  // token失效以后重新刷新的逻辑 需要的是response中重新发起request请求的逻辑
  switch (data && data?.code) {
    case ResponseStatus.RESPONSE_ERR_LOGIN_STATUS:
      return tokenManager.refreshAccessToken((token: string) =>
        requestAgain(token, config.url as string, {
          method: config.method,
          headers: config.headers,
          params: config.params,
          data: config.data,
        }),
      );
    case ResponseStatus.UNAUTHORIZED:
      message.error('请重新登录');
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
      return
    default:
      return response;
  }
};

export const request = {
  timeout: 5 * 60 * 1000,
  errorConfig: {
    errorHandler: (err) => {

      const { response } = err;
      console.log('response444', response, response?.config, response?.status);

      switch (response?.status) {
        case ResponseStatus.RESPONSE_ERR_LOGIN_STATUS:
          const { url, method, headers, params, data } = response?.config || {};
          return tokenManager.refreshAccessToken((token: string) => {
            requestAgain(token, url as string, {
              method,
              headers,
              params,
              data,
            })
          });
        case ResponseStatus.UNAUTHORIZED:
          // message.error(response?.data?.message || '请重新登录');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1000);
          return
        default:
          throw response.data;
      }
    },
  },
  requestInterceptors: [requestInterceptors],
  responseInterceptors: [responseInterceptors],
};


