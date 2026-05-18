import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import { Button, Card, Descriptions, Modal, Radio, Space, Table, Tag, Typography, message } from 'antd';
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
    type: item.type || sceneItem?.type,
  };
}

function itemValue(item: any, sceneItems: any[] = [], dictDetails: any[] = []) {
  const normalized = normalizeItem(item, sceneItems);
  const sceneItem = sceneItems.find((row: any) => String(row.id) === String(normalized?.sceneItemId));
  if (sceneItem) return displayKnowledgeValue(normalized, sceneItem, dictDetails);
  const value = normalized?.sceneItemValue;
  if (Array.isArray(value) && value.length) return value.join('，');
  if (normalized?.sceneItemSelectDictTreeIds) return String(normalized.sceneItemSelectDictTreeIds);
  return '--';
}

function requestTitle(record: any, sceneMap: Record<string, any> = {}) {
  const scene = sceneMap[String(record.sceneTemplateId)];
  const formatted = scene ? formatBusinessDetail(scene) : { sceneItems: [], dictDetails: [] };
  const items = record.requestType === 'DELETE' ? beforeItems(record) : payloadItems(record);
  if (formatted.sceneItems.length) {
    const knowledge = { knowledgeId: record.knowledgeId, knowledgeShow: items.map((item: any) => normalizeItem(item, formatted.sceneItems)) };
    return knowledgeDisplayTitle(knowledge, formatted.sceneItems, formatted.dictDetails);
  }
  const preferred =
    items.find((item: any) => /主题|标题|名称|问题|知识/.test(item.sceneItemName || item.name || '')) ||
    items.find((item: any) => itemValue(item) !== '--');
  const value = itemValue(preferred);
  return value === '--' ? `${typeMap[record.requestType]?.text || '知识申请'} #${record.knowledgeId || record.changeRequestId}` : value;
}

function requestSummary(record: any, sceneMap: Record<string, any> = {}) {
  if (record.requestType === 'DELETE') return '申请删除现有知识，审批通过后该知识将从知识库移除。';
  const scene = sceneMap[String(record.sceneTemplateId)];
  const formatted = scene ? formatBusinessDetail(scene) : { sceneItems: [], dictDetails: [] };
  const items = payloadItems(record);
  const count = items.filter((item: any) => itemValue(item, formatted.sceneItems, formatted.dictDetails) !== '--').length;
  if (record.requestType === 'CREATE') return `提交 ${count} 个字段，审批通过后写入正式知识库。`;
  return `修改 ${count} 个字段，审批通过后覆盖正式知识内容。`;
}

function fieldName(item: any, sceneItems: any[]) {
  const normalized = normalizeItem(item, sceneItems);
  return normalized?.sceneItemName || normalized?.name || `字段 ${normalized?.sceneItemId || normalized?.id || ''}`;
}

function ChangePreview({ record, sceneMap }: { record: any; sceneMap: Record<string, any> }) {
  const scene = sceneMap[String(record.sceneTemplateId)];
  const formatted = scene ? formatBusinessDetail(scene) : { sceneItems: [], dictDetails: [] };
  const nextItems = payloadItems(record).map((item: any) => normalizeItem(item, formatted.sceneItems));
  const oldItems = beforeItems(record).map((item: any) => normalizeItem(item, formatted.sceneItems));
  const showCompare = record.requestType === 'UPDATE';
  const showBeforeOnly = record.requestType === 'DELETE';
  const rows = showBeforeOnly ? oldItems : nextItems;

  return (
    <div className="approval-preview">
      <Descriptions column={2} size="small" className="approval-preview-meta">
        <Descriptions.Item label="申请类型">{typeMap[record.requestType]?.text || record.requestType}</Descriptions.Item>
        <Descriptions.Item label="状态">{statusMap[record.status]?.text || record.status}</Descriptions.Item>
        <Descriptions.Item label="场景">{sceneName(record, sceneMap)}</Descriptions.Item>
        <Descriptions.Item label="知识ID">{record.knowledgeId || '--'}</Descriptions.Item>
        <Descriptions.Item label="申请人">{record.applicantName || '--'}</Descriptions.Item>
        <Descriptions.Item label="申请时间">{formatTime(record.createTime)}</Descriptions.Item>
      </Descriptions>

      <div className="approval-preview-title">{requestTitle(record, sceneMap)}</div>
      <div className="approval-preview-note">{requestSummary(record, sceneMap)}</div>

      {showCompare ? (
        <div className="approval-compare">
          <div className="approval-compare-title">变更前</div>
          <div className="approval-compare-title">变更后</div>
          {nextItems.map((item: any) => {
            const before = oldItems.find((row: any) => String(row.sceneItemId) === String(item.sceneItemId));
            return (
              <Fragment key={item.sceneItemId}>
                <div className="approval-field-card" key={`old-${item.sceneItemId}`}>
                  <strong>{fieldName(item, formatted.sceneItems)}</strong>
                  <Typography.Paragraph>{itemValue(before, formatted.sceneItems, formatted.dictDetails)}</Typography.Paragraph>
                </div>
                <div className="approval-field-card is-new" key={`new-${item.sceneItemId}`}>
                  <strong>{fieldName(item, formatted.sceneItems)}</strong>
                  <Typography.Paragraph>{itemValue(item, formatted.sceneItems, formatted.dictDetails)}</Typography.Paragraph>
                </div>
              </Fragment>
            );
          })}
        </div>
      ) : (
        <div className="approval-field-list">
          {rows.map((item: any) => (
            <div className={showBeforeOnly ? 'approval-field-card is-danger' : 'approval-field-card is-new'} key={item.sceneItemId}>
              <strong>{fieldName(item, formatted.sceneItems)}</strong>
              <Typography.Paragraph>{itemValue(item, formatted.sceneItems, formatted.dictDetails)}</Typography.Paragraph>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChangeApprovals() {
  const user = authApi.getCurrentUser();
  const isAdmin = Boolean(user?.isBuiltin || user?.roleId === 1 || user?.roleIds?.includes?.(1));
  const actions = new Set(user?.setting?.operationPermissions || user?.operationPermissions || []);
  const canReview = isAdmin || actions.has('system:manage') || actions.has('system:approval:manage') || actions.has('knowledge:change-request:view-all');
  const hasOwnApprovals = Object.values(user?.setting?.approvalRequired || {}).some(Boolean);
  const [scope, setScope] = useState(canReview ? 'all' : 'mine');
  const [status, setStatus] = useState('PENDING');
  const [requestType, setRequestType] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [sceneMap, setSceneMap] = useState<Record<string, any>>({});

  const visibleRows = useMemo(
    () => requestType === 'ALL' ? rows : rows.filter((row) => row.requestType === requestType),
    [rows, requestType],
  );
  const pendingTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0, CREATE: 0, UPDATE: 0, DELETE: 0 };
    pendingRows.forEach((row) => {
      counts.ALL += 1;
      counts[row.requestType] = (counts[row.requestType] || 0) + 1;
    });
    return counts;
  }, [pendingRows]);

  const load = async () => {
    setLoading(true);
    try {
      const api = scope === 'all' ? approvalApi.list : approvalApi.mine;
      const res = await api({ status, pageNumber: 1, pageSize: 100 });
      const content = res?.content || [];
      const pendingRes = status === 'PENDING' ? res : await api({ status: 'PENDING', pageNumber: 1, pageSize: 100 });
      const pendingContent = pendingRes?.content || [];
      setRows(content);
      setPendingRows(pendingContent);
      setSelectedRowKeys([]);
      setTotal(Number(res?.totalElements || 0));
      const sceneIds = Array.from(new Set([...content, ...pendingContent].map((row: any) => row.sceneTemplateId).filter(Boolean).map(String)));
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
    if (scope === 'mine' && !hasOwnApprovals && canReview) {
      setScope('all');
      return;
    }
    load();
  }, [scope, status]);

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
    const targets = (selected.length ? selected : visibleRows).filter((row) => row.status === 'PENDING');
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
          <span>{requestSummary(record, sceneMap)}</span>
        </div>
      ),
    },
    { title: '场景', width: 180, render: (_, record) => sceneName(record, sceneMap) },
    { title: '知识ID', width: 100, render: (_, record) => record.knowledgeId || '--' },
    { title: '申请人', width: 140, dataIndex: 'applicantName' },
    { title: '申请时间', width: 160, render: (_, record) => formatTime(record.createTime) },
    {
      title: '操作',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EyeOutlined />} onClick={() => setPreview(record)}>查看</Button>
          {record.status === 'PENDING' && scope === 'all' ? (
            <>
              <Button type="link" icon={<CheckOutlined />} onClick={() => review(record, true)}>通过</Button>
              <Button type="link" danger icon={<CloseOutlined />} onClick={() => review(record, false)}>驳回</Button>
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
      title="变更审批"
      breadcrumb="系统管理 / 变更审批"
      description="按变更类型审核知识新增、编辑和删除申请。"
      extra={
        <Space wrap>
          {canReview && hasOwnApprovals ? (
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
      <div className="approval-page-layout">
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
            <em>{pendingTypeCounts.ALL}</em>
          </button>
          {requestTypes.map((type) => (
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
              <em>{pendingTypeCounts[type] || 0}</em>
            </button>
          ))}
        </aside>

        <div className="approval-table-area">
          <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="changeRequestId"
              loading={loading}
              columns={columns}
              dataSource={visibleRows}
              rowSelection={scope === 'all' && status === 'PENDING' ? {
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as any[]),
                getCheckboxProps: (record) => ({ disabled: record.status !== 'PENDING' }),
              } : undefined}
              pagination={{ total: visibleRows.length || total, pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
            />
          </Card>

          {scope === 'all' && status === 'PENDING' ? (
            <div className="approval-bulk-bar">
              <span>{selectedRowKeys.length ? `已选择 ${batchCount} 条待审批` : `当前分类 ${batchCount} 条待审批`}</span>
              <Space>
                <Button disabled={!batchCount} icon={<CheckOutlined />} onClick={() => bulkReview(true)}>
                  {selectedRowKeys.length ? '通过已选' : '通过当前分类'}
                </Button>
                <Button disabled={!batchCount} danger icon={<CloseOutlined />} onClick={() => bulkReview(false)}>
                  {selectedRowKeys.length ? '驳回已选' : '驳回当前分类'}
                </Button>
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
          <Button key="reject" danger icon={<CloseOutlined />} onClick={() => review(preview, false)}>驳回</Button>,
          <Button key="approve" type="primary" icon={<CheckOutlined />} onClick={() => review(preview, true)}>通过</Button>,
        ] : null}
        onCancel={() => setPreview(null)}
      >
        {preview ? <ChangePreview record={preview} sceneMap={sceneMap} /> : null}
      </Modal>
    </PageHeader>
  );
}
