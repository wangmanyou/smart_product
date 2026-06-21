import {
  BellOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  InboxOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Badge, Button, Empty, List, Modal, Space, Tag, Typography, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { notificationApi } from '@/services/api';
import { formatTime } from '@/utils/data';

type NotificationItem = {
  notificationId: number | string;
  type?: string;
  title?: string;
  content?: string;
  bizType?: string;
  level?: string;
  linkUrl?: string;
  read?: boolean;
  readAt?: number;
  createTime?: number;
  payload?: any;
};

const levelMap: Record<string, { text: string; className: string }> = {
  SUCCESS: { text: '成功', className: 'is-success' },
  WARNING: { text: '提醒', className: 'is-warning' },
  ERROR: { text: '异常', className: 'is-error' },
  INFO: { text: '消息', className: 'is-info' },
};

function emitNotificationChanged() {
  window.dispatchEvent(new Event('notifications-updated'));
}

function targetText(item: NotificationItem) {
  if (item.type === 'APPROVAL_PENDING') return '去审批';
  if (item.type === 'APPROVAL_APPROVED' || item.type === 'APPROVAL_REJECTED') return '查看结果';
  if (item.linkUrl?.includes('/system/approvals')) return '查看申请';
  return '去处理';
}

function hasTargetLink(item?: NotificationItem) {
  return Boolean(item?.linkUrl && item.type !== 'IMPORT_RESULT');
}

export default function Notifications() {
  const location = useLocation();
  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [detail, setDetail] = useState<NotificationItem>();
  const openedNotificationId = useRef<string>();

  const readTotal = useMemo(() => Math.max(total - unreadTotal, 0), [total, unreadTotal]);
  const targetNotificationId = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('notificationId') || undefined;
  }, [location.search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, unreadRes] = await Promise.all([
        notificationApi.list({
          pageNumber: current,
          pageSize,
        }),
        notificationApi.unreadCount().catch(() => undefined),
      ]);
      setRows(Array.isArray(res?.content) ? res.content : []);
      setTotal(Number(res?.totalElements || 0));
      setUnreadTotal(Number(unreadRes?.count || unreadRes?.unreadCount || 0));
    } finally {
      setLoading(false);
    }
  }, [current, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'hidden') {
        load();
      }
    };
    const timer = window.setInterval(sync, 10000);
    window.addEventListener('notifications-updated', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('notifications-updated', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [load]);

  const markRead = async (item: NotificationItem, refresh = true) => {
    if (item.read) return;
    await notificationApi.read(item.notificationId);
    emitNotificationChanged();
    setRows((prev) =>
      prev.map((row) =>
        row.notificationId === item.notificationId
          ? { ...row, read: true, readAt: Math.floor(Date.now() / 1000) }
          : row,
      ),
    );
    setUnreadTotal((value) => Math.max(value - 1, 0));
    if (refresh) load();
  };

  const openNotification = async (item: NotificationItem) => {
    setDetail(item);
    if (!item.read) {
      await markRead(item, false);
      setDetail({ ...item, read: true, readAt: Math.floor(Date.now() / 1000) });
    }
  };

  const openTarget = async (item: NotificationItem) => {
    if (!hasTargetLink(item)) {
      await openNotification(item);
      return;
    }
    if (!item.read) {
      await markRead(item, false);
    }
    setDetail(undefined);
    history.push(item.linkUrl);
  };

  useEffect(() => {
    if (!targetNotificationId || openedNotificationId.current === targetNotificationId) return;
    const target = rows.find((row) => String(row.notificationId) === targetNotificationId);
    if (!target) return;
    openedNotificationId.current = targetNotificationId;
    openNotification(target);
  }, [rows, targetNotificationId]);

  const markAllRead = async () => {
    if (!unreadTotal) return;
    await notificationApi.readAll();
    message.success('已全部标记为已读');
    emitNotificationChanged();
    setCurrent(1);
    if (current === 1) {
      load();
    }
  };

  return (
    <PageHeader
      title="通知中心"
      breadcrumb="通知中心"
      extra={[
        <Button key="reload" icon={<ReloadOutlined />} onClick={load}>
          刷新
        </Button>,
        unreadTotal ? (
          <Button key="readAll" icon={<CheckOutlined />} onClick={markAllRead}>
            全部已读
          </Button>
        ) : null,
      ]}
    >
      <div className="notification-workspace">
        <aside className="notification-summary-panel">
          <div className="notification-summary-title">
            <InboxOutlined />
            <span>消息</span>
          </div>
          <div className="notification-summary-compact">
            <div className="notification-summary-line is-unread">
              <span>未读</span>
              <strong>{unreadTotal}</strong>
            </div>
            <div className="notification-summary-line">
              <span>已读</span>
              <strong>{readTotal}</strong>
            </div>
          </div>
          <div className="notification-summary-total">共 {total} 条</div>
        </aside>

        <section className="notification-list-panel">
          <div className="notification-list-head">
            <Typography.Title level={4}>全部消息</Typography.Title>
            {unreadTotal ? <Badge count={unreadTotal} overflowCount={99} /> : null}
          </div>

          <List
            loading={loading}
            dataSource={rows}
            className="notification-list"
            pagination={{
              current,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (value) => `共 ${value} 条`,
              onChange: (page, size) => {
                setCurrent(page);
                setPageSize(size || 10);
              },
            }}
            locale={{
              emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知" />,
            }}
            renderItem={(item) => {
              const level = levelMap[item.level || 'INFO'] || levelMap.INFO;
              return (
                <List.Item
                  className={item.read ? 'notification-row' : 'notification-row is-unread'}
                  actions={[
                    !item.read ? (
                      <Button
                        key="read"
                        type="text"
                        icon={<CheckCircleOutlined />}
                        onClick={async (event) => {
                          event.stopPropagation();
                          await markRead(item);
                        }}
                      >
                        设为已读
                      </Button>
                    ) : null,
                    hasTargetLink(item) ? (
                      <Button
                        key="target"
                        type="link"
                        onClick={(event) => {
                          event.stopPropagation();
                          openTarget(item);
                        }}
                      >
                        {targetText(item)} <RightOutlined />
                      </Button>
                    ) : null,
                    <Button
                      key="open"
                      type="link"
                      onClick={(event) => {
                        event.stopPropagation();
                        openNotification(item);
                      }}
                    >
                      详情 <RightOutlined />
                    </Button>,
                  ].filter(Boolean)}
                  onClick={() => openNotification(item)}
                >
                  <List.Item.Meta
                    avatar={
                      <span className={item.read ? 'notification-icon' : 'notification-icon is-active'}>
                        <BellOutlined />
                      </span>
                    }
                    title={
                      <Space size={10} wrap>
                        <Typography.Text strong={!item.read}>{item.title || '通知'}</Typography.Text>
                        <Tag className={`notification-level ${level.className}`}>{level.text}</Tag>
                        {!item.read ? <Badge status="processing" text="未读" /> : null}
                      </Space>
                    }
                    description={
                      <div className="notification-copy">
                        <Typography.Paragraph ellipsis={{ rows: 2 }}>
                          {item.content || '暂无内容'}
                        </Typography.Paragraph>
                        {item.type === 'IMPORT_RESULT' ? (
                          <Typography.Text type="secondary">
                            {Array.isArray(item.payload?.warnings) && item.payload.warnings.length
                              ? `${item.payload.warnings.length} 条明细可查看`
                              : '没有未成功行。'}
                          </Typography.Text>
                        ) : item.createTime ? (
                          <Typography.Text type="secondary">{formatTime(item.createTime)}</Typography.Text>
                        ) : null}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </section>
      </div>
      <Modal
        open={Boolean(detail)}
        title={detail?.title || '通知详情'}
        footer={hasTargetLink(detail) ? [
          <Button key="target" type="primary" onClick={() => openTarget(detail)}>
            {targetText(detail)}
          </Button>,
        ] : null}
        width={640}
        onCancel={() => setDetail(undefined)}
      >
        {detail ? (
          <div className="notification-detail-dialog">
            <Typography.Paragraph>{detail.content || '暂无内容'}</Typography.Paragraph>
            {detail.type === 'IMPORT_RESULT' ? (
              <>
                <div className="notification-import-metrics">
                  <span>{`读取 ${detail.payload?.totalRows ?? 0} 行`}</span>
                  <span>{`导入 ${detail.payload?.importedRows ?? 0} 条`}</span>
                  <span>{`审批 ${detail.payload?.pendingRows ?? 0} 条`}</span>
                  <span>{`跳过 ${detail.payload?.skippedRows ?? 0} 行`}</span>
                </div>
                {Array.isArray(detail.payload?.warnings) && detail.payload.warnings.length ? (
                  <div className="notification-import-warning-list">
                    <Typography.Text strong>未成功行明细</Typography.Text>
                    <ul>
                      {detail.payload.warnings.map((warning: string, index: number) => (
                        <li key={`${warning}-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Typography.Text type="secondary">没有未成功行。</Typography.Text>
                )}
              </>
            ) : (
              <Typography.Text type="secondary">
                {detail.createTime ? `通知时间：${formatTime(detail.createTime)}` : null}
              </Typography.Text>
            )}
          </div>
        ) : null}
      </Modal>
    </PageHeader>
  );
}
