import { loginOut } from '@/services/user';
import { history } from '@umijs/max';

import { ReactComponent as ChatIcon } from '@/assets/svg/chatIcon.svg';
import { ReactComponent as UserIcon } from '@/assets/svg/user.svg';

import type { MenuProps } from 'antd';
import { Divider, Dropdown } from 'antd';

import { useSnapshot } from '@umijs/max';

import { getStateActions, getStoreState } from '@/store';
import { BoxStatusEnum, ModuleNameEnum } from '@/store/types';
import classNames from 'classnames';

export interface MenuInfo {
    key: string;
    keyPath: string[];
    item: React.ReactInstance;
    domEvent: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;
}

const RightContent = () => {
    const { chatAIStatus } = useSnapshot(
        getStoreState({
            module: ModuleNameEnum.app,
        }),
    );

    const { setChatAIStatus } = getStateActions({
        module: ModuleNameEnum.app,
        actions: ['setChatAIStatus'],
    });

    const onMenuClick = async (info: MenuInfo) => {
        if (info.key === 'logout') {
            await loginOut();
            localStorage.clear();
            history.push('/user/login');
        } else {
            history.push(info.key);
        }
    };

    const dropDownMenu: MenuProps = {
        items:
            localStorage.getItem('username') === 'admin'
                ? [
                    {
                        key: '/llm/userManager',
                        label: '用户管理',
                    },
                    {
                        key: 'logout',
                        label: '退出登录',
                    },
                ]
                : [
                    {
                        key: 'logout',
                        label: '退出登录',
                    },
                ],
        onClick: onMenuClick,
    };

    return (
        <div className="mr-[30px] flex  items-center">
            <div
                className={classNames({
                    'h-[32px] px-8 rounded-lg flex items-center cursor-pointer header-chatAI': true,
                    'header-chatAI-active': chatAIStatus === BoxStatusEnum.opened,
                })}
                onClick={() => setChatAIStatus(BoxStatusEnum.opened, 'chatAIButton')}
            >
                <ChatIcon />
                <span className="pl-8">智能助手</span>
            </div>
            <Divider type="vertical" style={{ margin: '0 20px' }} />
            <Dropdown menu={dropDownMenu}>
                <div className="flex items-center">
                    <div className="mr-[16px] text-[#3A3A3C]">{localStorage.getItem('username')}</div>
                    <UserIcon />
                </div>
            </Dropdown>
        </div>
    );
};

export default RightContent;
