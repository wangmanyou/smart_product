import { CopyOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { sceneApi } from '@/services/api';
import { formatTime } from '@/utils/data';

export default function SceneManagement() {
  const [form] = Form.useForm();
  const [copyForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [copyOptions, setCopyOptions] = useState<any[]>([]);
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

  const openCopy = async () => {
    setCopyOpen(true);
    copyForm.resetFields();
    const res = await sceneApi.list({ pageNumber: 1, pageSize: 1000, searchSceneDisabled: '' });
    setCopyOptions((res?.content || []).map((item: any) => ({
      value: item.sceneTemplateId,
      label: item.sceneName,
    })));
  };

  const submitCopy = async () => {
    const values = await copyForm.validateFields();
    setCopying(true);
    try {
      await sceneApi.copy(values);
      message.success('复制成功');
      setCopyOpen(false);
      load(form.getFieldsValue());
    } finally {
      setCopying(false);
    }
  };

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
      width: 220,
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
          <Popconfirm
            title={record.sceneIsDisabled ? '确认启用该场景？' : '确认禁用该场景？'}
            okText="确认"
            cancelText="取消"
            onConfirm={async () => {
              await sceneApi.editStatus({
                sceneTemplateId: record.sceneTemplateId,
                isDisabled: !record.sceneIsDisabled,
              });
              message.success(record.sceneIsDisabled ? '场景已启用' : '场景已禁用');
              load(form.getFieldsValue());
            }}
          >
            <Button type="link">
              {record.sceneIsDisabled ? '启用' : '禁用'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageHeader
      title="场景管理"
      hideHeader
      breadcrumb="系统管理 / 场景管理"
    >
      <div className="scene-management-breadcrumb page-breadcrumb">系统管理 / 场景管理</div>
      <section className="scene-management-toolbar">
        <div className="scene-management-toolbar-main">
          <Form form={form} layout="inline" onFinish={load} className="scene-management-filter">
            <Form.Item name="searchSceneName" label="场景名称">
              <Input allowClear placeholder="请输入场景名称" style={{ width: 280 }} />
            </Form.Item>
            <Form.Item name="searchSceneDisabled" label="场景状态">
              <Select
                allowClear
                placeholder="全部状态"
                style={{ width: 160 }}
                options={[
                  { value: 'enabled', label: '正常' },
                  { value: 'disabled', label: '已禁用' },
                ]}
              />
            </Form.Item>
            <Form.Item>
              <Space className="scene-management-filter-actions">
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
                <Button onClick={() => { form.resetFields(); load(); }}>重置</Button>
              </Space>
            </Form.Item>
            <Form.Item className="scene-management-create-actions">
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => history.push({ pathname: '/system/scenes/new/config', state: { tabLabel: '创建场景' } })}
                >
                  新增场景
                </Button>
                <Button icon={<CopyOutlined />} onClick={openCopy}>复制已有场景</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </section>
      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="sceneTemplateId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ total, pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
      <Modal
        title="复制已有场景"
        open={copyOpen}
        okText="复制"
        cancelText="取消"
        confirmLoading={copying}
        onOk={submitCopy}
        onCancel={() => setCopyOpen(false)}
        destroyOnClose
      >
        <Form form={copyForm} layout="vertical">
          <Form.Item
            name="sceneTemplateId"
            label="源场景"
            rules={[{ required: true, message: '请选择要复制的场景' }]}
          >
            <Select
              showSearch
              placeholder="请选择要复制的场景"
              options={copyOptions}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item
            name="sceneName"
            label="新场景名称"
            rules={[
              { required: true, message: '请输入新场景名称' },
              { type: 'string', whitespace: true, message: '请输入有效名称' },
            ]}
          >
            <Input placeholder="请输入新场景名称" />
          </Form.Item>
        </Form>
      </Modal>
    </PageHeader>
  );
}
