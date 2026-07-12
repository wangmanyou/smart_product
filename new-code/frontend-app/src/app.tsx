import {
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { message } from 'antd';
import GlobalWorkTabs from './components/GlobalWorkTabs';
import HeaderUserMenu from './components/HeaderUserMenu';
import { authApi } from './services/api';
import './global.less';

let refreshingCurrentUser = false;

function approvalTitle(user: any) {
  const actions = new Set(user?.setting?.operationPermissions || user?.operationPermissions || []);
  const canReview =
    Boolean(user?.isBuiltin || user?.setting?.admin || user?.roleIds?.includes?.(1)) ||
    actions.has('system:approval:manage') ||
    actions.has('knowledge:change-request:view-all') ||
    actions.has('knowledge:change-request:approve') ||
    actions.has('knowledge:change-request:reject');
  return canReview ? '审批管理' : '审批中心';
}

export function onRouteChange({ location }: any) {
  if (location.pathname !== '/login' && !authApi.getToken()) {
    history.push('/login');
    return;
  }
  if (location.pathname === '/login' || refreshingCurrentUser || !authApi.getToken()) {
    return;
  }
  refreshingCurrentUser = true;
  authApi
    .current()
    .then((latestUser) => {
      const cachedUser = authApi.getCurrentUser();
      const cached = JSON.stringify(cachedUser || {});
      const latest = JSON.stringify(latestUser || {});
      if (cached !== latest) {
        authApi.setCurrentUser(latestUser);
        if (cachedUser?.userId) {
          window.location.reload();
        }
      }
    })
    .catch(() => undefined)
    .finally(() => {
      refreshingCurrentUser = false;
    });
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
      colorBgHeader: '#14213b',
      colorHeaderTitle: '#fff',
      colorTextMenu: 'rgba(255,255,255,.78)',
      colorTextMenuActive: '#fff',
      colorTextMenuSelected: '#fff',
      colorBgMenuItemSelected: 'rgba(255,255,255,.14)',
      colorBgMenuItemHover: 'rgba(255,255,255,.10)',
    },
    pageContainer: {
      colorBgPageContainer: '#eef3f8',
      paddingInlinePageContainerContent: 32,
      paddingBlockPageContainerContent: 24,
    },
  },
  menuDataRender: () => {
    const user = authApi.getCurrentUser();
    const isAdmin = Boolean(user?.isBuiltin || user?.setting?.admin || user?.roleIds?.includes?.(1));
    const pages = new Set(user?.setting?.pagePermissions || user?.pagePermissions || []);
    const actions = new Set(user?.setting?.operationPermissions || user?.operationPermissions || []);
    const hasOwnApprovals = Object.values(user?.setting?.approvalRequired || {}).some(Boolean);
    const modulePageMap: Record<string, string[]> = {
      'page:system:dicts': ['system:dict:manage'],
      'page:system:scenes': ['system:scene:manage'],
      'page:system:users': ['system:user:manage'],
      'page:system:roles': ['system:role:manage'],
      'page:system:approvals': [
        'system:approval:manage',
        'knowledge:change-request:view-own',
        'knowledge:change-request:view-all',
        'knowledge:change-request:approve',
        'knowledge:change-request:reject',
      ],
    };
    const canSystemPage = (code: string) =>
      isAdmin ||
      (code === 'page:system:approvals' && hasOwnApprovals) ||
      Boolean(modulePageMap[code]?.some((permissionCode) => actions.has(permissionCode)));
    const canPage = (code: string) =>
      code.startsWith('page:system:')
        ? canSystemPage(code)
        : isAdmin || pages.has(code) || Boolean(modulePageMap[code]?.some((permissionCode) => actions.has(permissionCode)));
    return [
      canPage('page:knowledge') ? { path: '/knowledge', name: '知识中心', icon: <BookOutlined /> } : null,
      {
        path: '/system',
        name: '系统管理',
        icon: <SettingOutlined />,
        children: [
          canPage('page:system:dicts') ? { path: '/system/dicts', name: '目录管理', icon: <DatabaseOutlined /> } : null,
          canPage('page:system:scenes') ? { path: '/system/scenes', name: '场景管理', icon: <BookOutlined /> } : null,
          canPage('page:system:users') ? { path: '/system/users', name: '用户管理', icon: <TeamOutlined /> } : null,
          canPage('page:system:roles') ? { path: '/system/roles', name: '角色管理', icon: <SettingOutlined /> } : null,
          canPage('page:system:approvals') ? { path: '/system/approvals', name: approvalTitle(user), icon: <BellOutlined /> } : null,
          isAdmin ? { path: '/system/logs', name: '系统审计日志', icon: <FileSearchOutlined /> } : null,
        ].filter(Boolean),
      },
      canPage('page:statistics') ? { path: '/statistics', name: '数据看板', icon: <BarChartOutlined /> } : null,
      { path: '/notifications', name: '通知中心', icon: <BellOutlined /> },
    ].filter((item: any) => item && (item.path !== '/system' || item.children?.length));
  },
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
    title: authApi.getCurrentUser()?.userNickname || authApi.getCurrentUser()?.userAccount || '管理员',
    render: (_, dom) => <HeaderUserMenu dom={dom} />,
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
