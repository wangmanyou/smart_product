import { CheckOutlined, CloseOutlined, RollbackOutlined } from '@ant-design/icons';
import { Button, Card, Modal, Radio, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { approvalApi, authApi } from '@/services/api';

const statusMap: Record<string, { text: string; color: string }> = {
  PENDING: { text: '待审批', color: 'orange' },
  APPROVED: { text: '已通过', color: 'green' },
  REJECTED: { text: '已驳回', color: 'red' },
  WITHDRAWN: { text: '已撤回', color: 'default' },
};

const typeMap: Record<string, string> = {
  CREATE: '新增知识',
  UPDATE: '编辑知识',
  DELETE: '删除知识',
};

export default function ChangeApprovals() {
  const user = authApi.getCurrentUser();
  const isAdmin = Boolean(user?.isBuiltin || user?.roleId === 1);
  const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const api = scope === 'all' ? approvalApi.list : approvalApi.mine;
      const res = await api({ status, pageNumber: 1, pageSize: 50 });
      setRows(res?.content || []);
      setTotal(Number(res?.totalElements || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [scope, status]);

  const review = (record: any, approved: boolean) => {
    Modal.confirm({
      title: approved ? '确认通过该申请？' : '确认驳回该申请？',
      content: approved ? '通过后变更会写入正式知识库。' : '驳回后申请人可以看到驳回状态。',
      okText: approved ? '通过' : '驳回',
      okButtonProps: { danger: !approved },
      onOk: async () => {
        if (approved) {
          await approvalApi.approve({ changeRequestId: record.changeRequestId });
        } else {
          await approvalApi.reject({ changeRequestId: record.changeRequestId });
        }
        message.success(approved ? '已通过' : '已驳回');
        load();
      },
    });
  };

  const columns: ColumnsType<any> = [
    { title: '申请类型', width: 130, render: (_, record) => typeMap[record.requestType] || record.requestType },
    { title: '状态', width: 110, render: (_, record) => <Tag color={statusMap[record.status]?.color}>{statusMap[record.status]?.text || record.status}</Tag> },
    { title: '场景ID', width: 100, dataIndex: 'sceneTemplateId' },
    { title: '知识ID', width: 100, render: (_, record) => record.knowledgeId || '--' },
    { title: '申请人', width: 140, dataIndex: 'applicantName' },
    {
      title: '申请内容',
      render: (_, record) => (
        <Typography.Text ellipsis style={{ maxWidth: 420 }}>
          {JSON.stringify(record.payload || {})}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      width: 220,
      render: (_, record) => {
        if (record.status !== 'PENDING') return '--';
        if (scope === 'all') {
          return (
            <Space>
              <Button type="link" icon={<CheckOutlined />} onClick={() => review(record, true)}>
                通过
              </Button>
              <Button type="link" danger icon={<CloseOutlined />} onClick={() => review(record, false)}>
                驳回
              </Button>
            </Space>
          );
        }
        return (
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
        );
      },
    },
  ];

  return (
    <PageHeader
      title="变更审批"
      breadcrumb="系统管理 / 变更审批"
      description="审核普通用户提交的知识新增、编辑、删除申请。"
      extra={
        <Space>
          {isAdmin ? (
            <Radio.Group value={scope} onChange={(event) => setScope(event.target.value)}>
              <Radio.Button value="all">全部申请</Radio.Button>
              <Radio.Button value="mine">我的申请</Radio.Button>
            </Radio.Group>
          ) : null}
          <Radio.Group value={status} onChange={(event) => setStatus(event.target.value)}>
            <Radio.Button value="PENDING">待审批</Radio.Button>
            <Radio.Button value="APPROVED">已通过</Radio.Button>
            <Radio.Button value="REJECTED">已驳回</Radio.Button>
            <Radio.Button value="WITHDRAWN">已撤回</Radio.Button>
          </Radio.Group>
        </Space>
      }
    >
      <Card className="modern-table-card" bodyStyle={{ padding: 0 }}>
        <Table
          rowKey="changeRequestId"
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={{ total, pageSize: 10, showTotal: (count) => `共 ${count} 条` }}
        />
      </Card>
    </PageHeader>
  );
}
