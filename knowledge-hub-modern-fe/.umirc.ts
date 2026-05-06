import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {
    theme: {
      token: {
        colorPrimary: '#1769e8',
        borderRadius: 8,
        fontFamily:
          '"Noto Sans SC", "Microsoft YaHei", "PingFang SC", "Segoe UI", Arial, sans-serif',
      },
      components: {
        Layout: {
          headerBg: '#061f4a',
          bodyBg: '#f4f7fc',
        },
        Card: {
          borderRadiusLG: 12,
          boxShadowTertiary: '0 12px 32px rgba(15, 23, 42, 0.06)',
        },
        Table: {
          headerBg: '#f8fafd',
          headerColor: '#101828',
          rowHoverBg: '#f8fbff',
        },
      },
    },
  },
  layout: {},
  request: {},
  history: { type: 'hash' },
  npmClient: 'npm',
  routes: [
    { path: '/login', component: './Login', layout: false },
    { path: '/', redirect: '/knowledge' },
    { path: '/home', component: './KnowledgeCenter' },
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
