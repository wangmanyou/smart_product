import { EditOutlined, KeyOutlined, PlusOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Input, Modal, Popconfirm, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { roleApi, userApi } from '@/services/api';

export default function UserManagement() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [userRes, roleRes] = await Promise.all([
        userApi.list({ pageNumber: 1, pageSize: 100 }),
        roleApi.list({ pageNumber: 1, pageSize: 100 }),
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

  const openEditor = (record?: any) => {
    history.push({
      pathname: record ? `/system/users/${record.userId}/config` : '/system/users/new/config',
      state: {
        tabLabel: record ? `${record.userAccount}用户编辑` : '新增用户',
        replacePath: record ? undefined : '/system/users',
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
    { title: '账号', width: 170, dataIndex: 'userAccount' },
    { title: '昵称', width: 170, dataIndex: 'userNickname' },
    {
      title: '角色',
      render: (_, record) => {
        const names = record.roleNames?.length
          ? record.roleNames
          : (record.roleIds || [record.roleId]).map((roleId: number) => roleMap.get(Number(roleId))).filter(Boolean);
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
      width: 270,
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
              load();
            }}
          >
            <Button type="link" disabled={record.isBuiltin}>
              {record.isDisabled ? '启用' : '禁用'}
            </Button>
          </Popconfirm>
          <Button type="link" icon={<KeyOutlined />} onClick={() => resetPassword(record)}>
            重置密码
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageHeader
      title="用户管理"
      breadcrumb="系统管理 / 用户管理"
      description="维护系统账号、停用状态、登录密码，并通过穿梭框为用户分配多个角色。"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openEditor()}>新增用户</Button>}
    >
      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="userId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
    </PageHeader>
  );
}
