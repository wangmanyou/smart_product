import { ArrowDownOutlined, ArrowUpOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Form, Input, message, Popconfirm, Radio, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { dictApi } from '@/services/api';
import { buildWorkTabLabel, setWorkTabLabel } from '@/utils/data';
import { useUnsavedChanges } from '@/utils/unsavedChanges';

type DirectoryRow = {
  id: number | string;
  name: string;
  level?: number;
  parentId?: number | string;
  children?: DirectoryRow[];
  isDisabled?: boolean;
  isUsed?: boolean;
  isNew?: boolean;
  sortNumber?: number;
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

function isTemporaryId(id: DirectoryRow['id']) {
  return typeof id === 'string' && id.startsWith('new-');
}

function isPersistedRow(row: DirectoryRow) {
  return !row.isNew && !isTemporaryId(row.id);
}

function moveInList(nodes: DirectoryRow[], rowId: DirectoryRow['id'], direction: -1 | 1) {
  const index = nodes.findIndex((node) => node.id === rowId);
  const targetIndex = index + direction;
  if (index < 0 || targetIndex < 0 || targetIndex >= nodes.length) {
    return { nodes, moved: false };
  }
  const next = [...nodes];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return { nodes: next, moved: true };
}

function moveTree(nodes: DirectoryRow[], rowId: DirectoryRow['id'], direction: -1 | 1): { nodes: DirectoryRow[]; moved: boolean } {
  const current = moveInList(nodes, rowId, direction);
  if (current.moved) return current;

  let moved = false;
  const next = nodes.map((node) => {
    if (moved || !node.children?.length) return node;
    const result = moveTree(node.children, rowId, direction);
    if (!result.moved) return node;
    moved = true;
    return { ...node, children: result.nodes };
  });
  return { nodes: next, moved };
}

function findRowPosition(
  nodes: DirectoryRow[],
  rowId: DirectoryRow['id'],
): { index: number; total: number; siblings: DirectoryRow[] } | null {
  const index = nodes.findIndex((node) => node.id === rowId);
  if (index >= 0) return { index, total: nodes.length, siblings: nodes };
  for (const node of nodes) {
    if (!node.children?.length) continue;
    const childPosition = findRowPosition(node.children, rowId);
    if (childPosition) return childPosition;
  }
  return null;
}

function collectSortGroups(nodes: DirectoryRow[] = [], groups: Array<Array<number | string>> = []) {
  if (nodes.length > 1 && nodes.every(isPersistedRow)) {
    groups.push(nodes.map((node) => node.id));
  }
  nodes.forEach((node) => collectSortGroups(node.children || [], groups));
  return groups;
}

function toSubmitTree(nodes: DirectoryRow[] = []): any[] {
  return nodes
    .filter((node) => node.name?.trim())
    .map((node, index) => ({
      name: node.name,
      isDisabled: node.isDisabled,
      sortNumber: index + 1,
      children: toSubmitTree(node.children || []),
    }));
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
  const [dirty, setDirty] = useState(false);
  const clearUnsaved = useUnsavedChanges(location.pathname, dirty);

  const load = async () => {
    if (isCreate) {
      form.setFieldsValue({ dictType: 'tree' });
      setDictType('tree');
      setRows([]);
      setEditingIds([]);
      setDirty(false);
      return;
    }
    setLoading(true);
    try {
      const res = await dictApi.detail(id);
      const template = res?.dictTemplate || {};
      const type = template.dictType === 'plane' ? 'plane' : 'tree';
      form.setFieldsValue({ dictName: template.dictName, dictType: type });
      if (template.dictName) {
        const tabLabel = buildWorkTabLabel('directory-edit', template.dictName);
        setWorkTabLabel(location.pathname, tabLabel);
        history.replace({
          pathname: location.pathname,
          state: { tabLabel },
        });
      }
      setDictType(type);
      setRows(type === 'tree' ? normalizeTree(res?.treeDict?.treeDict || []) : res?.planeDict?.planeDict || []);
      setEditingIds([]);
      setDirty(false);
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
    setDirty(true);
    setRows((prev) => (parent && dictType === 'tree' ? addChildTree(prev, parent.id, child) : [...prev, child]));
    setEditingIds((prev) => [...prev, child.id]);
  };

  const updateRow = (rowId: DirectoryRow['id'], patch: Partial<DirectoryRow>) => {
    setDirty(true);
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
    setDirty(true);
    setRows((prev) => (dictType === 'tree' ? removeTree(prev, row.id) : prev.filter((item) => item.id !== row.id)));
  };

  const canMoveRow = (row: DirectoryRow, direction: -1 | 1) => {
    const position = findRowPosition(rows, row.id);
    if (!position) return false;
    if (direction === -1 && position.index === 0) return false;
    if (direction === 1 && position.index === position.total - 1) return false;
    if (!isCreate && position.siblings.some((item) => !isPersistedRow(item))) return false;
    return true;
  };

  const moveRow = (row: DirectoryRow, direction: -1 | 1) => {
    setDirty(true);
    setRows((prev) => {
      if (dictType === 'tree') {
        return moveTree(prev, row.id, direction).nodes;
      }
      return moveInList(prev, row.id, direction).nodes;
    });
  };

  const persistSorts = async () => {
    const groups = collectSortGroups(rows);
    await Promise.all(
      groups.map((group) =>
        dictApi.sortDirectories({
          dictDirectoryIds: group.map((item) => Number(item)),
        }),
      ),
    );
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
              planeDict: { planeDict: normalizedRows.map((item, index) => ({ name: item.name, isDisabled: item.isDisabled, sortNumber: index + 1 })) },
            };
      const result = await dictApi.create(payload);
      message.success('目录已创建');
      clearUnsaved();
      history.replace({
        pathname: `/system/dicts/${result?.dictTemplateId}`,
        state: {
          tabLabel: buildWorkTabLabel('directory-detail', values.dictName),
          replacePath: location.pathname,
        },
      });
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
    await persistSorts();
    message.success('目录已保存');
    clearUnsaved();
    history.replace({
      pathname: `/system/dicts/${id}`,
      state: {
        tabLabel: buildWorkTabLabel('directory-detail', values.dictName),
        replacePath: location.pathname,
      },
    });
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
        width: 360,
        render: (_, record) => {
          const upDisabled = !canMoveRow(record, -1);
          const downDisabled = !canMoveRow(record, 1);
          return (
            <Space size={4}>
              <Button
                type="text"
                icon={<ArrowUpOutlined />}
                title="上移"
                aria-label="上移"
                disabled={upDisabled}
                onClick={() => moveRow(record, -1)}
              />
              <Button
                type="text"
                icon={<ArrowDownOutlined />}
                title="下移"
                aria-label="下移"
                disabled={downDisabled}
                onClick={() => moveRow(record, 1)}
              />
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
                <Button type="link" disabled={!isCreate && record.isNew} onClick={() => addRow(record)}>新增子集</Button>
              ) : null}
            </Space>
          );
        },
      },
    ],
    [dictType, rows, editingIds, isCreate],
  );
  const pageTitle = isCreate ? '创建目录' : '目录编辑';
  const breadcrumb = `系统管理 / 目录管理 / ${pageTitle}`;

  return (
    <PageHeader
      title={pageTitle}
      hideHeader
      breadcrumb={breadcrumb}
    >
      <div className="legacy-form-page directory-form-page">
        <div className="directory-form-head">
          <div className="directory-form-breadcrumb page-breadcrumb">{breadcrumb}</div>
        </div>

        <Form form={form} className="legacy-meta-form" labelCol={{ flex: '86px' }} wrapperCol={{ flex: 'auto' }} onValuesChange={() => setDirty(true)}>
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
              onChange={(event) => {
                setDirty(true);
                setDictType(event.target.value);
              }}
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
