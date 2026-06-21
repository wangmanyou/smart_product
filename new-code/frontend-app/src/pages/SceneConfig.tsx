import { DeleteOutlined, PlusCircleOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Form, Input, message, Popconfirm, Select, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { dictApi, sceneApi } from '@/services/api';
import { closeWorkTab, sceneTypeText, setWorkTabLabel } from '@/utils/data';
import { runAfterUnsavedConfirm, useUnsavedChanges } from '@/utils/unsavedChanges';

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

function isDictDisabled(dict: any) {
  return Boolean(dict?.dictDisabled || dict?.isDisabled);
}

export default function SceneConfig() {
  const { id = '' } = useParams();
  const location = useLocation();
  const isCreate = id === 'new' || location.pathname === '/system/scenes/new/config';
  const readonly = location.pathname.endsWith('/view');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<SceneRow[]>([]);
  const [dicts, setDicts] = useState<any[]>([]);
  const [sceneUsed, setSceneUsed] = useState(false);
  const [sceneNameText, setSceneNameText] = useState('');
  const [dirty, setDirty] = useState(false);
  const clearUnsaved = useUnsavedChanges(location.pathname, dirty, !readonly);
  const pageTitle = readonly ? '场景详情' : isCreate ? '创建场景' : '场景编辑';
  const breadcrumb = `系统管理 / 场景管理 / ${pageTitle}`;

  const goBackToSceneList = () => {
    closeWorkTab(location.pathname);
    history.push({
      pathname: '/system/scenes',
      state: { replacePath: location.pathname },
    });
  };

  const load = async () => {
    setLoading(true);
    try {
      const dictRes = await dictApi.list({ pageSize: 100 });
      setDicts(dictRes?.content || []);
      if (isCreate) {
        form.setFieldsValue({ sceneName: '' });
        setSceneNameText('');
        setRows([emptyRow(1)]);
        setSceneUsed(false);
        setDirty(false);
        return;
      }
      const res = await sceneApi.detail(id);
      const sceneName = res?.sceneTemplateDetail?.sceneName;
      setSceneUsed(Boolean(res?.sceneTemplateDetail?.sceneIsUsed));
      form.setFieldsValue({ sceneName });
      setSceneNameText(sceneName || '');
      if (sceneName) {
        setWorkTabLabel(location.pathname, `${sceneName}${readonly ? '场景详情' : '场景编辑'}`);
      }
      setRows((res?.sceneItem || []).map((item: any, index: number) => ({ ...item, sortNumber: item.sortNumber || index + 1 })));
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateRow = (rowId: SceneRow['id'], patch: Partial<SceneRow>) => {
    if (patch.type === 'dict' && rows.some((item) => item.id !== rowId && item.type === 'dict')) {
      message.warning('每个场景只能配置一个目录字段');
      return;
    }
    setDirty(true);
    setRows((prev) => prev.map((item) => (item.id === rowId ? { ...item, ...patch } : item)));
  };

  const addRow = () => {
    setDirty(true);
    setRows((prev) => [...prev, emptyRow(prev.length + 1)]);
  };

  const removeRow = async (row: SceneRow) => {
    if (!row.isNew && row.id) {
      await sceneApi.deleteItem(row.id);
      message.success('字段已删除');
      load();
      return;
    }
    setDirty(true);
    setRows((prev) => prev.filter((item) => item.id !== row.id));
  };

  const submit = async () => {
    const values = await form.validateFields();
    const activeRows = rows.filter((item) => item.sceneItemName?.trim());
    const dictRows = activeRows.filter((item) => item.type === 'dict');
    if (dictRows.some((item) => !item.dictTemplateId)) {
      message.warning('请选择目录类型');
      return;
    }
    const disabledDictIds = new Set(
      dicts
        .filter(isDictDisabled)
        .map((dict) => Number(dict.dictTemplateId)),
    );
    if (dictRows.some((item) => disabledDictIds.has(Number(item.dictTemplateId)))) {
      message.warning('已禁用的目录不能配置到场景');
      return;
    }
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
    if (sceneItem.filter((item) => item.type === 'dict').length > 1) {
      message.warning('每个场景只能配置一个目录字段');
      return;
    }
    if (!isCreate && sceneUsed && rows.some((item) => item.isNew && item.isRequired)) {
      message.warning('场景已有知识，新增字段不能直接设为必填，请先新增为非必填并补全历史知识后再改为必填');
      return;
    }

    if (isCreate) {
      await sceneApi.create({ sceneName: values.sceneName, sceneItem });
      message.success('场景已创建');
      clearUnsaved();
      goBackToSceneList();
      return;
    }
    await sceneApi.edit({ sceneTemplateId: Number(id), sceneName: values.sceneName, sceneItem });
    message.success('场景配置已保存');
    clearUnsaved();
    goBackToSceneList();
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
              options={typeOptions.map((option) => ({
                ...option,
                disabled: option.value === 'dict' && record.type !== 'dict' && rows.some((item) => item.type === 'dict'),
              }))}
              onChange={(value) => updateRow(record.id, { type: value })}
            />
            {record.type === 'dict' ? (
              <Select
                value={record.dictTemplateId || undefined}
                style={{ width: '54%' }}
                placeholder="请选择目录类型"
                options={dicts.map((dict) => ({
                  value: dict.dictTemplateId,
                  label: isDictDisabled(dict) ? `${dict.dictName}（已禁用）` : dict.dictName,
                  disabled: isDictDisabled(dict),
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
      title={pageTitle}
      hideHeader
      breadcrumb={breadcrumb}
    >
      <div className="legacy-scene-form scene-config-form">
        <div className="scene-config-head">
          <div className="scene-config-breadcrumb page-breadcrumb">{breadcrumb}</div>
          {readonly ? (
            <Space className="scene-config-actions">
              <Button onClick={() => runAfterUnsavedConfirm(location.pathname, () => history.push('/system/scenes'))}>返回</Button>
              <Button
                type="primary"
                onClick={() => history.push({
                  pathname: `/system/scenes/${id}/config`,
                  state: {
                    tabLabel: `${sceneNameText || form.getFieldValue('sceneName') || ''}场景编辑`,
                    replacePath: location.pathname,
                  },
                })}
              >
                编辑
              </Button>
            </Space>
          ) : null}
        </div>

        <Form
          form={form}
          className="legacy-meta-form"
          labelCol={{ flex: '86px' }}
          wrapperCol={{ flex: 'auto' }}
          onValuesChange={(changedValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, 'sceneName')) {
              setSceneNameText(changedValues.sceneName || '');
            }
            setDirty(true);
          }}
        >
          {readonly ? (
            <Form.Item label="场景名称">
              <span className="scene-readonly-name">{sceneNameText || form.getFieldValue('sceneName') || '--'}</span>
            </Form.Item>
          ) : (
            <Form.Item name="sceneName" label="场景名称" rules={[{ required: true, message: '请输入场景名称' }]}>
              <Input placeholder="请输入场景名称" />
            </Form.Item>
          )}
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
