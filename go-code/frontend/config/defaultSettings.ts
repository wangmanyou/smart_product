import { ProLayoutProps } from '@ant-design/pro-components';

const Settings: ProLayoutProps = {
  fixSiderbar: true,
  title: '知识管理系统',
  layout: 'mix',
  fixedHeader: true,
  disableMobile: true,
  menu: {
    locale: false,
  },
  siderWidth: 200,
  
  token: {
    pageContainer: {
      colorBgPageContainer: '#fff',
      paddingBlockPageContainerContent: 0,
      paddingInlinePageContainerContent: 0,
    },
    
    header: {
      colorBgHeader: '#133673',
      colorBgRightActionsItemHover: 'rgba(0,0,0,0.06)',
      colorTextRightActionsItem: 'rgba(255,255,255,0.65)',
      colorHeaderTitle: '#fff',
      colorBgMenuItemHover: 'rgba(0,0,0,0.06)',
      colorBgMenuItemSelected: 'rgba(0,0,0,0.15)',
      colorTextMenuSelected: '#fff',
      colorTextMenu: 'rgba(255,255,255,0.75)',
      colorTextMenuSecondary: 'rgba(255,255,255,0.65)',
      colorTextMenuActive: 'rgba(255,255,255,0.95)',
    },
  },
};

export default Settings;
