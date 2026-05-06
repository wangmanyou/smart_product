import { CopyOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Form, Input, Space, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { sceneApi } from '@/services/api';
import { formatTime } from '@/utils/data';

export default function SceneManagement() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const load = async (values: any = {}) => {
    setLoading(true);
    try {
      const res = await sceneApi.list({ searchSceneDisabled: '', ...values });
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
    { title: '场景名称', dataIndex: 'sceneName' },
    {
      title: '场景状态',
      width: 110,
      className: 'status-table-cell',
      render: (_, record) => <StatusTag disabled={record.sceneIsDisabled} />,
    },
    {
      title: '使用状态',
      width: 110,
      className: 'status-table-cell',
      render: (_, record) => <StatusTag used={record.sceneIsUsed} />,
    },
    { title: '创建人', dataIndex: 'creatorName', width: 120 },
    { title: '更新时间', dataIndex: 'updateTime', width: 160, render: formatTime },
    {
      title: '操作',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => history.push({
              pathname: `/system/scenes/${record.sceneTemplateId}/view`,
              state: { tabLabel: `${record.sceneName}场景详情` },
            })}
          >
            查看
          </Button>
          <Button
            type="link"
            onClick={() => history.push({
              pathname: `/system/scenes/${record.sceneTemplateId}/config`,
              state: { tabLabel: `${record.sceneName}场景编辑` },
            })}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageHeader
      title="场景管理"
      breadcrumb="系统管理 / 场景管理"
      extra={[
        <Button
          key="create"
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => history.push({ pathname: '/system/scenes/new/config', state: { tabLabel: '创建场景' } })}
        >
          新增场景
        </Button>,
        <Button key="copy" icon={<CopyOutlined />}>复制已有场景</Button>,
      ]}
    >
      <Card className="toolbar-card">
        <Form form={form} layout="inline" onFinish={load}>
          <Form.Item name="searchSceneName" label="场景名称">
            <Input allowClear placeholder="请输入场景名称" style={{ width: 280 }} />
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
          rowKey="sceneTemplateId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ total, pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
    </PageHeader>
  );
}
