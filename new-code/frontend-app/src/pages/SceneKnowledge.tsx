import {
  DownloadOutlined,
  HistoryOutlined,
  ImportOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Button, Card, DatePicker, Form, Image, Input, Modal, Popconfirm, Radio, Space, Table, Tag, Tree, Typography, Upload, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import AccessLogTable from '@/components/AccessLogTable';
import PageHeader from '@/components/PageHeader';
import { authApi, businessApi, fileApi } from '@/services/api';
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

function fileUrl(url?: string) {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  if (url.startsWith('/api/data/')) return url.slice(4);
  if (url.startsWith('/data/')) return url;
  if (url.startsWith('/')) return url;
  return `/data/${url}`;
}

function fileName(url?: string) {
  if (!url) return '附件';
  const clean = url.split('?')[0];
  return decodeURIComponent(clean.split('/').filter(Boolean).pop() || '附件');
}

function normalizeFiles(raw: any) {
  return (raw?.sceneItemValue || [])
    .map((item: any) => {
      if (typeof item === 'object' && item) {
        const path = item.filePath || item.file_path || item.url || item.path || item.response?.filePath;
        return { url: fileUrl(path), name: item.fileName || item.filename || item.name || fileName(path) };
      }
      return { url: fileUrl(String(item)), name: fileName(String(item)) };
    })
    .filter((item: any) => item.url);
}

function renderListValue(raw: any, item: any, dictDetails: any[]) {
  if (item.type === 'tag') {
    const values = (raw?.sceneItemValue || []).filter(Boolean);
    if (!values.length) return '--';
    return (
      <Space size={[0, 4]} wrap className="knowledge-list-tags">
        {values.slice(0, 4).map((value: string) => (
          <Tag key={value}>{value}</Tag>
        ))}
        {values.length > 4 ? <Typography.Text type="secondary">+{values.length - 4}</Typography.Text> : null}
      </Space>
    );
  }
  const files = ['picture', 'video', 'audio', 'file'].includes(item.type || '') ? normalizeFiles(raw) : [];
  if (!files.length) {
    return displayKnowledgeValue(raw, item, dictDetails);
  }
  if (item.type === 'picture') {
    return (
      <Image.PreviewGroup>
        <div className="knowledge-list-media">
          {files.slice(0, 3).map((file: any) => (
            <Image key={file.url} src={file.url} alt={file.name} width={52} height={38} className="knowledge-list-image" />
          ))}
          {files.length > 3 ? <span>+{files.length - 3}</span> : null}
        </div>
      </Image.PreviewGroup>
    );
  }
  if (item.type === 'video') {
    return (
      <div className="knowledge-list-media">
        {files.slice(0, 2).map((file: any) => (
          <video key={file.url} src={file.url} controls preload="metadata" className="knowledge-list-video" />
        ))}
        {files.length > 2 ? <span>+{files.length - 2}</span> : null}
      </div>
    );
  }
  if (item.type === 'audio') {
    return <audio src={files[0].url} controls className="knowledge-list-audio" />;
  }
  return (
    <Space direction="vertical" size={2} className="knowledge-list-files">
      {files.slice(0, 2).map((file: any) => (
        <a key={file.url} href={file.url} target="_blank" rel="noreferrer">{file.name}</a>
      ))}
      {files.length > 2 ? <Typography.Text type="secondary">+{files.length - 2} 个附件</Typography.Text> : null}
    </Space>
  );
}

function formatDateRange(raw: any) {
  const dates = Array.isArray(raw) ? raw : [];
  const range = dates
    .map((date: any) => dayjs.isDayjs(date) ? date.format('YYYY-MM-DD HH:mm:ss') : String(date || ''))
    .filter(Boolean);
  return range.length ? range : undefined;
}

function restoreDateRange(raw: any) {
  if (!Array.isArray(raw)) return raw;
  return raw
    .map((date: any) => dayjs(date))
    .filter((date: any) => date.isValid());
}

function isBuiltinUpdateDateItem(item: any) {
  return /^(更新日期|更新时间)$/i.test(String(item?.sceneItemName || '').trim());
}

const logActionOptions = [
  { label: '新增', value: 'CREATE' },
  { label: '查看', value: 'VIEW' },
  { label: '修改', value: 'UPDATE' },
  { label: '删除', value: 'DELETE' },
];

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
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | undefined>();
  const [importResult, setImportResult] = useState<any>();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateType, setTemplateType] = useState<'normal' | 'directory'>('normal');
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [logAction, setLogAction] = useState<string | undefined>();

  const formatted = formatBusinessDetail(detail);
  const dictField =
    formatted.sceneItems.find((item: any) => item.type === 'dict' && item.isSupportSearch) ||
    formatted.sceneItems.find((item: any) => item.type === 'dict');
  const dictDetail = dictForSceneItem(dictField, formatted.dictDetails);
  const isTree = dictDetail?.dictTemplate?.dictType === 'tree';
  const nodes = dictNodes(dictField, formatted.dictDetails);
  const selectableDictIds = useMemo(
    () => new Set(nodes.filter((node: any) => !node.isDisabled).map((node: any) => String(node.id))),
    [nodes],
  );
  const treeData = useMemo(() => toAntTree(dictDetail?.treeDict?.treeDict || []), [dictDetail]);
  const visibleItems = formatted.sceneItems.filter((item: any) => !item.isHide);
  const directoryItems = visibleItems.filter((item: any) => item.type === 'dict');
  const hasRequiredDirectoryItem = directoryItems.some((item: any) => item.isRequired);
  const textItems = visibleItems.filter((item: any) => item.type !== 'dict');
  const tableScrollX = Math.max(1100, 450 + (dictField ? 220 : 0) + textItems.length * 200);
  const searchableItems = visibleItems.filter((item: any) => item.type !== 'dict' && item.isSupportSearch !== false);
  const dateSearchItems = searchableItems.filter((item: any) => item.type === 'datetime' && !isBuiltinUpdateDateItem(item));
  const keywordSearchItemIds = searchableItems
    .filter((item: any) => item.type !== 'datetime')
    .map((item: any) => item.id);
  const currentUser = authApi.getCurrentUser();
  const isAdmin = Boolean(currentUser?.isBuiltin || currentUser?.setting?.admin || currentUser?.roleIds?.includes?.(1));
  const operationPermissions = new Set(currentUser?.setting?.operationPermissions || currentUser?.operationPermissions || []);
  const hasPermission = (code: string) => isAdmin || operationPermissions.has(code);
  const canCreate = hasPermission('knowledge:create');
  const canUpdate = hasPermission('knowledge:update');
  const canDelete = hasPermission('knowledge:delete');
  const canImport = hasPermission('knowledge:import');
  const sceneName = formatted.scene.sceneName || '场景知识列表';
  const importSucceeded = Boolean(importResult && !importResult.failed);
  const importFailedRows = Array.isArray(importResult?.failedRows) ? importResult.failedRows : [];

  const getKnowledgeTitle = (record: any) =>
    knowledgeDisplayTitle(record, formatted.sceneItems, formatted.dictDetails);
  const pendingChangeText = (record: any) =>
    record.pendingChangeType === 'DELETE' ? '删除审批中' : '编辑审批中';

  const buildFieldFilters = (values: any = {}) =>
    dateSearchItems
      .map((item: any) => {
        const raw = values[`search_${item.id}`];
        const range = formatDateRange(raw);
        return range ? { sceneItemId: item.id, sceneItemValueRange: range } : null;
      })
      .filter(Boolean);

  const restoreSearchValues = (values: any = {}) => {
    const next = { ...values };
    next.searchUpdateTime = restoreDateRange(next.searchUpdateTime);
    dateSearchItems.forEach((item: any) => {
      const key = `search_${item.id}`;
      if (Array.isArray(next[key])) {
        next[key] = restoreDateRange(next[key]);
      }
    });
    return next;
  };

  const runList = async (dictId?: string, values: any = {}, nextPage = 1, nextPageSize = pageSize) => {
    const nextDictId = dictId && selectableDictIds.has(String(dictId)) ? String(dictId) : undefined;
    if (dictId && !nextDictId) {
      setSelectedDictId(undefined);
    }
    setPageNumber(nextPage);
    setPageSize(nextPageSize);
    writeListState(id, {
      selectedDictId: nextDictId,
      values,
      pageNumber: nextPage,
      pageSize: nextPageSize,
    });
    setListLoading(true);
    try {
      const searchKnowledgeItem = [
        ...(dictField && nextDictId ? [{ sceneItemId: dictField.id, sceneItemSelectDictIds: nextDictId }] : []),
        ...buildFieldFilters(values),
      ];
      const res = await businessApi.knowledgeList({
        sceneTemplateId: Number(id),
        pageNumber: nextPage,
        pageSize: nextPageSize,
        keyword: values.keyword,
        searchUpdateTime: formatDateRange(values.searchUpdateTime),
        searchSceneItemIds: values.keyword ? keywordSearchItemIds : undefined,
        searchKnowledgeItem: searchKnowledgeItem.length ? searchKnowledgeItem : undefined,
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
    const savedValues = restoreSearchValues(saved.values || {});
    const savedDictId = saved.selectedDictId && selectableDictIds.has(String(saved.selectedDictId))
      ? String(saved.selectedDictId)
      : undefined;
    form.setFieldsValue(savedValues);
    setSelectedDictId(savedDictId);
    runList(
      savedDictId,
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
      width: 200,
      ellipsis: true,
      render: (_: any, record: any) =>
        renderListValue(findKnowledgeItem(record, item.id), item, formatted.dictDetails),
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
          {record.hasPendingChange ? (
            <Button
              type="link"
              disabled
            >
              {pendingChangeText(record)}
            </Button>
          ) : canUpdate ? (
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
          {canDelete && !record.hasPendingChange ? (
            <Popconfirm
              title="确认删除这条知识？"
              okText="删除"
              cancelText="取消"
              disabled={record.hasPendingChange}
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

  const exportTemplate = async (includeDirectory = false) => {
    const result = await businessApi.exportTemplate(id, includeDirectory);
    if (result?.filePath) {
      window.location.href = `/api${result.filePath}`;
    } else {
      message.warning('暂无可下载模板');
    }
  };

  const confirmTemplateDownload = async () => {
    setTemplateDownloading(true);
    try {
      await exportTemplate(templateType === 'directory');
      setTemplateOpen(false);
    } finally {
      setTemplateDownloading(false);
    }
  };

  const requestTemplateDownload = async () => {
    if (!directoryItems.length) {
      await exportTemplate(false);
      return;
    }
    if (hasRequiredDirectoryItem) {
      await exportTemplate(true);
      return;
    }
    setTemplateType('normal');
    setTemplateOpen(true);
  };

  const runImport = async () => {
    if (!importFile) {
      message.warning('请先选择 Excel 文件');
      return;
    }
    setImporting(true);
    setImportResult(undefined);
    try {
      const uploaded = await fileApi.upload(importFile);
      const result = await businessApi.importData({
        sceneTemplateId: Number(id),
        filePath: uploaded.filePath || uploaded.file_path,
      });
      setImportResult(result || {});
      message.success(result?.message || '导入完成');
      runList(selectedDictId, form.getFieldsValue(), pageNumber, pageSize);
    } catch (error: any) {
      const msg = error?.message || '导入失败，请检查模板和文件内容';
      setImportResult({ failed: true, message: msg });
      message.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportOpen(false);
    setImporting(false);
    setImportFile(undefined);
    setImportResult(undefined);
  };
  const openCreateKnowledge = () => {
    const savedSelectedDictId = readListState(id).selectedDictId;
    const activeDictId = selectedDictId || (savedSelectedDictId ? String(savedSelectedDictId) : undefined);
    const params = new URLSearchParams();
    if (activeDictId) {
      params.set('defaultDictId', activeDictId);
      if (dictField?.id) {
        params.set('defaultDictFieldId', String(dictField.id));
      }
    }
    history.push({
      pathname: `/knowledge/scene/${id}/create`,
      search: params.toString() ? `?${params.toString()}` : '',
      state: {
        tabLabel: '新增知识',
        defaultDictId: activeDictId,
        defaultDictFieldId: dictField?.id,
      },
    });
  };
  const breadcrumb = `知识中心 / ${sceneName} / 知识列表`;

  return (
    <PageHeader
      title={sceneName}
      hideHeader
      breadcrumb={breadcrumb}
    >
      <div className="scene-knowledge-head">
        <div className="scene-knowledge-breadcrumb page-breadcrumb">{breadcrumb}</div>
        <Space className="scene-knowledge-actions" wrap>
          <Button onClick={() => history.push('/knowledge')}>返回知识中心</Button>
          {canCreate ? (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openCreateKnowledge}
            >
              新增知识
            </Button>
          ) : null}
          {canImport ? <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>批量导入</Button> : null}
        </Space>
      </div>

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
                  const key = keys[0] ? String(keys[0]) : selectedDictId;
                  if (!key) return;
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
                    disabled={node.isDisabled}
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
          <div className="knowledge-side-link-row">
            <Button type="link" icon={<HistoryOutlined />} onClick={() => setLogOpen(true)}>
              操作记录
            </Button>
          </div>
        </div>
        <div>
          <Card className="toolbar-card">
            <Form
              form={form}
              layout="inline"
              onFinish={(values) => runList(selectedDictId, values, 1, pageSize)}
            >
              {keywordSearchItemIds.length ? (
                <Form.Item name="keyword" label="关键词">
                  <Input allowClear placeholder="搜索文本、标签、附件名称" style={{ width: 320 }} />
                </Form.Item>
              ) : null}
              <Form.Item name="searchUpdateTime" label="更新日期">
                <DatePicker.RangePicker showTime style={{ width: 340 }} />
              </Form.Item>
              {dateSearchItems.map((item: any) => (
                <Form.Item key={item.id} name={`search_${item.id}`} label={item.sceneItemName}>
                  <DatePicker.RangePicker showTime style={{ width: 340 }} />
                </Form.Item>
              ))}
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
              scroll={{ x: tableScrollX }}
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
      <Modal
        open={importOpen}
        title={`${sceneName} 批量导入`}
        width={720}
        okText={importSucceeded ? '已导入' : '确认导入'}
        cancelText="关闭"
        confirmLoading={importing}
        okButtonProps={{ disabled: !importFile || importing || importSucceeded }}
        onOk={runImport}
        onCancel={resetImport}
      >
        <div className="knowledge-import-dialog">
          <Upload.Dragger
            maxCount={1}
            accept=".xlsx,.xls"
            disabled={importing}
            beforeUpload={(file) => {
              setImportFile(file);
              setImportResult(undefined);
              return false;
            }}
            onRemove={() => {
              setImportFile(undefined);
              setImportResult(undefined);
            }}
          >
            <p className="ant-upload-drag-icon"><UploadOutlined /></p>
            <p className="ant-upload-text">选择 Excel 文件</p>
            <p className="ant-upload-hint">选择后不会自动导入，请确认文件无误后点击“确认导入”。</p>
          </Upload.Dragger>

          <div className="knowledge-import-actions">
            <Button icon={<DownloadOutlined />} onClick={requestTemplateDownload}>下载模板</Button>
          </div>

          {importResult ? (
            <div className="knowledge-import-result">
              <Alert
                type={importResult.failed ? 'error' : importResult.skippedRows > 0 ? 'warning' : 'success'}
                showIcon
                message={importResult.message || '导入完成'}
              />
              {!importResult.failed ? (
                <>
                  <div className="knowledge-import-metrics">
                    <span>读取 {importResult.totalRows ?? 0} 行</span>
                    <span>导入 {importResult.importedRows ?? 0} 条</span>
                    <span>审批 {importResult.pendingRows ?? 0} 条</span>
                    <span>跳过 {importResult.skippedRows ?? 0} 行</span>
                  </div>
                  {Array.isArray(importResult.warnings) && importResult.warnings.length ? (
                    <div className="knowledge-import-warning-list">
                      <Typography.Text strong>未成功行明细</Typography.Text>
                      <ul>
                        {importFailedRows.length
                          ? importFailedRows.slice(0, 20).map((item: any, index: number) => (
                              <li key={`${item.rowNumber}-${item.fieldName}-${index}`}>
                                第 {item.rowNumber} 行，{item.fieldName}：{item.reason}
                                {item.originalValue ? `（原值：${item.originalValue}）` : ''}
                              </li>
                            ))
                          : importResult.warnings.map((warning: string, index: number) => (
                              <li key={`${warning}-${index}`}>{warning}</li>
                            ))}
                      </ul>
                    </div>
                  ) : null}
                  <Typography.Text type="secondary">
                    本文件已处理完成。如需再次导入，请先移除当前文件并重新选择。
                  </Typography.Text>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </Modal>
      <Modal
        open={templateOpen}
        title="选择导入模板"
        okText="下载"
        cancelText="取消"
        confirmLoading={templateDownloading}
        onOk={confirmTemplateDownload}
        onCancel={() => setTemplateOpen(false)}
      >
        <Radio.Group
          value={templateType}
          onChange={(event) => setTemplateType(event.target.value)}
        >
          <Space direction="vertical">
            <Radio value="normal">普通模板</Radio>
            <Radio value="directory">带目录模板</Radio>
          </Space>
        </Radio.Group>
      </Modal>
      <Modal
        open={logOpen}
        title={`${sceneName} 操作记录`}
        width={1040}
        footer={null}
        destroyOnClose
        onCancel={() => setLogOpen(false)}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space>
            <Typography.Text type="secondary">操作类型</Typography.Text>
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              value={logAction || ''}
              onChange={(event) => setLogAction(event.target.value || undefined)}
              options={[{ label: '全部', value: '' }, ...logActionOptions]}
            />
          </Space>
          <AccessLogTable
            active={logOpen}
            showBiz
            showUser
            refreshKey={logAction || 'all'}
            fetcher={(params) => businessApi.sceneKnowledgeLogs(id, { ...params, action: logAction })}
          />
        </Space>
      </Modal>
    </PageHeader>
  );
}
