import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { roleApi } from '@/services/api';

export default function RoleManagement() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await roleApi.list({ pageSize: 100 });
      setRows(res?.content || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openConfig = (record?: any) => {
    const pathname = record ? `/system/roles/${record.roleId}/config` : '/system/roles/new/config';
    history.push({
      pathname,
      state: {
        tabLabel: record ? `${record.roleName}角色配置` : '新增角色',
        replacePath: record ? undefined : '/system/roles',
      },
    });
  };

  const columns: ColumnsType<any> = [
    { title: '角色名称', width: 180, dataIndex: 'roleName' },
    { title: '说明', dataIndex: 'roleRemark' },
    {
      title: '类型',
      width: 130,
      render: (_, record) => (record?.setting?.admin ? <Tag color="blue">管理员</Tag> : <Tag>普通角色</Tag>),
    },
    { title: '状态', width: 120, render: (_, record) => <StatusTag disabled={record.isDisabled} /> },
    {
      title: '启用',
      width: 100,
      render: (_, record) => (
        <Switch
          checked={!record.isDisabled}
          disabled={record.isBuiltin}
          onChange={async (checked) => {
            await roleApi.editStatus({ roleId: record.roleId, isDisabled: !checked });
            load();
          }}
        />
      ),
    },
    {
      title: '权限概览',
      width: 260,
      render: (_, record) => {
        const setting = record?.setting || {};
        if (setting.admin) return <Tag color="blue">全部页面 / 全部操作 / 全部场景</Tag>;
        return (
          <Space size={4} wrap>
            <Tag>{(setting.pagePermissions || []).length} 个页面</Tag>
            <Tag>{(setting.operationPermissions || []).length} 个操作</Tag>
            <Tag>{(setting.sceneTemplateIds || []).length} 个场景</Tag>
          </Space>
        );
      },
    },
    {
      title: '操作',
      width: 130,
      render: (_, record) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => openConfig(record)}>
          配置
        </Button>
      ),
    },
  ];

  return (
    <PageHeader
      title="角色管理"
      breadcrumb="系统管理 / 角色管理"
      description="维护角色基础信息，并打开独立配置页设置页面权限、操作权限、审批规则和场景范围。"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => openConfig()}>新增角色</Button>}
    >
      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="roleId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
    </PageHeader>
  );
}
