import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { Button, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';
import { formatTime } from '@/utils/data';

const actionText: Record<string, string> = {
  LOGIN: '登录',
  LOGOUT: '退出',
  VIEW: '查看',
  CREATE: '新增',
  CREATE_REQUEST: '提交新增审批',
  UPDATE: '修改',
  UPDATE_REQUEST: '提交修改审批',
  DELETE: '删除',
  DELETE_REQUEST: '提交删除审批',
  DICT_CREATE: '新增目录',
  DICT_UPDATE: '编辑目录',
  DICT_STATUS: '目录状态',
  DICT_DELETE: '删除目录',
  DIRECTORY_RENAME: '目录项改名',
  DIRECTORY_STATUS: '目录项状态',
  DIRECTORY_DELETE: '删除目录项',
  DIRECTORY_SORT: '目录排序',
  SCENE_CREATE: '新增场景',
  SCENE_COPY: '复制场景',
  SCENE_UPDATE: '编辑场景',
  SCENE_STATUS: '场景状态',
  SCENE_ITEM_DELETE: '删除字段',
};

type AccessLogOrder = 'asc' | 'desc';

type AccessLogTableParams = {
  pageNumber: number;
  pageSize: number;
  order?: AccessLogOrder;
};

type AccessLogTableProps = {
  active?: boolean;
  compact?: boolean;
  showBiz?: boolean;
  showUser?: boolean;
  refreshKey?: string | number;
  fetcher: (params: AccessLogTableParams) => Promise<any>;
};

const bizTypeText: Record<string, string> = {
  KNOWLEDGE: '知识',
  CHANGE_REQUEST: '审批',
  USER: '用户',
  DICT_TEMPLATE: '目录',
  DICT_DIRECTORY: '目录项',
  SCENE_TEMPLATE: '场景',
  SCENE_ITEM: '场景字段',
};

function resultTag(value?: string) {
  if (value === 'FAIL') {
    return <Tag color="red">失败</Tag>;
  }
  return <Tag color="green">成功</Tag>;
}

export default function AccessLogTable({
  active = true,
  compact = false,
  showBiz = false,
  showUser = true,
  refreshKey,
  fetcher,
}: AccessLogTableProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(compact ? 5 : 10);
  const [loading, setLoading] = useState(false);
  const [timeOrder, setTimeOrder] = useState<AccessLogOrder>('desc');

  const load = async (nextPage = page, nextPageSize = pageSize, nextOrder = timeOrder) => {
    if (!active) return;
    setPage(nextPage);
    setPageSize(nextPageSize);
    setTimeOrder(nextOrder);
    setLoading(true);
    try {
      const res = await fetcher({ pageNumber: nextPage, pageSize: nextPageSize, order: nextOrder });
      setRows(Array.isArray(res?.content) ? res.content : []);
      setTotal(Number(res?.totalElements || 0));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, pageSize);
  }, [active, refreshKey]);

  const tableScrollX = compact ? 900 : showBiz ? 1420 : 1280;

  const toggleTimeOrder = () => {
    const nextOrder: AccessLogOrder = timeOrder === 'desc' ? 'asc' : 'desc';
    load(1, pageSize, nextOrder);
  };

  const handleTableChange = (pagination: any) => {
    load(pagination.current || 1, pagination.pageSize || pageSize, timeOrder);
  };

  const timeTitle = (
    <Button
      type="text"
      size="small"
      className="access-log-time-sort"
      icon={timeOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
      onClick={toggleTimeOrder}
    >
      时间
    </Button>
  );

  const columns: ColumnsType<any> = [
    {
      title: timeTitle,
      dataIndex: 'createTime',
      width: 170,
      render: formatTime,
    },
    showUser
      ? {
          title: '操作人',
          dataIndex: 'userAccount',
          width: 110,
          render: (value) => value || '未识别',
        }
      : null,
    {
      title: '操作',
      dataIndex: 'action',
      width: 130,
      render: (value) => <Tag color="blue">{actionText[value] || value || '-'}</Tag>,
    },
    showBiz
      ? {
          title: '对象',
          width: 130,
          render: (_, record) => {
            const type = bizTypeText[record.bizType] || record.bizType || '-';
            return record.bizId ? `${type} #${record.bizId}` : type;
          },
        }
      : null,
    { title: '结果', dataIndex: 'result', width: 80, render: resultTag },
    {
      title: '说明',
      dataIndex: 'description',
      width: compact ? 180 : 240,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Typography.Text>{value || '-'}</Typography.Text>
        </Tooltip>
      ),
    },
    { title: 'IP', dataIndex: 'ipAddress', width: 130, render: (value) => value || '-' },
    compact
      ? null
      : {
          title: '设备',
          dataIndex: 'userAgent',
          width: 260,
          ellipsis: true,
          render: (value) => (
            <Tooltip title={value}>
              <Typography.Text>{value || '-'}</Typography.Text>
            </Tooltip>
          ),
        },
    {
      title: '异常信息',
      dataIndex: 'errorMessage',
      width: compact ? 160 : 190,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Typography.Text type={value ? 'danger' : 'secondary'}>{value || '-'}</Typography.Text>
        </Tooltip>
      ),
    },
  ].filter(Boolean) as ColumnsType<any>;

  return (
    <Table
      rowKey="accessLogId"
      size={compact ? 'small' : 'middle'}
      columns={columns}
      dataSource={rows}
      loading={loading}
      scroll={{ x: tableScrollX }}
      onChange={handleTableChange}
      pagination={{
        current: page,
        pageSize,
        total,
        showSizeChanger: !compact,
        showTotal: (count) => `共 ${count} 条`,
      }}
    />
  );
}
