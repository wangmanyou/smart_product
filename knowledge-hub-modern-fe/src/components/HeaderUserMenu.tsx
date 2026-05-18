import { BellOutlined, LogoutOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Badge, Dropdown, Space } from 'antd';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { approvalApi, authApi } from '@/services/api';

const DEFAULT_AVATAR = '/assets/default-avatar.svg';

function avatarUrl(value?: string) {
  const path = value?.trim();
  if (!path) return DEFAULT_AVATAR;
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  if (path.startsWith('/api')) return path;
  if (path.startsWith('/')) return `/api${path}`;
  return `/api/${path}`;
}

export default function HeaderUserMenu({ dom }: { dom: ReactNode }) {
  const user = authApi.getCurrentUser();
  const userName = user?.userNickname || user?.userAccount || '管理员';
  const avatarSrc = avatarUrl(user?.userPicture);
  const isAdmin = Boolean(user?.isBuiltin || user?.roleId === 1 || user?.roleIds?.includes?.(1));
  const pages = new Set(user?.setting?.pagePermissions || user?.pagePermissions || []);
  const actions = new Set(user?.setting?.operationPermissions || user?.operationPermissions || []);
  const canManageApprovals =
    isAdmin ||
    pages.has('page:system:approvals') ||
    actions.has('system:manage') ||
    actions.has('system:approval:manage') ||
    actions.has('knowledge:change-request:view-all');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!canManageApprovals) {
      setPending(0);
      return;
    }
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
  }, [canManageApprovals]);

  return (
    <Dropdown
      menu={{
        items: [
          canManageApprovals ? {
            key: 'approvals',
            icon: <BellOutlined />,
            label: (
              <Space>
                变更审批
                {pending > 0 ? <Badge count={pending} size="small" /> : null}
              </Space>
            ),
            onClick: () => history.push('/system/approvals'),
          } : null,
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: () => {
              authApi.clear();
              history.push('/login');
            },
          },
        ].filter(Boolean),
      }}
    >
      <Space className="modern-avatar">
        <Badge dot={pending > 0} offset={[-2, 2]}>
          <span className="modern-avatar-image">
            <img
              src={avatarSrc}
              alt={userName}
              onError={(event) => {
                if (event.currentTarget.src.endsWith(DEFAULT_AVATAR)) return;
                event.currentTarget.src = DEFAULT_AVATAR;
              }}
            />
          </span>
        </Badge>
        {dom}
      </Space>
    </Dropdown>
  );
}
