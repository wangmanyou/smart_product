import {
  DownloadOutlined,
  ImportOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Card, Form, Input, Popconfirm, Space, Table, Tree, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { authApi, businessApi } from '@/services/api';
import {
  dictForSceneItem,
  dictNodes,
  displayKnowledgeValue,
  findKnowledgeItem,
  formatBusinessDetail,
  formatTime,
  knowledgeDisplayTitle,
  setWorkTabLabel,
  toAntTree,
} from '@/utils/data';

function readListState(sceneId: string) {
  try {
    const value = sessionStorage.getItem(`scene-knowledge-list-state:${sceneId}`);
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function writeListState(sceneId: string, state: Record<string, any>) {
  sessionStorage.setItem(`scene-knowledge-list-state:${sceneId}`, JSON.stringify(state));
}

export default function SceneKnowledge() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [form] = Form.useForm();
  const [selectedDictId, setSelectedDictId] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [detail, setDetail] = useState<any>();
  const [knowledgeRows, setKnowledgeRows] = useState<any[]>([]);
  const [knowledgeTotal, setKnowledgeTotal] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatted = formatBusinessDetail(detail);
  const dictField =
    formatted.sceneItems.find((item: any) => item.type === 'dict' && item.isSupportSearch) ||
    formatted.sceneItems.find((item: any) => item.type === 'dict');
  const dictDetail = dictForSceneItem(dictField, formatted.dictDetails);
  const isTree = dictDetail?.dictTemplate?.dictType === 'tree';
  const nodes = dictNodes(dictField, formatted.dictDetails);
  const treeData = useMemo(() => toAntTree(dictDetail?.treeDict?.treeDict || []), [dictDetail]);
  const visibleItems = formatted.sceneItems.filter((item: any) => !item.isHide);
  const textItems = visibleItems.filter((item: any) => item.type !== 'dict').slice(0, 4);
  const currentUser = authApi.getCurrentUser();
  const isAdmin = Boolean(currentUser?.isBuiltin || currentUser?.roleId === 1 || currentUser?.roleIds?.includes?.(1));
  const operationPermissions = new Set(currentUser?.setting?.operationPermissions || currentUser?.operationPermissions || []);
  const hasPermission = (code: string) => isAdmin || operationPermissions.has(code);
  const canCreate = hasPermission('knowledge:create');
  const canUpdate = hasPermission('knowledge:update');
  const canDelete = hasPermission('knowledge:delete');
  const canImport = hasPermission('knowledge:import');
  const sceneName = formatted.scene.sceneName || '场景知识列表';

  const getKnowledgeTitle = (record: any) =>
    knowledgeDisplayTitle(record, formatted.sceneItems, formatted.dictDetails);

  const runList = async (dictId?: string, values: any = {}, nextPage = 1, nextPageSize = pageSize) => {
    setPageNumber(nextPage);
    setPageSize(nextPageSize);
    writeListState(id, {
      selectedDictId: dictId,
      values,
      pageNumber: nextPage,
      pageSize: nextPageSize,
    });
    setListLoading(true);
    try {
      const searchKnowledgeItem =
        dictField && dictId
          ? [{ sceneItemId: dictField.id, sceneItemSelectDictIds: String(dictId) }]
          : undefined;
      const res = await businessApi.knowledgeList({
        sceneTemplateId: Number(id),
        pageNumber: nextPage,
        pageSize: nextPageSize,
        ...values,
        searchKnowledgeItem,
      });
      setKnowledgeRows(Array.isArray(res?.content) ? res.content : []);
      setKnowledgeTotal(Number(res?.totalElements || 0));
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setDetailLoading(true);
    businessApi
      .detail(id)
      .then((res) => {
        if (!mounted) return;
        setDetail(res);
        const nextSceneName = formatBusinessDetail(res).scene.sceneName || '场景';
        setWorkTabLabel(location.pathname, `${nextSceneName}知识列表`);
      })
      .finally(() => {
        if (mounted) setDetailLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!detail) return;
    const saved = readListState(id);
    const savedValues = saved.values || {};
    form.setFieldsValue(savedValues);
    setSelectedDictId(saved.selectedDictId);
    runList(
      saved.selectedDictId,
      savedValues,
      Number(saved.pageNumber || 1),
      Number(saved.pageSize || pageSize),
    );
  }, [detail]);

  const columns: ColumnsType<any> = [
    {
      title: '知识ID',
      dataIndex: 'knowledgeId',
      width: 100,
      fixed: 'left',
      render: (value, record) => (
        <Button
          type="link"
          onClick={() => history.push({
            pathname: `/knowledge/scene/${id}/detail/${value}`,
            state: { tabLabel: `${getKnowledgeTitle(record)}知识详情` },
          })}
        >
          {value}
        </Button>
      ),
    },
    ...(dictField
      ? [{
          title: dictField.sceneItemName,
          width: 220,
          render: (_: any, record: any) =>
            displayKnowledgeValue(findKnowledgeItem(record, dictField.id), dictField, formatted.dictDetails),
        }]
      : []),
    ...textItems.map((item: any) => ({
      title: item.sceneItemName,
      ellipsis: true,
      render: (_: any, record: any) =>
        displayKnowledgeValue(findKnowledgeItem(record, item.id), item, formatted.dictDetails),
    })),
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      width: 160,
      render: formatTime,
    },
    {
      title: '操作',
      width: 190,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() => history.push({
              pathname: `/knowledge/scene/${id}/detail/${record.knowledgeId}`,
              state: { tabLabel: `${getKnowledgeTitle(record)}知识详情` },
            })}
          >
            查看
          </Button>
          {canUpdate ? (
          <Button
            type="link"
            onClick={() => history.push({
              pathname: `/knowledge/scene/${id}/edit/${record.knowledgeId}`,
              state: { tabLabel: `${getKnowledgeTitle(record)}知识编辑` },
            })}
          >
            编辑
          </Button>
          ) : null}
          {canDelete ? (
            <Popconfirm
            title="确认删除这条知识？"
            okText="删除"
            cancelText="取消"
            onConfirm={async () => {
              await businessApi.deleteKnowledge(record.knowledgeId);
              message.success('已删除');
              runList(selectedDictId, form.getFieldsValue(), pageNumber, pageSize);
            }}
          >
            <Button type="link" danger>删除</Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  const exportTemplate = async () => {
    const result = await businessApi.exportTemplate(id);
    if (result?.filePath) {
      window.location.href = `/api${result.filePath}`;
    } else {
      message.warning('暂无可下载模板');
    }
  };

  return (
    <PageHeader
      title={sceneName}
      breadcrumb={`知识中心 / ${sceneName} / 知识列表`}
      extra={[
        <Button key="back" onClick={() => history.push('/knowledge')}>返回知识中心</Button>,
        canCreate ? <Button key="create" type="primary" icon={<PlusOutlined />} onClick={() => history.push({ pathname: `/knowledge/scene/${id}/create`, state: { tabLabel: '新增知识' } })}>新增知识</Button> : null,
        canImport ? <Button key="import" icon={<ImportOutlined />} onClick={() => history.push({ pathname: `/knowledge/scene/${id}/import`, state: { tabLabel: '批量导入' } })}>批量导入</Button> : null,
        <Button key="template" icon={<DownloadOutlined />} onClick={exportTemplate}>导出模板</Button>,
      ].filter(Boolean)}
    >
      <div className="knowledge-layout">
        <div>
          <Card
            loading={detailLoading}
            className="directory-tree-card"
            title={dictDetail?.dictTemplate?.dictName || '目录'}
            extra={<Button type="link" onClick={() => { setSelectedDictId(undefined); runList(undefined, form.getFieldsValue(), 1, pageSize); }}>全部</Button>}
          >
            {isTree ? (
              <Tree
                showLine
                defaultExpandAll
                selectedKeys={selectedDictId ? [selectedDictId] : []}
                treeData={treeData}
                onSelect={(keys) => {
                  const key = keys[0] ? String(keys[0]) : undefined;
                  setSelectedDictId(key);
                  runList(key, form.getFieldsValue(), 1, pageSize);
                }}
              />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {nodes.map((node: any) => (
                  <Button
                    block
                    key={node.id}
                    type={selectedDictId === String(node.id) ? 'primary' : 'default'}
                    onClick={() => {
                      const key = String(node.id);
                      setSelectedDictId(key);
                      runList(key, form.getFieldsValue(), 1, pageSize);
                    }}
                  >
                    {node.name}
                  </Button>
                ))}
                {!nodes.length ? <Typography.Text type="secondary">暂无目录项</Typography.Text> : null}
              </Space>
            )}
          </Card>
        </div>
        <div>
          <Card className="toolbar-card">
            <Form
              form={form}
              layout="inline"
              onFinish={(values) => runList(selectedDictId, values, 1, pageSize)}
            >
              <Form.Item name="keyword" label="关键词">
                <Input allowClear placeholder="搜索主题、内容、标签" style={{ width: 320 }} />
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
                  <Button onClick={() => { form.resetFields(); runList(selectedDictId, {}, 1, pageSize); }}>重置</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="knowledgeId"
              loading={detailLoading || listLoading}
              columns={columns}
              dataSource={knowledgeRows}
              scroll={{ x: 1100 }}
              pagination={{
                total: knowledgeTotal,
                current: pageNumber,
                pageSize,
                showTotal: (total) => `共 ${total} 条`,
                onChange: (nextPage, nextPageSize) =>
                  runList(selectedDictId, form.getFieldsValue(), nextPage, nextPageSize),
              }}
            />
          </Card>
        </div>
      </div>
    </PageHeader>
  );
}
