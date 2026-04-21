import { defineConfig } from '@umijs/max';
import defaultSettings from './config/defaultSettings';
import routers from './config/routes';

const antd = {
  theme: {
    token: {
      colorPrimary: '#397eec',
    },
    components: {
      Tree: {
        nodeSelectedBg: '#397eec',
        nodeSelectedColor: '#fff',
        nodeHoverBg: '#397eec',
        nodeHoverColor: '#fff',
      },
      Card: {
        bodyPadding: 8,
        headerPadding: 8,
      }
    }
  },
};

export default defineConfig({
  antd: antd,
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    ...defaultSettings,
  },
  routes: routers,
  npmClient: 'pnpm',
  tailwindcss: {},
  proxy: {
    '/api': {
      target: 'http://192.168.10.5:8000',
      changeOrigin: true,
      // pathRewrite: { '^/api': '' },
    },
    '/data': {
      target: 'http://192.168.10.5:8000',
      changeOrigin: true,
    },
  },
});
