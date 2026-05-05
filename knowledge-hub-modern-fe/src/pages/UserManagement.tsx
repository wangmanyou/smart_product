import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, Modal, Select, Space, Switch, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { roleApi, userApi } from '@/services/api';

export default function UserManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

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

  const showEditor = (record?: any) => {
    setEditing(record || null);
    form.setFieldsValue(
      record
        ? {
            userAccount: record.userAccount,
            userNickname: record.userNickname,
            userEmail: record.userEmail,
            userPhoneNum: record.userPhoneNum,
            roleId: record.roleId || undefined,
          }
        : { roleId: roles[0]?.roleId },
    );
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await userApi.edit({ ...values, userId: editing.userId });
      message.success('用户已更新');
    } else {
      await userApi.add(values);
      message.success('用户已创建');
    }
    setOpen(false);
    load();
  };

  const columns: ColumnsType<any> = [
    { title: '账号', width: 180, dataIndex: 'userAccount' },
    { title: '昵称', width: 180, dataIndex: 'userNickname' },
    { title: '角色', width: 180, render: (_, record) => roleMap.get(Number(record.roleId)) || '--' },
    { title: '邮箱', width: 220, dataIndex: 'userEmail' },
    { title: '手机号', width: 160, dataIndex: 'userPhoneNum' },
    { title: '状态', width: 120, render: (_, record) => <StatusTag disabled={record.isDisabled} /> },
    {
      title: '启用',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={!record.isDisabled}
          disabled={record.isBuiltin}
          onChange={async (checked) => {
            await userApi.editStatus({ userId: record.userId, isDisabled: !checked });
            load();
          }}
        />
      ),
    },
    {
      title: '操作',
      width: 120,
      render: (_, record) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => showEditor(record)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <PageHeader
      title="用户管理"
      breadcrumb="系统管理 / 用户管理"
      description="维护系统账号，并为用户分配一个角色。"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => showEditor()}>新增用户</Button>}
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

      <Modal
        title={editing ? '编辑用户' : '新增用户'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="userAccount" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input disabled={Boolean(editing)} />
          </Form.Item>
          {!editing ? (
            <Form.Item name="userPassword" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
              <Input.Password />
            </Form.Item>
          ) : null}
          <Form.Item name="userNickname" label="昵称">
            <Input />
          </Form.Item>
          <Space.Compact block>
            <Form.Item name="userEmail" label="邮箱" style={{ width: '50%' }}>
              <Input />
            </Form.Item>
            <Form.Item name="userPhoneNum" label="手机号" style={{ width: '50%' }}>
              <Input />
            </Form.Item>
          </Space.Compact>
          <Form.Item name="roleId" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
            <Select
              options={roles.map((role) => ({ value: role.roleId, label: role.roleName }))}
              placeholder="请选择角色"
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageHeader>
  );
}
