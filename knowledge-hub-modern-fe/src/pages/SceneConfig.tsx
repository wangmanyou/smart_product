import { DeleteOutlined, PlusCircleOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Form, Input, message, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { dictApi, sceneApi } from '@/services/api';
import { sceneTypeText, setWorkTabLabel } from '@/utils/data';

type SceneRow = {
  id: number | string;
  sceneItemName: string;
  type: string;
  dictTemplateId?: number;
  multiValue?: boolean;
  isHide?: boolean;
  isRequired?: boolean;
  isSupportSearch?: boolean;
  sortNumber?: number;
  isNew?: boolean;
};

const typeOptions = Object.entries(sceneTypeText).map(([value, label]) => ({ value, label }));

export default function SceneConfig() {
  const { id = '' } = useParams();
  const location = useLocation();
  const isCreate = id === 'new';
  const readonly = location.pathname.endsWith('/view');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SceneRow[]>([]);
  const [dicts, setDicts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const dictRes = await dictApi.list({ pageSize: 100 });
      setDicts(dictRes?.content || []);
      if (isCreate) {
        form.setFieldsValue({ sceneName: '' });
        setRows([emptyRow(1)]);
        return;
      }
      const res = await sceneApi.detail(id);
      const sceneName = res?.sceneTemplateDetail?.sceneName;
      form.setFieldsValue({ sceneName });
      if (sceneName) {
        setWorkTabLabel(location.pathname, `${sceneName}${readonly ? '场景详情' : '场景编辑'}`);
      }
      setRows((res?.sceneItem || []).map((item: any, index: number) => ({ ...item, sortNumber: item.sortNumber || index + 1 })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateRow = (rowId: SceneRow['id'], patch: Partial<SceneRow>) => {
    setRows((prev) => prev.map((item) => (item.id === rowId ? { ...item, ...patch } : item)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow(prev.length + 1)]);

  const removeRow = async (row: SceneRow) => {
    if (!row.isNew && row.id) {
      await sceneApi.deleteItem(row.id);
      message.success('字段已删除');
      load();
      return;
    }
    setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  const submit = async () => {
    const values = await form.validateFields();
    const sceneItem = rows
      .filter((item) => item.sceneItemName?.trim())
      .map((item, index) => ({
        id: item.isNew ? 0 : item.id,
        sceneItemName: item.sceneItemName,
        type: item.type,
        dictTemplateId: item.type === 'dict' ? Number(item.dictTemplateId || 0) : 0,
        multiValue: Boolean(item.multiValue),
        isHide: Boolean(item.isHide),
        isRequired: Boolean(item.isRequired),
        isSupportSearch: item.isSupportSearch !== false,
        sortNumber: index + 1,
      }));

    if (isCreate) {
      await sceneApi.create({ sceneName: values.sceneName, sceneItem });
      message.success('场景已创建');
      history.push('/system/scenes');
      return;
    }
    await sceneApi.edit({ sceneTemplateId: Number(id), sceneName: values.sceneName, sceneItem });
    message.success('场景配置已保存');
    history.push('/system/scenes');
  };

  const columns: ColumnsType<SceneRow> = useMemo(
    () => [
      { title: '排序', width: 70, render: (_, __, index) => <span className="drag-handle">⋮⋮</span> },
      {
        title: '模板名称',
        dataIndex: 'sceneItemName',
        render: (_, record) => (
            readonly ? record.sceneItemName : (
              <Input
                value={record.sceneItemName}
                placeholder="请输入"
                onChange={(event) => updateRow(record.id, { sceneItemName: event.target.value })}
              />
            )
        ),
      },
      {
        title: '模板类型',
        width: 350,
        render: (_, record) => (
          readonly ? (
            <Space>
              <Tag color="blue">{sceneTypeText[record.type] || record.type}</Tag>
              {record.type === 'dict' ? <span>{record.dictTemplateName || '--'}</span> : null}
            </Space>
          ) : (
          <Space.Compact block>
            <Select
              value={record.type}
              style={{ width: record.type === 'dict' ? '46%' : '100%' }}
              options={typeOptions}
              onChange={(value) => updateRow(record.id, { type: value })}
            />
            {record.type === 'dict' ? (
              <Select
                value={record.dictTemplateId || undefined}
                style={{ width: '54%' }}
                placeholder="请选择目录类型"
                options={dicts.map((dict) => ({
                  value: dict.dictTemplateId,
                  label: dict.dictName,
                }))}
                onChange={(value) => updateRow(record.id, { dictTemplateId: value })}
              />
            ) : null}
          </Space.Compact>
          )
        ),
      },
      {
        title: '操作类型',
        width: 130,
        render: (_, record) => (
          readonly ? (record.multiValue ? '多个' : '单个') : (
            <Switch
              checked={Boolean(record.multiValue)}
              checkedChildren="多个"
              unCheckedChildren="单个"
              onChange={(checked) => updateRow(record.id, { multiValue: checked })}
            />
          )
        ),
      },
      {
        title: '是否隐藏',
        width: 130,
        render: (_, record) => (
          readonly ? (record.isHide ? '隐藏' : '显示') : (
            <Switch
              checked={Boolean(record.isHide)}
              checkedChildren="隐藏"
              unCheckedChildren="显示"
              onChange={(checked) => updateRow(record.id, { isHide: checked })}
            />
          )
        ),
      },
      {
        title: '是否必填',
        width: 130,
        render: (_, record) => (
          readonly ? (record.isRequired ? '必填' : '非必填') : (
            <Switch
              checked={Boolean(record.isRequired)}
              checkedChildren="必填"
              unCheckedChildren="非必填"
              onChange={(checked) => updateRow(record.id, { isRequired: checked })}
            />
          )
        ),
      },
      {
        title: '支持搜索',
        width: 130,
        render: (_, record) => (
          readonly ? (record.isSupportSearch !== false ? '可搜索' : '不可搜') : (
            <Switch
              checked={record.isSupportSearch !== false}
              checkedChildren="可搜索"
              unCheckedChildren="不可搜"
              onChange={(checked) => updateRow(record.id, { isSupportSearch: checked })}
            />
          )
        ),
      },
      {
        title: '操作',
        width: 110,
        render: (_, record) => (
          readonly ? '--' : (
          <Space>
            <Button type="link" icon={<PlusCircleOutlined />} onClick={addRow} />
            <Popconfirm title="确认删除该字段？" onConfirm={() => removeRow(record)}>
              <Button type="link" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
          )
        ),
      },
    ],
    [rows, dicts],
  );

  return (
    <PageHeader
      title={readonly ? '场景详情' : isCreate ? '创建场景' : '场景编辑'}
      breadcrumb={`系统管理 / 场景管理 / ${readonly ? '场景详情' : isCreate ? '创建场景' : '场景编辑'}`}
      extra={readonly ? [
        <Button key="back" onClick={() => history.push('/system/scenes')}>返回</Button>,
        <Button
          key="edit"
          type="primary"
          onClick={() => history.push({
            pathname: `/system/scenes/${id}/config`,
            state: {
              tabLabel: `${form.getFieldValue('sceneName') || ''}场景编辑`,
              replacePath: location.pathname,
            },
          })}
        >
          编辑
        </Button>,
      ] : undefined}
    >
      <div className="legacy-scene-form">
        <Form form={form} className="legacy-meta-form" labelCol={{ flex: '86px' }} wrapperCol={{ flex: 'auto' }}>
          <Form.Item name="sceneName" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
            <Input placeholder="请输入场景名称" disabled={readonly} />
          </Form.Item>
          <Form.Item label="场景内容" required />
        </Form>

        <div className="scene-config-table">
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            pagination={false}
            scroll={{ x: 1300 }}
          />
          {!readonly ? (
            <Button block type="dashed" icon={<PlusOutlined />} className="legacy-add-row" onClick={addRow}>
              新增一行
            </Button>
          ) : null}
        </div>

        {!readonly ? (
          <Space className="legacy-form-actions">
            <Button icon={<ReloadOutlined />} onClick={load}>重置</Button>
            <Button type="primary" icon={<SaveOutlined />} onClick={submit}>提交</Button>
          </Space>
        ) : null}
      </div>
    </PageHeader>
  );
}

function emptyRow(sortNumber: number): SceneRow {
  return {
    id: `new-${Date.now()}-${sortNumber}`,
    sceneItemName: '',
    type: 'dict',
    dictTemplateId: undefined,
    multiValue: false,
    isHide: false,
    isRequired: false,
    isSupportSearch: true,
    sortNumber,
    isNew: true,
  };
}
