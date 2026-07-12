import {
  CheckOutlined,
  CloseOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  FileWordOutlined,
  RollbackOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { useLocation } from '@umijs/max';
import { Button, Card, Descriptions, Image, Modal, Radio, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Fragment, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { approvalApi, authApi, businessApi } from '@/services/api';
import {
  displayKnowledgeValue,
  formatBusinessDetail,
  formatTime,
  knowledgeDisplayTitle,
} from '@/utils/data';

const statusMap: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待审批', color: 'orange' },
  APPROVED: { text: '已通过', color: 'green' },
  REJECTED: { text: '已驳回', color: 'red' },
  WITHDRAWN: { text: '已撤回', color: 'default' },
};

const typeMap: Record<string, { text: string; color: string }> = {
  CREATE: { text: '新增知识', color: 'blue' },
  UPDATE: { text: '编辑知识', color: 'purple' },
  DELETE: { text: '删除知识', color: 'red' },
};

const requestTypes = ['CREATE', 'UPDATE', 'DELETE'];
const requestTypePermissionMap: Record<string, string> = {
  CREATE: 'knowledge:create',
  UPDATE: 'knowledge:update',
  DELETE: 'knowledge:delete',
};
const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'];

function sceneName(record: any, sceneMap: Record<string, any> = {}) {
  const scene = sceneMap[String(record.sceneTemplateId)];
  const formatted = scene ? formatBusinessDetail(scene) : undefined;
  return formatted?.scene?.sceneName || `场景 ${record.sceneTemplateId || '--'}`;
}

function payloadItems(record: any) {
  const source = record.requestType === 'UPDATE'
    ? record.payload?.knowledgeItem
    : record.payload?.knowledge;
  return Array.isArray(source) ? source : [];
}

function beforeItems(record: any) {
  return Array.isArray(record.before?.knowledgeShow) ? record.before.knowledgeShow : [];
}

function normalizeItem(item: any, sceneItems: any[]) {
  if (!item) return item;
  const sceneItemId = item.sceneItemId || item.id;
  const sceneItem = sceneItems.find((row: any) => String(row.id) === String(sceneItemId));
  return {
    ...item,
    sceneItemId,
    sceneItemName: item.sceneItemName || sceneItem?.sceneItemName,
    type: item.type || item.sceneItemType || sceneItem?.type,
  };
}

function fieldName(item: any, sceneItems: any[]) {
  const normalized = normalizeItem(item, sceneItems);
  return normalized?.sceneItemName || normalized?.name || `字段 ${normalized?.sceneItemId || normalized?.id || ''}`;
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

function normalizeFiles(item: any) {
  const values = Array.isArray(item?.sceneItemValue) ? item.sceneItemValue : [];
  return values
    .map((value: any) => {
      if (typeof value === 'object' && value) {
        const path = value.filePath || value.file_path || value.url || value.path || value.response?.filePath;
        return { url: fileUrl(path), name: value.fileName || value.filename || value.name || fileName(path) };
      }
      return { url: fileUrl(String(value)), name: fileName(String(value)) };
    })
    .filter((file: any) => file.url);
}

function mediaKind(file: any, fieldType?: string) {
  const source = `${file?.name || ''} ${file?.url || ''}`.toLowerCase();
  if (fieldType === 'picture' || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(source)) return 'picture';
  if (fieldType === 'video' || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(source)) return 'video';
  if (fieldType === 'audio' || /\.(mp3|wav|ogg|aac|m4a|flac)(\?|$)/i.test(source)) return 'audio';
  return 'file';
}

function renderApprovalValue(item: any, sceneItems: any[] = [], dictDetails: any[] = []) {
  const normalized = normalizeItem(item, sceneItems);
  const sceneItem = sceneItems.find((row: any) => String(row.id) === String(normalized?.sceneItemId));
  const type = normalized?.type || sceneItem?.type;
  if (['picture', 'video', 'audio', 'file'].includes(type || '')) {
    const files = normalizeFiles(normalized);
    if (!files.length) return <Typography.Text type="secondary">--</Typography.Text>;
    const pictures = files.filter((file: any) => mediaKind(file, type) === 'picture');
    const videos = files.filter((file: any) => mediaKind(file, type) === 'video');
    const audios = files.filter((file: any) => mediaKind(file, type) === 'audio');
    const others = files.filter((file: any) => mediaKind(file, type) === 'file');
    if (pictures.length && !videos.length && !audios.length && !others.length) {
      return (
        <Image.PreviewGroup>
          <div className="knowledge-media-grid approval-media-grid">
            {pictures.map((file: any) => <Image key={file.url} className="knowledge-image-thumb" width={132} height={96} src={file.url} alt={file.name} />)}
          </div>
        </Image.PreviewGroup>
      );
    }
    if (videos.length && !pictures.length && !audios.length && !others.length) {
      return (
        <div className="knowledge-media-grid">
          {videos.map((file: any) => (
            <div className="knowledge-video-box" key={file.url}>
              <video src={file.url} controls preload="metadata" />
              <div className="knowledge-file-title"><VideoCameraOutlined /> {file.name}</div>
            </div>
          ))}
        </div>
      );
    }
    if (audios.length && !pictures.length && !videos.length && !others.length) {
      return (
        <Space direction="vertical" style={{ width: '100%' }}>
          {audios.map((file: any) => (
            <audio key={file.url} src={file.url} controls style={{ width: '100%' }} />
          ))}
        </Space>
      );
    }
    return (
      <div className="approval-mixed-files">
        {pictures.length ? (
          <Image.PreviewGroup>
            <div className="knowledge-media-grid approval-media-grid">
              {pictures.map((file: any) => <Image key={file.url} className="knowledge-image-thumb" width={132} height={96} src={file.url} alt={file.name} />)}
            </div>
          </Image.PreviewGroup>
        ) : null}
        {videos.map((file: any) => (
          <div className="knowledge-video-box" key={file.url}>
            <video src={file.url} controls preload="metadata" />
            <div className="knowledge-file-title"><VideoCameraOutlined /> {file.name}</div>
          </div>
        ))}
        {audios.map((file: any) => <audio key={file.url} src={file.url} controls style={{ width: '100%' }} />)}
        {others.length ? <div className="knowledge-file-list">
          {others.map((file: any) => {
          const isWord = /\.(doc|docx)$/i.test(file.name);
          return (
            <a className="knowledge-file-card" key={file.url} href={file.url} target="_blank" rel="noreferrer">
              {isWord ? <FileWordOutlined /> : <FileOutlined />}
              <span>{file.name}</span>
              <DownloadOutlined />
            </a>
          );
          })}
        </div> : null}
      </div>
    );
  }
  if (sceneItem) {
    const value = displayKnowledgeValue(normalized, sceneItem, dictDetails);
    return <Typography.Paragraph className="knowledge-text-value">{value || '--'}</Typography.Paragraph>;
  }
  const value = normalized?.sceneItemValue;
  if (Array.isArray(value) && value.length) return <Typography.Paragraph className="knowledge-text-value">{value.join('，')}</Typography.Paragraph>;
  if (normalized?.sceneItemSelectDictTreeIds) return <Typography.Paragraph className="knowledge-text-value">{String(normalized.sceneItemSelectDictTreeIds)}</Typography.Paragraph>;
  return <Typography.Text type="secondary">--</Typography.Text>;
}

function plainValue(item: any, sceneItems: any[] = [], dictDetails: any[] = []) {
  const normalized = normalizeItem(item, sceneItems);
  const sceneItem = sceneItems.find((row: any) => String(row.id) === String(normalized?.sceneItemId));
  if (sceneItem) return displayKnowledgeValue(normalized, sceneItem, dictDetails);
  const value = normalized?.sceneItemValue;
  if (Array.isArray(value) && value.length) return value.join('，');
  return normalized?.sceneItemSelectDictTreeIds || '--';
}

function requestTitle(record: any, sceneMap: Record<string, any> = {}) {
  const scene = sceneMap[String(record.sceneTemplateId)];
  const formatted = scene ? formatBusinessDetail(scene) : { sceneItems: [], dictDetails: [] };
  const items = record.requestType === 'DELETE' ? beforeItems(record) : payloadItems(record);
  if (formatted.sceneItems.length) {
    const knowledge = { knowledgeId: record.knowledgeId, knowledgeShow: items.map((item: any) => normalizeItem(item, formatted.sceneItems)) };
    return knowledgeDisplayTitle(knowledge, formatted.sceneItems, formatted.dictDetails);
  }
  return `${typeMap[record.requestType]?.text || '知识申请'} #${record.knowledgeId || record.changeRequestId}`;
}

function ChangePreview({ record, sceneMap }: { record: any; sceneMap: Record<string, any> }) {
  const scene = sceneMap[String(record.sceneTemplateId)];
  const formatted = scene ? formatBusinessDetail(scene) : { sceneItems: [], dictDetails: [] };
  const nextItems = payloadItems(record).map((item: any) => normalizeItem(item, formatted.sceneItems));
  const oldItems = beforeItems(record).map((item: any) => normalizeItem(item, formatted.sceneItems));
  const rows = record.requestType === 'DELETE' ? oldItems : nextItems;
  const directoryItem = rows.find((item: any) => normalizeItem(item, formatted.sceneItems)?.type === 'dict');
  const contentItems = rows.filter((item: any) => normalizeItem(item, formatted.sceneItems)?.type !== 'dict');

  return (
    <div className="approval-document-preview">
      <header className="knowledge-article-header approval-document-header">
        {directoryItem ? <div className="knowledge-directory-pill">{plainValue(directoryItem, formatted.sceneItems, formatted.dictDetails)}</div> : null}
        <Typography.Title level={2}>{requestTitle(record, sceneMap)}</Typography.Title>
        <div className="knowledge-article-meta">
          <span>申请类型：{typeMap[record.requestType]?.text || record.requestType}</span>
          <span>状态：{statusMap[record.status]?.text || record.status}</span>
          <span>场景：{sceneName(record, sceneMap)}</span>
          <span>知识ID：{record.knowledgeId || '--'}</span>
          <span>申请人：{record.applicantName || '--'}</span>
          <span>申请时间：{formatTime(record.createTime)}</span>
        </div>
      </header>

      {record.requestType === 'UPDATE' ? (
        <div className="approval-change-list">
          {nextItems.map((item: any) => {
            const before = oldItems.find((row: any) => String(row.sceneItemId) === String(item.sceneItemId));
            return (
              <section className="approval-change-section" key={item.sceneItemId}>
                <Typography.Title level={4}>{fieldName(item, formatted.sceneItems)}</Typography.Title>
                <div className="approval-change-grid">
                  <div>
                    <span>变更前</span>
                    {renderApprovalValue(before, formatted.sceneItems, formatted.dictDetails)}
                  </div>
                  <div>
                    <span>变更后</span>
                    {renderApprovalValue(item, formatted.sceneItems, formatted.dictDetails)}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="knowledge-article-body">
          {contentItems.map((item: any) => (
            <section className="knowledge-article-section" key={item.sceneItemId}>
              <Typography.Title level={4}>{fieldName(item, formatted.sceneItems)}</Typography.Title>
              {renderApprovalValue(item, formatted.sceneItems, formatted.dictDetails)}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChangeApprovals() {
  const location = useLocation();
  const query = useMemo(
    () => new URLSearchParams(location.search || window.location.hash.split('?')[1] || window.location.search),
    [location.search],
  );
  const user = authApi.getCurrentUser();
  const isAdmin = Boolean(user?.isBuiltin || user?.setting?.admin || user?.roleIds?.includes?.(1));
  const actions = new Set(user?.setting?.operationPermissions || user?.operationPermissions || []);
  const canReview =
    isAdmin ||
    actions.has('system:approval:manage') ||
    actions.has('knowledge:change-request:view-all') ||
    actions.has('knowledge:change-request:approve') ||
    actions.has('knowledge:change-request:reject');
  const canApprove = isAdmin || actions.has('system:approval:manage') || actions.has('knowledge:change-request:approve');
  const canReject = isAdmin || actions.has('system:approval:manage') || actions.has('knowledge:change-request:reject');
  const hasOwnApprovals = Object.values(user?.setting?.approvalRequired || {}).some(Boolean);
  const canViewOwn = !isAdmin && (actions.has('knowledge:change-request:view-own') || hasOwnApprovals);
  const ownApprovalRequired = user?.setting?.approvalRequired || {};
  const pageTitle = canReview ? '审批管理' : '审批中心';
  const initialScope = query.get('tab') === 'mine' && canViewOwn ? 'mine' : canReview ? 'all' : 'mine';
  const initialStatus = allowedStatuses.includes(query.get('status') || '') ? query.get('status') || 'PENDING' : 'PENDING';
  const focusChangeRequestId = query.get('changeRequestId');
  const [scope, setScope] = useState(initialScope);
  const [status, setStatus] = useState(initialStatus);
  const [requestType, setRequestType] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [sceneMap, setSceneMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const nextScope = query.get('tab') === 'mine' && canViewOwn ? 'mine' : canReview ? 'all' : 'mine';
    const nextStatus = allowedStatuses.includes(query.get('status') || '') ? query.get('status') || 'PENDING' : 'PENDING';
    setScope(nextScope);
    setStatus(nextStatus);
    setRequestType('ALL');
    setSelectedRowKeys([]);
  }, [location.search, canReview, canViewOwn]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: total, CREATE: 0, UPDATE: 0, DELETE: 0 };
    rows.forEach((row) => {
      counts[row.requestType] = (counts[row.requestType] || 0) + 1;
    });
    return counts;
  }, [rows, total]);

  const visibleRequestTypes = useMemo(() => {
    const typesWithRows = new Set(rows.map((row) => row.requestType));
    return requestTypes.filter((type) => {
      if (typesWithRows.has(type)) return true;
      if (scope !== 'mine' || !hasOwnApprovals) return false;
      return Boolean(ownApprovalRequired[requestTypePermissionMap[type]]);
    });
  }, [rows, scope, hasOwnApprovals, ownApprovalRequired]);

  const visibleRows = useMemo(
    () => requestType === 'ALL' ? rows : rows.filter((row) => row.requestType === requestType),
    [rows, requestType],
  );
  const showTypePanel = visibleRequestTypes.length > 1;
  const paginationTotal = requestType === 'ALL' ? total : visibleRows.length;

  const load = async () => {
    setLoading(true);
    try {
      const api = scope === 'all' ? approvalApi.list : approvalApi.mine;
      const res = await api({ status, pageNumber: 1, pageSize: 100 });
      const content = res?.content || [];
      setRows(content);
      setSelectedRowKeys([]);
      setTotal(Number(res?.totalElements || 0));
      if (focusChangeRequestId) {
        const focused = content.find((row: any) => String(row.changeRequestId) === String(focusChangeRequestId));
        if (focused) {
          setPreview(focused);
        }
      }
      const sceneIds = Array.from(new Set(content.map((row: any) => row.sceneTemplateId).filter(Boolean).map(String)));
      const missing = sceneIds.filter((sceneId) => !sceneMap[sceneId]);
      if (missing.length) {
        const details = await Promise.all(missing.map((sceneId) => businessApi.detail(sceneId).catch(() => undefined)));
        setSceneMap((prev) => {
          const next = { ...prev };
          missing.forEach((sceneId, index) => {
            if (details[index]) next[sceneId] = details[index];
          });
          return next;
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scope === 'all' && !canReview) {
      setScope('mine');
      return;
    }
    if (scope === 'mine' && !canViewOwn && canReview) {
      setScope('all');
      return;
    }
    load();
  }, [scope, status, focusChangeRequestId, canReview, canViewOwn]);

  useEffect(() => {
    if (requestType !== 'ALL' && !visibleRequestTypes.includes(requestType)) {
      setRequestType('ALL');
      setSelectedRowKeys([]);
    }
  }, [requestType, visibleRequestTypes]);

  const review = (record: any, approved: boolean) => {
    Modal.confirm({
      title: approved ? '确认通过申请？' : '确认驳回申请？',
      content: approved ? '通过后，申请内容会写入正式知识库。' : '驳回后，申请人可在申请记录中查看状态。',
      okText: approved ? '通过' : '驳回',
      okButtonProps: { danger: !approved },
      onOk: async () => {
        if (approved) {
          await approvalApi.approve({ changeRequestId: record.changeRequestId });
        } else {
          await approvalApi.reject({ changeRequestId: record.changeRequestId });
        }
        message.success(approved ? '已通过' : '已驳回');
        setPreview(null);
        load();
      },
    });
  };

  const bulkReview = (approved: boolean) => {
    const selected = selectedRowKeys.length
      ? visibleRows.filter((row) => selectedRowKeys.includes(row.changeRequestId))
      : [];
    const targets = (selected.length ? selected : visibleRows)
      .filter((row) => row.status === 'PENDING' && (approved ? row.canApprove : row.canReject));
    if (!targets.length) {
      message.info(selectedRowKeys.length ? '已选内容里没有待审批申请' : '当前分类下没有待审批申请');
      return;
    }
    Modal.confirm({
      title: approved ? `确认通过 ${targets.length} 条申请？` : `确认驳回 ${targets.length} 条申请？`,
      content: approved ? '批量通过后，所有申请内容会写入正式知识库。' : '批量驳回后，申请人可在申请记录中查看状态。',
      okText: approved ? '一键通过' : '一键驳回',
      okButtonProps: { danger: !approved },
      onOk: async () => {
        await Promise.all(targets.map((row) =>
          approved
            ? approvalApi.approve({ changeRequestId: row.changeRequestId })
            : approvalApi.reject({ changeRequestId: row.changeRequestId }),
        ));
        message.success(approved ? '已批量通过' : '已批量驳回');
        setSelectedRowKeys([]);
        load();
      },
    });
  };

  const batchCount = selectedRowKeys.length
    ? visibleRows.filter((row) => selectedRowKeys.includes(row.changeRequestId) && row.status === 'PENDING').length
    : visibleRows.filter((row) => row.status === 'PENDING').length;
  const approveBatchCount = (selectedRowKeys.length
    ? visibleRows.filter((row) => selectedRowKeys.includes(row.changeRequestId))
    : visibleRows).filter((row) => row.status === 'PENDING' && row.canApprove).length;
  const rejectBatchCount = (selectedRowKeys.length
    ? visibleRows.filter((row) => selectedRowKeys.includes(row.changeRequestId))
    : visibleRows).filter((row) => row.status === 'PENDING' && row.canReject).length;

  const columns: ColumnsType<any> = [
    {
      title: '申请类型',
      width: 130,
      render: (_, record) => <Tag color={typeMap[record.requestType]?.color}>{typeMap[record.requestType]?.text || record.requestType}</Tag>,
    },
    { title: '状态', width: 110, render: (_, record) => <Tag color={statusMap[record.status]?.color}>{statusMap[record.status]?.text || record.status}</Tag> },
    {
      title: '知识内容',
      render: (_, record) => (
        <div className="approval-row-main">
          <strong>{requestTitle(record, sceneMap)}</strong>
          <span>{typeMap[record.requestType]?.text || record.requestType}</span>
        </div>
      ),
    },
    { title: '场景', width: 180, render: (_, record) => sceneName(record, sceneMap) },
    { title: '知识ID', width: 100, render: (_, record) => record.knowledgeId || '--' },
    { title: '申请人', width: 140, dataIndex: 'applicantName' },
    {
      title: '处理人',
      width: 140,
      dataIndex: 'reviewerName',
      render: (value, record) => value || (record.status === 'PENDING' ? '待处理' : '--'),
    },
    { title: '申请时间', width: 160, render: (_, record) => formatTime(record.createTime) },
    {
      title: '操作',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setPreview(record)}>查看</Button>
          {record.status === 'PENDING' && scope === 'all' ? (
            <>
              {record.canApprove ? <Button type="link" icon={<CheckOutlined />} onClick={() => review(record, true)}>通过</Button> : null}
              {record.canReject ? <Button type="link" danger icon={<CloseOutlined />} onClick={() => review(record, false)}>驳回</Button> : null}
            </>
          ) : null}
          {record.status === 'PENDING' && scope === 'mine' ? (
            <Button
              type="link"
              icon={<RollbackOutlined />}
              onClick={async () => {
                await approvalApi.withdraw(record.changeRequestId);
                message.success('已撤回');
                load();
              }}
            >
              撤回
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <PageHeader
      title={pageTitle}
      hideTitle
      breadcrumb={`系统管理 / ${pageTitle}`}
      description={canReview ? '按变更类型审核知识新增、编辑和删除申请。' : '查看自己提交的知识变更申请。'}
      extra={
        <Space wrap>
          {canReview && canViewOwn ? (
            <Radio.Group
              value={scope}
              onChange={(event) => {
                setScope(event.target.value);
                setSelectedRowKeys([]);
              }}
            >
              <Radio.Button value="all">审批处理</Radio.Button>
              <Radio.Button value="mine">我的申请</Radio.Button>
            </Radio.Group>
          ) : null}
          <Radio.Group
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSelectedRowKeys([]);
            }}
          >
            <Radio.Button value="PENDING">待审批</Radio.Button>
            <Radio.Button value="APPROVED">已通过</Radio.Button>
            <Radio.Button value="REJECTED">已驳回</Radio.Button>
            <Radio.Button value="WITHDRAWN">已撤回</Radio.Button>
          </Radio.Group>
        </Space>
      }
    >
      <div className={`approval-page-layout ${showTypePanel ? '' : 'is-single-type'}`}>
        {showTypePanel ? (
          <aside className="approval-type-panel">
            <button
              type="button"
              className={requestType === 'ALL' ? 'is-active' : ''}
              onClick={() => {
                setRequestType('ALL');
                setSelectedRowKeys([]);
              }}
            >
              <span>全部类型</span>
              <em>{typeCounts.ALL}</em>
            </button>
            {visibleRequestTypes.map((type) => (
              <button
                type="button"
                key={type}
                className={requestType === type ? 'is-active' : ''}
                onClick={() => {
                  setRequestType(type);
                  setSelectedRowKeys([]);
                }}
              >
                <span>{typeMap[type].text.replace('知识', '')}</span>
                <em>{typeCounts[type] || 0}</em>
              </button>
            ))}
          </aside>
        ) : null}

        <div className="approval-table-area">
          <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="changeRequestId"
              loading={loading}
              columns={columns}
              dataSource={visibleRows}
              rowSelection={scope === 'all' && status === 'PENDING' && (canApprove || canReject) ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as any[]),
                getCheckboxProps: (record) => ({ disabled: record.status !== 'PENDING' || (!record.canApprove && !record.canReject) }),
              } : undefined}
              pagination={{ total: paginationTotal, pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
            />
          </Card>

          {scope === 'all' && status === 'PENDING' && (canApprove || canReject) ? (
            <div className="approval-bulk-bar">
              <span>{selectedRowKeys.length ? `已选择 ${batchCount} 条待审批` : `当前分类 ${batchCount} 条待审批`}</span>
              <Space>
                {canApprove ? <Button disabled={!approveBatchCount} icon={<CheckOutlined />} onClick={() => bulkReview(true)}>
                  {selectedRowKeys.length ? '通过已选' : '通过当前分类'}
                </Button> : null}
                {canReject ? <Button disabled={!rejectBatchCount} danger icon={<CloseOutlined />} onClick={() => bulkReview(false)}>
                  {selectedRowKeys.length ? '驳回已选' : '驳回当前分类'}
                </Button> : null}
              </Space>
            </div>
          ) : null}
        </div>
      </div>

      <Modal
        open={Boolean(preview)}
        title="审批预览"
        width={980}
        footer={preview?.status === 'PENDING' && scope === 'all' ? [
          preview.canReject ? <Button key="reject" danger icon={<CloseOutlined />} onClick={() => review(preview, false)}>驳回</Button> : null,
          preview.canApprove ? <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={() => review(preview, true)}>通过</Button> : null,
        ].filter(Boolean) : null}
        onCancel={() => setPreview(null)}
      >
        {preview ? <ChangePreview record={preview} sceneMap={sceneMap} /> : null}
      </Modal>
    </PageHeader>
  );
}
