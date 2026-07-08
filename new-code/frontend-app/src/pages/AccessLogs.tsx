import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, InputNumber, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { accessLogApi, userApi } from '@/services/api';
import { formatTime } from '@/utils/data';

const { RangePicker } = DatePicker;

const moduleOptions = ['用户认证', '知识库', '目录管理', '场景管理'].map((value) => ({ label: value, value }));

const actionText: Record<string, string> = {
  LOGIN: '登录',
  LOGOUT: '退出',
  VIEW: '查看知识',
  CREATE: '新增知识',
  CREATE_REQUEST: '新增审批',
  UPDATE: '修改知识',
  UPDATE_REQUEST: '修改审批',
  DELETE: '删除知识',
  DELETE_REQUEST: '删除审批',
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

const actionOptions = Object.entries(actionText).map(([value, label]) => ({ value, label }));

const bizTypeText: Record<string, string> = {
  USER: '用户',
  KNOWLEDGE: '知识',
  CHANGE_REQUEST: '审批申请',
  SCENE_TEMPLATE: '场景',
  SCENE_ITEM: '场景字段',
  DICT_TEMPLATE: '目录模板',
  DICT_DIRECTORY: '目录项',
};

const bizTypeOptions = Object.entries(bizTypeText).map(([value, label]) => ({ value, label }));

function formatFilters(values: any) {
  const searchTime = Array.isArray(values.searchTime)
    ? values.searchTime
        .slice(0, 2)
        .map((date: any) => (dayjs.isDayjs(date) ? date.format('YYYY-MM-DD HH:mm:ss') : String(date || '')))
        .filter(Boolean)
    : undefined;
  return {
    ...values,
    searchTime,
  };
}

function resultTag(value?: string) {
  if (value === 'FAIL') {
    return <Tag color="red">失败</Tag>;
  }
  return <Tag color="green">成功</Tag>;
}

export default function AccessLogs() {
  const [form] = Form.useForm();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [operatorOptions, setOperatorOptions] = useState<{ label: string; value: string }[]>([]);

  const load = async (nextPage = page, nextPageSize = pageSize, nextQuery = query) => {
    setLoading(true);
    try {
      const res = await accessLogApi.list({
        ...nextQuery,
        pageNumber: nextPage,
        pageSize: nextPageSize,
      });
      setRows(Array.isArray(res?.content) ? res.content : []);
      setTotal(Number(res?.totalElements || 0));
      setPage(nextPage);
      setPageSize(nextPageSize);
    } finally {
      setLoading(false);
    }
  };

  const loadOperators = async () => {
    const res = await userApi.list({ pageNumber: 1, pageSize: 500 });
    const options = (Array.isArray(res?.content) ? res.content : [])
      .filter((user: any) => user?.userAccount)
      .map((user: any) => {
        const nickname = user.userNickname ? `（${user.userNickname}）` : '';
        return {
          value: user.userAccount,
          label: `${user.userAccount}${nickname}`,
        };
      });
    setOperatorOptions(options);
  };

  useEffect(() => {
    load(1, pageSize, {});
    loadOperators();
  }, []);

  const submit = (values: any) => {
    const next = formatFilters(values);
    setQuery(next);
    load(1, pageSize, next);
  };

  const reset = () => {
    form.resetFields();
    setQuery({});
    load(1, pageSize, {});
  };

  const columns: ColumnsType<any> = [
    { title: '时间', dataIndex: 'createTime', width: 160, render: formatTime },
    {
      title: '操作人',
      dataIndex: 'userAccount',
      width: 130,
      render: (value) => value || '未识别',
    },
    { title: '模块', dataIndex: 'module', width: 110 },
    {
      title: '操作',
      dataIndex: 'action',
      width: 130,
      render: (value) => <Tag color="blue">{actionText[value] || value || '-'}</Tag>,
    },
    { title: '结果', dataIndex: 'result', width: 90, render: resultTag },
    {
      title: '业务对象',
      width: 170,
      render: (_, record) => {
        const type = bizTypeText[record.bizType] || record.bizType || '-';
        return record.bizId ? `${type} #${record.bizId}` : type;
      },
    },
    { title: '场景ID', dataIndex: 'sceneTemplateId', width: 100, render: (value) => value || '-' },
    {
      title: '说明',
      dataIndex: 'description',
      width: 260,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Typography.Text>{value || '-'}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: '请求',
      width: 260,
      ellipsis: true,
      render: (_, record) => {
        const text = [record.requestMethod, record.requestPath].filter(Boolean).join(' ');
        return (
          <Tooltip title={text}>
            <Typography.Text>{text || '-'}</Typography.Text>
          </Tooltip>
        );
      },
    },
    { title: 'IP', dataIndex: 'ipAddress', width: 130, render: (value) => value || '-' },
    {
      title: '异常信息',
      dataIndex: 'errorMessage',
      width: 220,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Typography.Text type={value ? 'danger' : 'secondary'}>{value || '-'}</Typography.Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <PageHeader title="访问日志" breadcrumb="系统管理 / 访问日志" hideHeader>
      <div className="access-log-breadcrumb page-breadcrumb">系统管理 / 访问日志</div>
      <Card className="modern-table-card access-log-workbench">
        <Form form={form} className="access-log-filter" layout="vertical" onFinish={submit}>
          <div className="access-log-filter-grid">
            <Form.Item name="userAccount" label="操作人">
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                options={operatorOptions}
                placeholder="搜索账号或昵称"
              />
            </Form.Item>
            <Form.Item name="module" label="模块">
              <Select allowClear options={moduleOptions} placeholder="全部模块" />
            </Form.Item>
            <Form.Item name="action" label="操作">
              <Select allowClear showSearch options={actionOptions} placeholder="全部操作" optionFilterProp="label" />
            </Form.Item>
            <Form.Item name="bizType" label="业务对象">
              <Select allowClear options={bizTypeOptions} placeholder="全部对象" />
            </Form.Item>
            <Form.Item name="bizId" label="对象ID">
              <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="输入对象ID" />
            </Form.Item>
            <Form.Item name="sceneTemplateId" label="场景ID">
              <InputNumber min={1} precision={0} style={{ width: '100%' }} placeholder="输入场景ID" />
            </Form.Item>
            <Form.Item name="searchTime" label="时间范围" className="access-log-range-item">
              <RangePicker showTime style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label=" " className="access-log-filter-actions">
              <Space>
                <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={loading}>
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={reset}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
        <div className="access-log-table-wrap">
          <Table
            rowKey="accessLogId"
            columns={columns}
            dataSource={rows}
            loading={loading}
            scroll={{ x: 1750 }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (count) => `共 ${count} 条`,
              onChange: (nextPage, nextPageSize) => load(nextPage, nextPageSize, query),
            }}
          />
        </div>
      </Card>
    </PageHeader>
  );
}
