import { EditOutlined, HistoryOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Avatar, Button, Card, Input, Modal, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import AccessLogTable from '@/components/AccessLogTable';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { accessLogApi, roleApi, userApi } from '@/services/api';
import { DEFAULT_AVATAR, avatarUrl } from '@/utils/avatar';
import { buildWorkTabLabel } from '@/utils/data';

export default function UserManagement() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [keyword, setKeyword] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loginLogUser, setLoginLogUser] = useState<any>(null);

  const load = async (nextKeyword = searchKeyword) => {
    setLoading(true);
    try {
      const value = nextKeyword.trim();
      const [userRes, roleRes] = await Promise.all([
        userApi.list({ pageNumber: 1, pageSize: 100, searchKeyword: value || undefined }),
        roleApi.options(),
      ]);
      setRows(userRes?.content || []);
      setRoles(roleRes?.content || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const roleMap = useMemo(
    () => new Map(roles.map((role) => [Number(role.roleId), role.roleName])),
    [roles],
  );
  const roleRankMap = useMemo(
    () => new Map(roles.map((role, index) => [Number(role.roleId), index])),
    [roles],
  );

  const roleNamesOf = (record: any) => (
    record.roleNames?.length
      ? record.roleNames
      : (record.roleIds || [record.roleId]).map((roleId: number) => roleMap.get(Number(roleId))).filter(Boolean)
  );

  const primaryRoleRank = (record: any) => {
    const roleId = Number((record.roleIds?.length ? record.roleIds[0] : record.roleId) || 0);
    return roleRankMap.get(roleId) ?? Number.MAX_SAFE_INTEGER;
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) =>
      primaryRoleRank(a) - primaryRoleRank(b) ||
      String(a.userAccount || '').localeCompare(String(b.userAccount || ''), 'zh-Hans-CN') ||
      Number(a.userId || 0) - Number(b.userId || 0),
    );
  }, [rows, roleRankMap]);

  const openEditor = (record?: any) => {
    history.push({
      pathname: record ? `/system/users/${record.userId}/config` : '/system/users/new/config',
      state: {
        tabLabel: record
          ? buildWorkTabLabel('user-edit', record.userAccount)
          : buildWorkTabLabel('user-create'),
      },
    });
  };

  const resetPassword = (record: any) => {
    let nextPassword = '';
    Modal.confirm({
      title: `重置 ${record.userAccount} 的密码`,
      content: (
        <Input.Password
          autoFocus
          placeholder="请输入新密码"
          onChange={(event) => {
            nextPassword = event.target.value;
          }}
        />
      ),
      okText: '确认重置',
      onOk: async () => {
        if (!nextPassword.trim()) {
          message.warning('请输入新密码');
          return Promise.reject();
        }
        await userApi.resetPassword({ userId: record.userId, userPassword: nextPassword });
        message.success('密码已重置');
      },
    });
  };

  const columns: ColumnsType<any> = [
    {
      title: '用户',
      width: 240,
      render: (_, record) => (
        <Space className="user-avatar-cell" size={12}>
          <Avatar
            src={
              <img
                src={avatarUrl(record.userPicture)}
                alt={record.userAccount}
                onError={(event) => {
                  if (event.currentTarget.src.endsWith(DEFAULT_AVATAR)) return;
                  event.currentTarget.src = DEFAULT_AVATAR;
                }}
              />
            }
          />
          <span className="user-avatar-copy">
            <Typography.Text strong>{record.userAccount}</Typography.Text>
            <Typography.Text type="secondary">{record.userNickname || '未设置昵称'}</Typography.Text>
          </span>
        </Space>
      ),
    },
    {
      title: '角色',
      render: (_, record) => {
        const names = roleNamesOf(record);
        return names?.length ? (
          <Space size={4} wrap>
            {names.map((name: string) => <Tag key={name}>{name}</Tag>)}
          </Space>
        ) : '--';
      },
    },
    { title: '邮箱', width: 220, dataIndex: 'userEmail' },
    { title: '手机号', width: 160, dataIndex: 'userPhoneNum' },
    { title: '状态', width: 100, render: (_, record) => <StatusTag disabled={record.isDisabled} /> },
    {
      title: '操作',
      width: 360,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEditor(record)}>
            编辑
          </Button>
          <Popconfirm
            title={record.isDisabled ? '确认启用该用户？' : '确认禁用该用户？'}
            okText="确认"
            cancelText="取消"
            disabled={record.isBuiltin}
            onConfirm={async () => {
              await userApi.editStatus({ userId: record.userId, isDisabled: !record.isDisabled });
              message.success(record.isDisabled ? '用户已启用' : '用户已禁用');
              load(searchKeyword);
            }}
          >
            <Button type="link" disabled={record.isBuiltin}>
              {record.isDisabled ? '启用' : '禁用'}
            </Button>
          </Popconfirm>
          <Button type="link" icon={<KeyOutlined />} onClick={() => resetPassword(record)}>
            重置密码
          </Button>
          <Button type="link" icon={<HistoryOutlined />} onClick={() => setLoginLogUser(record)}>
            登录记录
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageHeader
      title="用户管理"
      hideHeader
      breadcrumb="系统管理 / 用户管理"
    >
      <div className="user-management-breadcrumb page-breadcrumb">系统管理 / 用户管理</div>
      <section className="user-management-toolbar">
        <div className="user-management-search-wrap">
          <Input.Search
            allowClear
            className="user-management-search"
            value={keyword}
            placeholder="搜索账号、昵称、邮箱、手机号或角色"
            onChange={(event) => {
              const next = event.target.value;
              setKeyword(next);
              if (!next.trim() && searchKeyword) {
                setSearchKeyword('');
                load('');
              }
            }}
            onSearch={(value) => {
              const next = value.trim();
              setKeyword(next);
              setSearchKeyword(next);
              load(next);
            }}
          />
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增用户</Button>
      </section>

      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="userId"
          loading={loading}
          columns={columns}
          dataSource={sortedRows}
          pagination={{ pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
      <Modal
        title={`${loginLogUser?.userAccount || ''} 登录记录`}
        open={Boolean(loginLogUser)}
        width={920}
        footer={null}
        destroyOnClose
        onCancel={() => setLoginLogUser(null)}
      >
        {loginLogUser ? (
          <AccessLogTable
            active={Boolean(loginLogUser)}
            showUser={false}
            fetcher={(params) => accessLogApi.userLoginLogs(loginLogUser.userId, params)}
          />
        ) : null}
      </Modal>
    </PageHeader>
  );
}
