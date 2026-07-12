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
import { buildWorkTabLabel, formatTime } from '@/utils/data';

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
              state: { tabLabel: buildWorkTabLabel('directory-detail', record.dictName) },
            })}
          >
            查看
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => history.push({
              pathname: `/system/dicts/${record.dictTemplateId}/edit`,
              state: { tabLabel: buildWorkTabLabel('directory-edit', record.dictName) },
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
            description="删除前会检查该目录是否已被使用；已被使用的目录不能删除。确认删除该目录？"
            okText="确认删除"
            cancelText="取消"
            onConfirm={async () => {
              await dictApi.delete(record.dictTemplateId);
              message.success('目录已删除');
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
      hideHeader
      breadcrumb="系统管理 / 目录管理"
    >
      <div className="directory-management-breadcrumb page-breadcrumb">系统管理 / 目录管理</div>
      <section className="directory-management-toolbar">
        <Form form={form} layout="inline" className="directory-management-filter" onFinish={load}>
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
          <Form.Item className="directory-management-create-actions">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => history.push({ pathname: '/system/dicts/new/edit', state: { tabLabel: buildWorkTabLabel('directory-create') } })}
            >
              新增目录
            </Button>
          </Form.Item>
        </Form>
      </section>

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
