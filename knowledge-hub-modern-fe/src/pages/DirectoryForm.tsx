import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Form, Input, message, Popconfirm, Radio, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { dictApi } from '@/services/api';

type DirectoryRow = {
  id: number | string;
  name: string;
  level?: number;
  parentId?: number | string;
  children?: DirectoryRow[];
  isDisabled?: boolean;
  isUsed?: boolean;
  isNew?: boolean;
};

function normalizeTree(nodes: any[] = [], level = 0): DirectoryRow[] {
  return nodes.map((node) => ({
    ...node,
    level,
    ...(node.children?.length ? { children: normalizeTree(node.children, level + 1) } : {}),
  }));
}

function walkRows(nodes: DirectoryRow[] = []): DirectoryRow[] {
  return nodes.flatMap((node) => [node, ...walkRows(node.children || [])]);
}

function updateTree(nodes: DirectoryRow[], rowId: DirectoryRow['id'], patch: Partial<DirectoryRow>): DirectoryRow[] {
  return nodes.map((node) => {
    if (node.id === rowId) return { ...node, ...patch };
    if (!node.children?.length) return node;
    return { ...node, children: updateTree(node.children, rowId, patch) };
  });
}

function removeTree(nodes: DirectoryRow[], rowId: DirectoryRow['id']): DirectoryRow[] {
  return nodes
    .filter((node) => node.id !== rowId)
    .map((node) => {
      if (!node.children?.length) return node;
      const children = removeTree(node.children, rowId);
      return children.length ? { ...node, children } : { ...node, children: undefined };
    });
}

function addChildTree(nodes: DirectoryRow[], parentId: DirectoryRow['id'], child: DirectoryRow): DirectoryRow[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children || []), child] };
    }
    if (!node.children?.length) return node;
    return { ...node, children: addChildTree(node.children, parentId, child) };
  });
}

function toSubmitTree(nodes: DirectoryRow[] = []): any[] {
  return nodes
    .filter((node) => node.name?.trim())
    .map((node) => ({
      name: node.name,
      isDisabled: node.isDisabled,
      parentId: node.parentId || 0,
      level: node.level || 0,
      children: toSubmitTree(node.children || []),
    }));
}

function setCurrentTabLabel(path: string, label: string) {
  window.dispatchEvent(new CustomEvent('work-tab-label-change', { detail: { path, label } }));
}

export default function DirectoryForm() {
  const { id = '' } = useParams();
  const location = useLocation();
  const isCreate = id === 'new';
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [dictType, setDictType] = useState<'tree' | 'plane'>('tree');
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [editingIds, setEditingIds] = useState<Array<string | number>>([]);

  const load = async () => {
    if (isCreate) {
      form.setFieldsValue({ dictType: 'tree' });
      setDictType('tree');
      setRows([]);
      setEditingIds([]);
      return;
    }
    setLoading(true);
    try {
      const res = await dictApi.detail(id);
      const template = res?.dictTemplate || {};
      const type = template.dictType === 'plane' ? 'plane' : 'tree';
      form.setFieldsValue({ dictName: template.dictName, dictType: type });
      if (template.dictName) {
        setCurrentTabLabel(location.pathname, `${template.dictName}目录编辑`);
        history.replace({
          pathname: location.pathname,
          state: { tabLabel: `${template.dictName}目录编辑` },
        });
      }
      setDictType(type);
      setRows(type === 'tree' ? normalizeTree(res?.treeDict?.treeDict || []) : res?.planeDict?.planeDict || []);
      setEditingIds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const addRow = (parent?: DirectoryRow) => {
    const child = {
      id: `new-${Date.now()}`,
      name: '',
      isDisabled: false,
      isUsed: false,
      isNew: true,
      parentId: parent?.id || 0,
      level: parent ? Number(parent.level || 0) + 1 : 0,
    };
    setRows((prev) => (parent && dictType === 'tree' ? addChildTree(prev, parent.id, child) : [...prev, child]));
    setEditingIds((prev) => [...prev, child.id]);
  };

  const updateRow = (rowId: DirectoryRow['id'], patch: Partial<DirectoryRow>) => {
    setRows((prev) =>
      dictType === 'tree'
        ? updateTree(prev, rowId, patch)
        : prev.map((item) => (item.id === rowId ? { ...item, ...patch } : item)),
    );
  };

  const removeRow = async (row: DirectoryRow) => {
    if (!row.isNew) {
      await dictApi.deleteDirectory(row.id);
      message.success('目录项已删除');
      load();
      return;
    }
    setRows((prev) => (dictType === 'tree' ? removeTree(prev, row.id) : prev.filter((item) => item.id !== row.id)));
  };

  const submit = async () => {
    const values = await form.validateFields();
    const normalizedRows = dictType === 'tree' ? walkRows(rows).filter((item) => item.name?.trim()) : rows.filter((item) => item.name?.trim());
    if (isCreate) {
      const payload =
        values.dictType === 'tree'
          ? {
              dictName: values.dictName,
              dictType: values.dictType,
              treeDict: toSubmitTree(rows),
            }
          : {
              dictName: values.dictName,
              dictType: values.dictType,
              planeDict: { planeDict: normalizedRows.map((item) => ({ name: item.name, isDisabled: item.isDisabled })) },
            };
      await dictApi.create(payload);
      message.success('目录已创建');
      history.push('/system/dicts');
      return;
    }

    const newRows = normalizedRows.filter((item) => item.isNew);
    const appendPayload =
      values.dictType === 'tree'
        ? {
            treeDict: newRows.map((item) => ({
              name: item.name,
              isDisabled: item.isDisabled,
              parentId: item.parentId || 0,
              level: item.level || 0,
              children: [],
            })),
          }
        : {
            planeDict: { planeDict: newRows.map((item) => ({ name: item.name, isDisabled: item.isDisabled })) },
          };

    await dictApi.edit({
      dictTemplateId: Number(id),
      dictName: values.dictName,
      isDisabled: false,
      ...appendPayload,
    });
    const changedExisting = normalizedRows.filter((item) => !item.isNew);
    await Promise.all(
      changedExisting.map((item) =>
        dictApi.editDirectoryName({ dictDirectoryId: item.id, dictDirectoryName: item.name }),
      ),
    );
    message.success('目录已保存');
    history.push(`/system/dicts/${id}`);
  };

  const columns: ColumnsType<DirectoryRow> = useMemo(
    () => [
      {
        title: '内容名称',
        dataIndex: 'name',
        width: 330,
        render: (_, record) => {
          const editing = record.isNew || editingIds.includes(record.id);
          return (
            <div className="directory-name-cell">
              {editing ? (
                <Input
                  value={record.name}
                  placeholder="请输入内容名称"
                  style={{ width: 240 }}
                  onChange={(event) => updateRow(record.id, { name: event.target.value })}
                />
              ) : (
                <span className="directory-name-text">{record.name}</span>
              )}
            </div>
          );
        },
      },
      {
        title: '目录状态',
        width: 140,
        render: (_, record) =>
          record.isDisabled ? <Tag color="red">已禁用</Tag> : <Tag color="green">正常</Tag>,
      },
      {
        title: '是否使用中',
        width: 140,
        render: (_, record) => (record.isUsed ? '使用中' : '未使用'),
      },
      {
        title: '操作',
        width: 290,
        render: (_, record) => (
          <Space>
            <Button
              type="link"
              onClick={() => {
                if (record.isNew && editingIds.includes(record.id)) {
                  if (!record.name?.trim()) {
                    message.error('内容名称不能为空');
                    return;
                  }
                  setEditingIds((prev) => prev.filter((item) => item !== record.id));
                  return;
                }
                setEditingIds((prev) =>
                  prev.includes(record.id)
                    ? prev.filter((item) => item !== record.id)
                    : [...prev, record.id],
                );
              }}
            >
              {editingIds.includes(record.id) || record.isNew ? '完成' : '编辑'}
            </Button>
            <Button
              type="link"
              onClick={async () => {
                if (!record.isNew) {
                  await dictApi.editDirectoryStatus({ dictDirectoryId: record.id, isDisabled: !record.isDisabled });
                  message.success(record.isDisabled ? '已启用' : '已禁用');
                  load();
                  return;
                }
                updateRow(record.id, { isDisabled: !record.isDisabled });
              }}
            >
              {record.isDisabled ? '启用' : '禁用'}
            </Button>
            <Popconfirm title="确认删除该目录项？" onConfirm={() => removeRow(record)}>
              <Button type="link" danger>删除</Button>
            </Popconfirm>
            {dictType === 'tree' ? (
              <Button type="link" onClick={() => addRow(record)}>新增子集</Button>
            ) : null}
          </Space>
        ),
      },
    ],
    [dictType, rows, editingIds],
  );

  return (
    <PageHeader
      title={isCreate ? '创建目录' : '目录编辑'}
      breadcrumb={`系统管理 / 目录管理 / ${isCreate ? '创建目录' : '目录编辑'}`}
    >
      <div className="legacy-form-page directory-form-page">
        <Form form={form} className="legacy-meta-form" labelCol={{ flex: '86px' }} wrapperCol={{ flex: 'auto' }}>
          <Form.Item name="dictName" label="目录名称" rules={[{ required: true, message: '请输入目录名称' }]}>
            <Input placeholder="请输入目录名称" />
          </Form.Item>
          <Form.Item name="dictType" label="目录类型" rules={[{ required: true, message: '请选择目录类型' }]}>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              disabled={!isCreate}
              options={[
                { value: 'plane', label: '平面结构数据' },
                { value: 'tree', label: '树状结构数据' },
              ]}
              onChange={(event) => setDictType(event.target.value)}
            />
          </Form.Item>
          <Form.Item label="目录内容" required />
        </Form>

        <div className="legacy-edit-table">
          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={rows}
            expandable={{
              defaultExpandAllRows: true,
              rowExpandable: (record) => Boolean(record.children?.length),
              expandIcon: ({ expanded, onExpand, record }) => {
                if (!record.children?.length) return <span className="directory-expand-placeholder" />;
                return (
                  <button
                    type="button"
                    className="directory-expand-button"
                    onClick={(event) => onExpand(record, event)}
                  >
                    {expanded ? '-' : '+'}
                  </button>
                );
              },
            }}
            pagination={false}
          />
          <Button block type="dashed" icon={<PlusOutlined />} className="legacy-add-row" onClick={() => addRow()}>
            新增一行
          </Button>
        </div>

        <Space className="legacy-form-actions">
          <Button icon={<ReloadOutlined />} onClick={load}>重置</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={submit}>提交</Button>
        </Space>
      </div>
    </PageHeader>
  );
}
