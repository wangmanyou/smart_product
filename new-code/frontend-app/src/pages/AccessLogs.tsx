import { DownOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Select, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { accessLogApi, businessApi, dictApi, sceneApi, userApi } from '@/services/api';
import { formatBusinessDetail, formatTime, knowledgeDisplayTitle } from '@/utils/data';

const { RangePicker } = DatePicker;

const moduleOptions = ['用户认证', '知识库', '目录管理', '场景管理'].map((value) => ({ label: value, value }));

const actionText: Record<string, string> = {
  LOGIN: '登录',
  LOGOUT: '退出',
  VIEW: '查看知识',
  CREATE: '新增知识',
  CREATE_REQUEST: '提交新增申请',
  UPDATE: '修改知识',
  UPDATE_REQUEST: '提交修改申请',
  DELETE: '删除知识',
  DELETE_REQUEST: '提交删除申请',
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

const moduleActionCodes: Record<string, string[]> = {
  '用户认证': ['LOGIN', 'LOGOUT'],
  '知识库': ['VIEW', 'CREATE', 'CREATE_REQUEST', 'UPDATE', 'UPDATE_REQUEST', 'DELETE', 'DELETE_REQUEST'],
  '目录管理': [
    'DICT_CREATE',
    'DICT_UPDATE',
    'DICT_STATUS',
    'DICT_DELETE',
    'DIRECTORY_RENAME',
    'DIRECTORY_STATUS',
    'DIRECTORY_DELETE',
    'DIRECTORY_SORT',
  ],
  '场景管理': ['SCENE_CREATE', 'SCENE_COPY', 'SCENE_UPDATE', 'SCENE_STATUS', 'SCENE_ITEM_DELETE'],
};

const bizTypeText: Record<string, string> = {
  USER: '用户',
  KNOWLEDGE: '知识',
  CHANGE_REQUEST: '审批申请',
  SCENE_TEMPLATE: '场景',
  SCENE_ITEM: '场景字段',
  DICT_TEMPLATE: '目录模板',
  DICT_DIRECTORY: '目录项',
};

const bizTypeOptions = [
  { value: 'USER', label: '用户' },
  { value: 'KNOWLEDGE', label: '知识' },
  { value: 'SCENE_TEMPLATE', label: '场景' },
  { value: 'DICT_TEMPLATE', label: '目录' },
];

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
  const selectedModule = Form.useWatch('module', form);
  const selectedBizType = Form.useWatch('bizType', form);
  const selectedSceneId = Form.useWatch('sceneTemplateId', form);
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [query, setQuery] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [operatorOptions, setOperatorOptions] = useState<{ label: string; value: string }[]>([]);
  const [userObjectOptions, setUserObjectOptions] = useState<{ label: string; value: number }[]>([]);
  const [sceneOptions, setSceneOptions] = useState<{ label: string; value: number }[]>([]);
  const [dictOptions, setDictOptions] = useState<{ label: string; value: number }[]>([]);
  const [knowledgeOptions, setKnowledgeOptions] = useState<{ label: string; value: number }[]>([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);

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
    const [userRes, sceneRes, dictRes] = await Promise.all([
      userApi.list({ pageNumber: 1, pageSize: 500 }),
      sceneApi.list({ pageNumber: 1, pageSize: 1000, searchSceneDisabled: '' }),
      dictApi.list({ pageNumber: 1, pageSize: 1000 }),
    ]);
    const users = Array.isArray(userRes?.content) ? userRes.content : [];
    const options = users
      .filter((user: any) => user?.userAccount)
      .map((user: any) => {
        const nickname = user.userNickname ? `（${user.userNickname}）` : '';
        return {
          value: user.userAccount,
          label: `${user.userAccount}${nickname}`,
        };
      });
    setOperatorOptions(options);
    setUserObjectOptions(users.map((user: any) => ({
      value: Number(user.userId),
      label: `${user.userAccount}${user.userNickname ? `（${user.userNickname}）` : ''}`,
    })));
    setSceneOptions((Array.isArray(sceneRes?.content) ? sceneRes.content : []).map((scene: any) => ({
      value: Number(scene.sceneTemplateId),
      label: scene.sceneName || `场景 #${scene.sceneTemplateId}`,
    })));
    setDictOptions((Array.isArray(dictRes?.content) ? dictRes.content : []).map((dict: any) => ({
      value: Number(dict.dictTemplateId),
      label: dict.dictName || `目录 #${dict.dictTemplateId}`,
    })));
  };

  useEffect(() => {
    load(1, pageSize, {});
    loadOperators();
  }, []);

  useEffect(() => {
    if (selectedBizType !== 'KNOWLEDGE' || !selectedSceneId) {
      setKnowledgeOptions([]);
      return;
    }
    let active = true;
    setKnowledgeLoading(true);
    Promise.all([
      businessApi.detail(selectedSceneId),
      businessApi.knowledgeList({ sceneTemplateId: selectedSceneId, pageNumber: 1, pageSize: 1000 }),
    ]).then(([detailRes, listRes]) => {
      if (!active) return;
      const formatted = formatBusinessDetail(detailRes);
      const rows = Array.isArray(listRes?.content) ? listRes.content : [];
      setKnowledgeOptions(rows.map((row: any) => ({
        value: Number(row.knowledgeId),
        label: knowledgeDisplayTitle(row, formatted.sceneItems, formatted.dictDetails) || `知识 #${row.knowledgeId}`,
      })));
    }).finally(() => {
      if (active) setKnowledgeLoading(false);
    });
    return () => {
      active = false;
    };
  }, [selectedBizType, selectedSceneId]);

  const submit = (values: any) => {
    const next = formatFilters(values);
    setQuery(next);
    load(1, pageSize, next);
  };

  const reset = () => {
    form.resetFields();
    setAdvancedOpen(false);
    setQuery({});
    load(1, pageSize, {});
  };

  const advancedFilterCount = ['bizType', 'bizId', 'sceneTemplateId'].filter((key) => {
    const value = query[key];
    return value !== undefined && value !== null && value !== '';
  }).length;

  const visibleActionOptions = selectedModule
    ? actionOptions.filter((option) => moduleActionCodes[selectedModule]?.includes(option.value))
    : actionOptions;

  const clearObjectFilters = () => {
    form.setFieldsValue({ bizId: undefined, sceneTemplateId: undefined });
    setKnowledgeOptions([]);
  };

  const objectSelector = (() => {
    if (selectedBizType === 'USER') {
      return (
        <Form.Item name="bizId" label="用户">
          <Select allowClear showSearch optionFilterProp="label" options={userObjectOptions} placeholder="搜索账号或昵称" />
        </Form.Item>
      );
    }
    if (selectedBizType === 'KNOWLEDGE') {
      return (
        <>
          <Form.Item name="sceneTemplateId" label="所属场景">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={sceneOptions}
              placeholder="先选择场景"
              onChange={() => form.setFieldValue('bizId', undefined)}
            />
          </Form.Item>
          <Form.Item name="bizId" label="知识">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={knowledgeOptions}
              loading={knowledgeLoading}
              disabled={!selectedSceneId}
              placeholder={selectedSceneId ? '搜索知识标题' : '请先选择场景'}
            />
          </Form.Item>
        </>
      );
    }
    if (selectedBizType === 'SCENE_TEMPLATE') {
      return (
        <Form.Item name="bizId" label="场景">
          <Select allowClear showSearch optionFilterProp="label" options={sceneOptions} placeholder="搜索场景名称" />
        </Form.Item>
      );
    }
    if (selectedBizType === 'DICT_TEMPLATE') {
      return (
        <Form.Item name="bizId" label="目录">
          <Select allowClear showSearch optionFilterProp="label" options={dictOptions} placeholder="搜索目录名称" />
        </Form.Item>
      );
    }
    return null;
  })();

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
    <PageHeader title="系统审计日志" breadcrumb="系统管理 / 系统审计日志" hideHeader>
      <div className="access-log-page">
        <header className="access-log-page-header">
          <div className="access-log-breadcrumb page-breadcrumb">系统管理 / 系统审计日志</div>
        </header>

        <section className="access-log-filter-panel" aria-label="访问日志筛选">
          <Form form={form} className="access-log-filter" layout="vertical" onFinish={submit}>
            <div className="access-log-primary-filters">
              <Form.Item name="userAccount" label="操作人">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  options={operatorOptions}
                  placeholder="账号或昵称"
                />
              </Form.Item>
              <Form.Item name="module" label="模块">
                <Select
                  allowClear
                  options={moduleOptions}
                  placeholder="全部模块"
                  onChange={() => form.setFieldValue('action', undefined)}
                />
              </Form.Item>
              <Form.Item name="action" label="操作">
                <Select
                  allowClear
                  showSearch
                  options={visibleActionOptions}
                  placeholder={selectedModule ? `全部${selectedModule}操作` : '全部操作'}
                  optionFilterProp="label"
                />
              </Form.Item>
              <Form.Item name="searchTime" label="时间范围" className="access-log-range-item">
                <RangePicker
                  showTime
                  style={{ width: '100%' }}
                  placeholder={['开始时间', '结束时间']}
                />
              </Form.Item>
              <div className="access-log-filter-actions">
                <Button type="primary" icon={<SearchOutlined />} htmlType="submit" loading={loading}>
                  查询
                </Button>
                <Button icon={<ReloadOutlined />} onClick={reset}>
                  重置
                </Button>
              </div>
            </div>

            <div className="access-log-filter-more-row">
              <Button
                type="text"
                size="small"
                className="access-log-filter-more"
                icon={<DownOutlined className={advancedOpen ? 'is-open' : ''} />}
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((current) => !current)}
              >
                更多筛选{advancedFilterCount ? ` (${advancedFilterCount})` : ''}
              </Button>
            </div>

            {advancedOpen ? (
              <div className="access-log-advanced-filters">
                <Form.Item name="bizType" label="业务对象">
                  <Select
                    allowClear
                    options={bizTypeOptions}
                    placeholder="选择需要精确定位的对象"
                    onChange={clearObjectFilters}
                  />
                </Form.Item>
                {objectSelector}
              </div>
            ) : null}
          </Form>
        </section>

        <Card className="modern-table-card access-log-table-card" bodyStyle={{ padding: 0 }}>
          <Table
            rowKey="accessLogId"
            columns={columns}
            dataSource={rows}
            loading={loading}
            size="middle"
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
        </Card>
      </div>
    </PageHeader>
  );
}
