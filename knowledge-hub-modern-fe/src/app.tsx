import {
  BarChartOutlined,
  BookOutlined,
  DatabaseOutlined,
  HomeOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Avatar, Dropdown, message, Space } from 'antd';
import { authApi } from './services/api';
import GlobalWorkTabs from './components/GlobalWorkTabs';
import './global.less';

export function onRouteChange({ location }: any) {
  if (location.pathname !== '/login' && !authApi.getToken()) {
    history.push('/login');
  }
}

export const layout: RunTimeLayoutConfig = () => ({
  title: '知识管理系统',
  logo: false,
  layout: 'top',
  fixedHeader: true,
  menu: { locale: false, triggerSubMenuAction: 'click' },
  contentWidth: 'Fluid',
  token: {
    header: {
      colorBgHeader: '#061f4a',
      colorHeaderTitle: '#fff',
      colorTextMenu: 'rgba(255,255,255,.78)',
      colorTextMenuActive: '#fff',
      colorTextMenuSelected: '#fff',
      colorBgMenuItemSelected: 'rgba(255,255,255,.14)',
      colorBgMenuItemHover: 'rgba(255,255,255,.10)',
    },
    pageContainer: {
      colorBgPageContainer: '#f4f7fc',
      paddingInlinePageContainerContent: 32,
      paddingBlockPageContainerContent: 24,
    },
  },
  menuDataRender: () => [
    { path: '/home', name: '首页', icon: <HomeOutlined /> },
    { path: '/knowledge', name: '知识中心', icon: <BookOutlined /> },
    {
      path: '/system',
      name: '系统管理',
      icon: <SettingOutlined />,
      children: [
        { path: '/system/dicts', name: '目录管理', icon: <DatabaseOutlined /> },
        { path: '/system/scenes', name: '场景管理', icon: <BookOutlined /> },
        { path: '/system/users', name: '用户管理', icon: <TeamOutlined /> },
      ],
    },
    { path: '/statistics', name: '数据展板', icon: <BarChartOutlined /> },
  ],
  menuItemRender: (item, dom) => {
    if (item.children?.length) return dom;
    return (
      <span
        onClick={() => {
          if (!item.path) return;
          history.push(item.path);
        }}
      >
        {dom}
      </span>
    );
  },
  avatarProps: {
    size: 'small',
    title: authApi.getCurrentUser()?.userNickname || '超级管理员',
    render: (_, dom) => (
      <Dropdown
        menu={{
          items: [{
            key: 'logout',
            label: '退出登录',
            onClick: () => {
              authApi.clear();
              history.push('/login');
            },
          }],
        }}
      >
        <Space className="modern-avatar">
          <Avatar size={28}>{authApi.getCurrentUser()?.userNickname?.[0] || '管'}</Avatar>
          {dom}
        </Space>
      </Dropdown>
    ),
  },
  childrenRender: (children) => (
    <>
      <GlobalWorkTabs />
      {children}
    </>
  ),
});

export const request = {
  timeout: 5 * 60 * 1000,
  errorConfig: {
    errorHandler: (error: any) => {
      const msg =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        '请求失败，请检查后端服务';
      message.error(msg);
      return error?.response?.data || error;
    },
  },
};
