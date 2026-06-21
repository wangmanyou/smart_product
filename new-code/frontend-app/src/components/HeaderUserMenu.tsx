import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Badge, Dropdown, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import ProfileEditorModal from '@/components/ProfileEditorModal';
import { authApi, notificationApi } from '@/services/api';
import { DEFAULT_AVATAR, avatarUrl } from '@/utils/avatar';

export default function HeaderUserMenu({ dom }: { dom: ReactNode }) {
  const [user, setUser] = useState(() => authApi.getCurrentUser());
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const userName = user?.userNickname || user?.userAccount || '管理员';
  const avatarSrc = avatarUrl(user?.userPicture);

  const loadNotifications = useCallback(() => {
    notificationApi
      .unreadCount()
      .then((res) => setUnread(Number(res?.count || res?.unreadCount || 0)))
      .catch(() => setUnread(0));
    notificationApi
      .list({ pageNumber: 1, pageSize: 5, unreadOnly: true })
      .then((res) => setNotifications(Array.isArray(res?.content) ? res.content : []))
      .catch(() => setNotifications([]));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'hidden' && authApi.getToken()) {
        loadNotifications();
      }
    };
    const timer = window.setInterval(sync, 10000);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [loadNotifications]);

  useEffect(() => {
    window.addEventListener('notifications-updated', loadNotifications);
    return () => window.removeEventListener('notifications-updated', loadNotifications);
  }, [loadNotifications]);

  useEffect(() => {
    const syncUser = () => setUser(authApi.getCurrentUser());
    window.addEventListener('current-user-updated', syncUser);
    window.addEventListener('storage', syncUser);
    return () => {
      window.removeEventListener('current-user-updated', syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  const openNotification = async (item: any) => {
    if (item?.type === 'IMPORT_RESULT') {
      history.push(`/notifications?notificationId=${item.notificationId}`);
      return;
    }
    if (item?.linkUrl) {
      if (!item.read) {
        await notificationApi.read(item.notificationId).catch(() => undefined);
        window.dispatchEvent(new Event('notifications-updated'));
      }
      history.push(item.linkUrl);
      return;
    }
    history.push('/notifications');
  };

  const notificationItems: MenuProps['items'] = notifications.length
    ? notifications.map((item) => ({
        key: `notification-${item.notificationId}`,
        icon: <BellOutlined />,
        label: (
          <div style={{ width: 280 }}>
            <Space>
              <Badge status="processing" />
              <Typography.Text strong>{item.title}</Typography.Text>
            </Space>
            {item.content ? (
              <Typography.Paragraph
                type="secondary"
                ellipsis={{ rows: 2 }}
                style={{ margin: '4px 0 0' }}
              >
                {item.content}
              </Typography.Paragraph>
            ) : null}
          </div>
        ),
        onClick: () => openNotification(item),
      }))
    : [
        {
          key: 'notification-empty',
          disabled: true,
          label: <Typography.Text type="secondary">暂无未读通知</Typography.Text>,
        },
      ];

  const items: MenuProps['items'] = [
    {
      key: 'notification-title',
      disabled: true,
      label: (
        <Space style={{ width: 280, justifyContent: 'space-between' }}>
          <Typography.Text strong>未读通知</Typography.Text>
          {unread > 0 ? <Typography.Text type="secondary">{unread} 条未读</Typography.Text> : null}
        </Space>
      ),
    },
    ...notificationItems,
    {
      key: 'notification-page',
      label: '查看通知中心',
      onClick: () => history.push('/notifications'),
    },
    unread > 0
      ? {
          key: 'notification-read-all',
          label: '全部标记已读',
          onClick: async () => {
            await notificationApi.readAll();
            loadNotifications();
          },
        }
      : null,
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => setProfileOpen(true),
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
  ].filter(Boolean) as MenuProps['items'];

  return (
    <>
      <Dropdown
        menu={{ items }}
        onOpenChange={(open) => {
          if (open) loadNotifications();
        }}
      >
        <Space className="modern-avatar">
          <Badge count={unread} size="small" offset={[-2, 2]}>
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
      <ProfileEditorModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onSaved={(nextUser) => setUser(nextUser)}
      />
    </>
  );
}
