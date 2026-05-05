import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Form, Input, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { dictApi } from '@/services/api';
import { formatTime } from '@/utils/data';

export default function DirectoryManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const load = async (values: any = {}) => {
    setLoading(true);
    try {
      const res = await dictApi.list(values);
      setRows(Array.isArray(res?.content) ? res.content : []);
      setTotal(Number(res?.totalElements || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns: ColumnsType<any> = [
    { title: '目录名称', dataIndex: 'dictName', width: 260 },
    {
      title: '结构类型',
      dataIndex: 'dictType',
      width: 130,
      render: (type) => type === 'tree' ? <Tag color="blue">树形结构</Tag> : <Tag color="orange">平面结构</Tag>,
    },
    { title: '内容规模', width: 120, render: () => '--' },
    { title: '创建人', dataIndex: 'creatorName', width: 120 },
    {
      title: '状态',
      width: 120,
      render: (_, record) => <StatusTag disabled={record.dictDisabled} used={record.dictIsUsed} />,
    },
    { title: '更新时间', dataIndex: 'updateTime', width: 160, render: formatTime },
    {
      title: '操作',
      width: 280,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => history.push({
              pathname: `/system/dicts/${record.dictTemplateId}`,
              state: { tabLabel: `${record.dictName}目录详情` },
            })}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => history.push({
              pathname: `/system/dicts/${record.dictTemplateId}/edit`,
              state: { tabLabel: `${record.dictName}目录编辑` },
            })}
          >
            编辑
          </Button>
          <Button
            type="link"
            onClick={async () => {
              await dictApi.editStatus({ dictTemplateId: record.dictTemplateId, isDisabled: !record.dictDisabled });
              message.success(record.dictDisabled ? '目录已启用' : '目录已禁用');
              load(form.getFieldsValue());
            }}
          >
            {record.dictDisabled ? '启用' : '禁用'}
          </Button>
          <Popconfirm
            title="删除目录"
            description="当前后端未提供目录模板物理删除接口，这里会先禁用该目录。"
            okText="确认禁用"
            cancelText="取消"
            onConfirm={async () => {
              await dictApi.editStatus({ dictTemplateId: record.dictTemplateId, isDisabled: true });
              message.success('目录已禁用');
              load(form.getFieldsValue());
            }}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageHeader
      title="目录管理"
      breadcrumb="系统管理 / 目录管理"
      extra={[
        <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => history.push({ pathname: '/system/dicts/new/edit', state: { tabLabel: '新增目录' } })}>新增目录</Button>,
        <Button key="import">批量导入</Button>,
        <Button key="sort">排序维护</Button>,
      ]}
    >
      <Card className="toolbar-card">
        <Form form={form} layout="inline" onFinish={load}>
          <Form.Item name="searchDictName" label="目录名称">
            <Input allowClear placeholder="请输入目录名称" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="searchDictType" label="结构类型">
            <Select allowClear placeholder="全部" style={{ width: 160 }} options={[
              { value: 'tree', label: '树形结构' },
              { value: 'plane', label: '平面结构' },
            ]} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
              <Button onClick={() => { form.resetFields(); load(); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="dictTemplateId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{
            total,
            pageSize: 10,
            showTotal: (count) => `共 ${count} 条`,
          }}
        />
      </Card>
    </PageHeader>
  );
}
