import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {
    theme: {
      token: {
        colorPrimary: '#2463eb',
        colorInfo: '#2463eb',
        colorSuccess: '#138a63',
        colorWarning: '#b7791f',
        colorError: '#d14343',
        borderRadius: 10,
        colorText: '#172033',
        colorTextSecondary: '#667085',
        colorBorder: '#d8e1ee',
        colorBgLayout: '#eef3f8',
        colorBgContainer: '#fbfcff',
        fontFamily:
          '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif',
      },
      components: {
        Layout: {
          headerBg: '#14213b',
          bodyBg: '#eef3f8',
        },
        Button: {
          borderRadius: 8,
          primaryShadow: 'none',
        },
        Card: {
          borderRadiusLG: 10,
          boxShadowTertiary: '0 16px 38px rgba(28, 44, 68, 0.06)',
        },
        Table: {
          headerBg: '#f5f8fc',
          headerColor: '#172033',
          rowHoverBg: '#f8fbff',
        },
      },
    },
  },
  layout: {},
  links: [
    { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    { rel: 'shortcut icon', href: '/favicon.svg', type: 'image/svg+xml' },
  ],
  request: {},
  history: { type: 'hash' },
  npmClient: 'npm',
  routes: [
    { path: '/login', component: './Login', layout: false },
    { path: '/', redirect: '/knowledge' },
    { path: '/home', redirect: '/knowledge' },
    { path: '/notifications', component: './Notifications' },
    { path: '/knowledge', component: './KnowledgeCenter' },
    { path: '/knowledge/scene/:id', component: './SceneKnowledge' },
    { path: '/knowledge/scene/:sceneId/detail/:id', component: './KnowledgeDetail' },
    { path: '/knowledge/scene/:sceneId/edit/:id', component: './KnowledgeForm' },
    { path: '/knowledge/scene/:sceneId/create', component: './KnowledgeForm' },
    { path: '/knowledge/scene/:sceneId/import', component: './ImportKnowledge' },
    { path: '/system/dicts', component: './DirectoryManagement' },
    { path: '/system/dicts/:id', component: './DirectoryDetail' },
    { path: '/system/dicts/:id/edit', component: './DirectoryForm' },
    { path: '/system/scenes', component: './SceneManagement' },
    { path: '/system/scenes/new/config', component: './SceneConfig' },
    { path: '/system/scenes/:id/view', component: './SceneConfig' },
    { path: '/system/scenes/:id/config', component: './SceneConfig' },
    { path: '/system/users', component: './UserManagement' },
    { path: '/system/users/new/config', component: './UserConfig' },
    { path: '/system/users/:id/config', component: './UserConfig' },
    { path: '/system/roles', component: './RoleManagement' },
    { path: '/system/roles/new/config', component: './RoleConfig' },
    { path: '/system/roles/:id/config', component: './RoleConfig' },
    { path: '/system/approvals', component: './ChangeApprovals' },
    { path: '/statistics', component: './Statistics' },
  ],
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
    '/data': {
      target: 'http://127.0.0.1:8001',
      changeOrigin: true,
    },
  },
});
