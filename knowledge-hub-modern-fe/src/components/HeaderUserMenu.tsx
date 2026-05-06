import { BellOutlined, LogoutOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Badge, Dropdown, Space } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { approvalApi, authApi } from '@/services/api';

export default function HeaderUserMenu({ dom }: { dom: ReactNode }) {
  const user = authApi.getCurrentUser();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let mounted = true;
    approvalApi
      .list({ status: 'PENDING', pageSize: 1 })
      .then((res) => {
        if (mounted) setPending(Number(res?.totalElements || 0));
      })
      .catch(() => {
        if (mounted) setPending(0);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Dropdown
      menu={{
        items: [
          {
            key: 'approvals',
            icon: <BellOutlined />,
            label: (
              <Space>
                变更审批
                {pending > 0 ? <Badge count={pending} size="small" /> : null}
              </Space>
            ),
            onClick: () => history.push('/system/approvals'),
          },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: () => {
              authApi.clear();
              history.push('/login');
            },
          },
        ],
      }}
    >
      <Space className="modern-avatar">
        <Badge dot={pending > 0} offset={[-2, 2]}>
          <Avatar size={28}>{user?.userNickname?.[0] || user?.userAccount?.[0] || '管'}</Avatar>
        </Badge>
        {dom}
      </Space>
    </Dropdown>
  );
}
