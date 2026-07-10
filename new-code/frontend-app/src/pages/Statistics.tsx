import {
  AuditOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  FileAddOutlined,
  ReloadOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { history } from '@umijs/max';
import ReactECharts from 'echarts-for-react';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Progress,
  Select,
  Skeleton,
  Table,
  Tag,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { businessApi } from '@/services/api';
import './Statistics.less';

const { RangePicker } = DatePicker;

type RangeValue = [Dayjs, Dayjs] | null;
type Granularity = 'DAY' | 'WEEK' | 'MONTH';

type ComparisonMetric = {
  current?: number;
  previous?: number;
  delta?: number;
  rate?: number | null;
};

type SceneOption = {
  sceneTemplateId: number;
  sceneName: string;
  disabled?: boolean;
};

type TrendItem = {
  bucketStart: string;
  label: string;
  viewCount: number;
  newKnowledge: number;
  changeCount: number;
};

type ScenePerformance = {
  sceneTemplateId: number;
  sceneName: string;
  knowledgeCount: number;
  newKnowledge: number;
  viewCount: number;
  activeUserCount: number;
  changeCount: number;
  pendingApprovalCount: number;
};

type PopularKnowledge = {
  knowledgeId: number;
  sceneTemplateId: number;
  sceneName: string;
  displayName: string;
  creatorName?: string;
  viewCount: number;
  viewerCount: number;
  lastViewAt?: string;
};

type WorkItem = {
  changeRequestId: number;
  requestType: string;
  knowledgeId?: number;
  sceneTemplateId?: number;
  sceneName?: string;
  applicantName?: string;
  reason?: string;
  createdAt?: string;
  waitingHours: number;
  overdue?: boolean;
};

type DashboardOverview = {
  range?: {
    startDate?: string;
    endDate?: string;
    granularity?: Granularity;
  };
  availableScenes: SceneOption[];
  selectedSceneTemplateIds: number[];
  summary: {
    sceneCount: number;
    totalKnowledge: number;
    newKnowledge: number;
    viewCount: number;
    activeUserCount: number;
    changeCount: number;
    pendingApprovalCount: number;
    comparisonEnabled?: boolean;
    comparison?: Record<string, ComparisonMetric>;
  };
  trend: TrendItem[];
  scenePerformance: ScenePerformance[];
  popularKnowledge: PopularKnowledge[];
  approvalGovernance: {
    mode?: 'REVIEW' | 'OWN' | 'NONE';
    pendingCount: number;
    overdue24hCount: number;
    approvedCount: number;
    rejectedCount: number;
    approvalRate: number;
    averageReviewHours: number;
  };
  myWork: {
    mode?: 'REVIEW' | 'OWN' | 'NONE';
    pendingCount: number;
    overdue24hCount: number;
    items: WorkItem[];
  };
  riskSummary: {
    failedOperationCount: number;
    overdueApprovalCount: number;
    hasRisk?: boolean;
  };
};

const EMPTY_OVERVIEW: DashboardOverview = {
  availableScenes: [],
  selectedSceneTemplateIds: [],
  summary: {
    sceneCount: 0,
    totalKnowledge: 0,
    newKnowledge: 0,
    viewCount: 0,
    activeUserCount: 0,
    changeCount: 0,
    pendingApprovalCount: 0,
    comparison: {},
  },
  trend: [],
  scenePerformance: [],
  popularKnowledge: [],
  approvalGovernance: {
    mode: 'NONE',
    pendingCount: 0,
    overdue24hCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    approvalRate: 0,
    averageReviewHours: 0,
  },
  myWork: { mode: 'NONE', pendingCount: 0, overdue24hCount: 0, items: [] },
  riskSummary: { failedOperationCount: 0, overdueApprovalCount: 0, hasRisk: false },
};

const granularityOptions = [
  { label: '按日', value: 'DAY' },
  { label: '按周', value: 'WEEK' },
  { label: '按月', value: 'MONTH' },
];

const requestTypeLabels: Record<string, string> = {
  CREATE: '新增',
  UPDATE: '更新',
  DELETE: '删除',
};

const numberFormatter = new Intl.NumberFormat('zh-CN');

function numberValue(value: unknown) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

function defaultRange(): [Dayjs, Dayjs] {
  return [dayjs().subtract(29, 'day'), dayjs()];
}

function comparisonNote(metric?: ComparisonMetric) {
  if (!metric) return '暂无上期对比';
  const delta = numberValue(metric.delta);
  if (delta === 0) return '与上期持平';
  if (metric.rate === null || metric.rate === undefined) {
    return delta > 0
      ? '上期为 0，本期新增 ' + numberFormatter.format(delta)
      : '较上期减少 ' + numberFormatter.format(Math.abs(delta));
  }
  const direction = delta > 0 ? '增长' : '下降';
  return '较上期' + direction + ' ' + Math.abs(numberValue(metric.rate)).toFixed(1) + '%';
}

function formatTime(value?: string) {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('MM-DD HH:mm') : value;
}

function shortName(value?: string, max = 10) {
  const text = value || '未命名场景';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

export default function Statistics() {
  const initialRange = useMemo(defaultRange, []);
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<DashboardOverview>(EMPTY_OVERVIEW);
  const [range, setRange] = useState<RangeValue>(initialRange);
  const [sceneIds, setSceneIds] = useState<number[]>([]);
  const [granularity, setGranularity] = useState<Granularity>('DAY');

  const loadData = async (
    nextRange: RangeValue = range,
    nextSceneIds: number[] = sceneIds,
    nextGranularity: Granularity = granularity,
  ) => {
    setLoading(true);
    try {
      const response = await businessApi.dashboardOverview({
        startTime: nextRange?.[0].format('YYYY-MM-DD'),
        endTime: nextRange?.[1].format('YYYY-MM-DD'),
        sceneTemplateIds: nextSceneIds,
        granularity: nextGranularity,
        comparePrevious: true,
      });
      setOverview({ ...EMPTY_OVERVIEW, ...response });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(initialRange, [], 'DAY');
  }, []);

  const resetFilters = () => {
    const nextRange = defaultRange();
    setRange(nextRange);
    setSceneIds([]);
    setGranularity('DAY');
    loadData(nextRange, [], 'DAY');
  };

  const sceneOptions = useMemo(
    () =>
      overview.availableScenes.map((scene) => ({
        label: scene.disabled ? scene.sceneName + '（已停用）' : scene.sceneName,
        value: scene.sceneTemplateId,
      })),
    [overview.availableScenes],
  );

  const kpis = [
    {
      label: '知识总量',
      value: overview.summary.totalKnowledge,
      suffix: '条',
      note: '覆盖 ' + overview.summary.sceneCount + ' 个授权场景',
      icon: <BookOutlined />,
      tone: 'blue',
    },
    {
      label: '期间新增',
      value: overview.summary.newKnowledge,
      suffix: '条',
      note: comparisonNote(overview.summary.comparison?.newKnowledge),
      icon: <FileAddOutlined />,
      tone: 'green',
    },
    {
      label: '期间访问',
      value: overview.summary.viewCount,
      suffix: '次',
      note: comparisonNote(overview.summary.comparison?.viewCount),
      icon: <EyeOutlined />,
      tone: 'amber',
    },
    {
      label: '活跃用户',
      value: overview.summary.activeUserCount,
      suffix: '人',
      note: comparisonNote(overview.summary.comparison?.activeUserCount),
      icon: <TeamOutlined />,
      tone: 'slate',
    },
    {
      label: overview.myWork.mode === 'OWN' ? '我的待处理申请' : '待处理审批',
      value: overview.summary.pendingApprovalCount,
      suffix: '项',
      note: overview.approvalGovernance.overdue24hCount
        ? '其中 ' + overview.approvalGovernance.overdue24hCount + ' 项已超过 24 小时'
        : '当前无超时审批',
      icon: <AuditOutlined />,
      tone: 'red',
    },
  ];

  const trendHasData = overview.trend.some(
    (item) => numberValue(item.viewCount) + numberValue(item.newKnowledge) + numberValue(item.changeCount) > 0,
  );

  const trendOption = useMemo(
    () => ({
      animationDuration: 220,
      color: ['#1769e8', '#13a06f', '#64748b'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'line' } },
      legend: { top: 0, right: 8, itemWidth: 12, itemHeight: 8 },
      grid: { left: 50, right: 52, top: 54, bottom: overview.trend.length > 20 ? 58 : 36 },
      xAxis: {
        type: 'category',
        boundaryGap: true,
        data: overview.trend.map((item) => item.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#dbe3ee' } },
        axisLabel: {
          color: '#64748b',
          hideOverlap: true,
          interval: overview.trend.length > 40 ? 4 : overview.trend.length > 20 ? 2 : 0,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '访问',
          minInterval: 1,
          axisLabel: { color: '#64748b' },
          splitLine: { lineStyle: { color: '#edf1f6' } },
        },
        {
          type: 'value',
          name: '内容',
          minInterval: 1,
          axisLabel: { color: '#64748b' },
          splitLine: { show: false },
        },
      ],
      dataZoom:
        overview.trend.length > 31
          ? [{ type: 'inside', start: 0, end: 70 }, { type: 'slider', height: 16, bottom: 8 }]
          : [],
      series: [
        {
          name: '成功访问',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: overview.trend.length <= 31,
          lineStyle: { width: 3 },
          areaStyle: { color: 'rgba(23, 105, 232, 0.08)' },
          data: overview.trend.map((item) => numberValue(item.viewCount)),
        },
        {
          name: '新增知识',
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 18,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: overview.trend.map((item) => numberValue(item.newKnowledge)),
        },
        {
          name: '内容变更',
          type: 'bar',
          yAxisIndex: 1,
          barMaxWidth: 18,
          itemStyle: { borderRadius: [4, 4, 0, 0] },
          data: overview.trend.map((item) => numberValue(item.changeCount)),
        },
      ],
    }),
    [overview.trend],
  );

  const rankedScenes = useMemo(
    () =>
      [...overview.scenePerformance]
        .sort(
          (a, b) =>
            numberValue(b.viewCount) - numberValue(a.viewCount) ||
            numberValue(b.knowledgeCount) - numberValue(a.knowledgeCount),
        )
        .slice(0, 8)
        .reverse(),
    [overview.scenePerformance],
  );

  const sceneRankOption = useMemo(
    () => ({
      animationDuration: 220,
      color: ['#1769e8'],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (items: any[]) => {
          const index = items?.[0]?.dataIndex ?? 0;
          const scene = rankedScenes[index];
          if (!scene) return '';
          return [
            '<strong>' + scene.sceneName + '</strong>',
            '期间访问：' + numberFormatter.format(numberValue(scene.viewCount)) + ' 次',
            '期间新增：' + numberFormatter.format(numberValue(scene.newKnowledge)) + ' 条',
            '知识总量：' + numberFormatter.format(numberValue(scene.knowledgeCount)) + ' 条',
          ].join('<br/>');
        },
      },
      grid: { left: 104, right: 30, top: 14, bottom: 24 },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#edf1f6' } },
      },
      yAxis: {
        type: 'category',
        data: rankedScenes.map((item) => item.sceneName),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: '#334155', formatter: (value: string) => shortName(value, 8) },
      },
      series: [
        {
          name: '期间访问',
          type: 'bar',
          barWidth: 14,
          data: rankedScenes.map((item) => numberValue(item.viewCount)),
          itemStyle: { borderRadius: [0, 5, 5, 0] },
        },
      ],
    }),
    [rankedScenes],
  );

  const popularColumns: ColumnsType<PopularKnowledge> = [
    {
      title: '热门知识',
      dataIndex: 'displayName',
      ellipsis: true,
      render: (text, record) => (
        <Button
          type="link"
          className="dashboard-v2-link"
          onClick={() =>
            history.push({
              pathname: '/knowledge/scene/' + record.sceneTemplateId + '/detail/' + record.knowledgeId,
              state: { tabLabel: text || '知识 #' + record.knowledgeId },
            })
          }
        >
          {text || '知识 #' + record.knowledgeId}
        </Button>
      ),
    },
    {
      title: '场景',
      dataIndex: 'sceneName',
      width: 130,
      ellipsis: true,
      render: (text) => <Tag>{text || '未命名场景'}</Tag>,
    },
    {
      title: '访问',
      dataIndex: 'viewCount',
      width: 82,
      align: 'right',
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '访客',
      dataIndex: 'viewerCount',
      width: 72,
      align: 'right',
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '最近访问',
      dataIndex: 'lastViewAt',
      width: 118,
      render: formatTime,
    },
  ];

  const sceneColumns: ColumnsType<ScenePerformance> = [
    {
      title: '场景',
      dataIndex: 'sceneName',
      fixed: 'left',
      ellipsis: true,
      render: (text, record) => (
        <Button
          type="link"
          className="dashboard-v2-link"
          onClick={() =>
            history.push({
              pathname: '/knowledge/scene/' + record.sceneTemplateId,
              state: { tabLabel: text || '知识列表' },
            })
          }
        >
          {text || '未命名场景'}
        </Button>
      ),
    },
    {
      title: '知识总量',
      dataIndex: 'knowledgeCount',
      width: 100,
      align: 'right',
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '期间新增',
      dataIndex: 'newKnowledge',
      width: 100,
      align: 'right',
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '期间访问',
      dataIndex: 'viewCount',
      width: 100,
      align: 'right',
      sorter: (a, b) => numberValue(a.viewCount) - numberValue(b.viewCount),
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '活跃访客',
      dataIndex: 'activeUserCount',
      width: 100,
      align: 'right',
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '内容变更',
      dataIndex: 'changeCount',
      width: 100,
      align: 'right',
      render: (value) => numberFormatter.format(numberValue(value)),
    },
    {
      title: '待审批',
      dataIndex: 'pendingApprovalCount',
      width: 90,
      align: 'right',
      render: (value) =>
        numberValue(value) > 0 ? <Tag color="orange">{numberFormatter.format(numberValue(value))}</Tag> : '0',
    },
    {
      title: '访问效率',
      width: 180,
      render: (_, record) => {
        const maximum = Math.max(...overview.scenePerformance.map((item) => numberValue(item.viewCount)), 1);
        return (
          <Tooltip title={'期间访问 ' + numberFormatter.format(numberValue(record.viewCount)) + ' 次'}>
            <Progress
              percent={Math.round((numberValue(record.viewCount) / maximum) * 100)}
              showInfo={false}
              size="small"
              strokeColor="#1769e8"
            />
          </Tooltip>
        );
      },
    },
  ];

  const workModeLabel =
    overview.myWork.mode === 'REVIEW' ? '待我审批' : overview.myWork.mode === 'OWN' ? '我的申请' : '审批待办';

  return (
    <PageHeader title="数据看板" breadcrumb="数据看板">
      <div className="dashboard-v2">
        <section className="dashboard-v2-filterbar" aria-label="数据看板筛选条件">
          <div className="dashboard-v2-filter-main">
            <RangePicker
              value={range}
              placeholder={['开始日期', '结束日期']}
              allowClear={false}
              onChange={(value) => setRange(value as RangeValue)}
            />
            <Select
              mode="multiple"
              allowClear
              maxTagCount="responsive"
              value={sceneIds}
              className="dashboard-v2-scene-select"
              options={sceneOptions}
              placeholder="全部授权场景"
              onChange={setSceneIds}
            />
            <Select
              value={granularity}
              className="dashboard-v2-granularity"
              options={granularityOptions}
              onChange={setGranularity}
            />
            <Button type="primary" onClick={() => loadData()} loading={loading}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetFilters} disabled={loading}>
              重置
            </Button>
          </div>
          <Tooltip title="期间访问量仅统计 access_log 中 VIEW 且 SUCCESS 的知识查看记录。">
            <span className="dashboard-v2-caliber">统计口径：成功知识访问</span>
          </Tooltip>
        </section>

        <section className="dashboard-v2-kpis">
          {kpis.map((item) => (
            <div className={'dashboard-v2-kpi dashboard-v2-kpi--' + item.tone} key={item.label}>
              {loading && overview === EMPTY_OVERVIEW ? (
                <Skeleton active paragraph={false} />
              ) : (
                <>
                  <div className="dashboard-v2-kpi-head">
                    <span>{item.label}</span>
                    <span className="dashboard-v2-kpi-icon">{item.icon}</span>
                  </div>
                  <div className="dashboard-v2-kpi-value">
                    {numberFormatter.format(numberValue(item.value))}
                    <small>{item.suffix}</small>
                  </div>
                  <div className="dashboard-v2-kpi-note">{item.note}</div>
                </>
              )}
            </div>
          ))}
        </section>

        <section className="dashboard-v2-grid dashboard-v2-grid--primary">
          <Card
            title="运营趋势"
            extra={<span className="dashboard-v2-card-hint">访问 / 新增 / 变更</span>}
            className="dashboard-v2-card"
            loading={loading}
          >
            {trendHasData ? (
              <ReactECharts option={trendOption} style={{ height: 360 }} notMerge />
            ) : (
              <div className="dashboard-v2-empty dashboard-v2-empty--chart">
                <Empty description="所选周期暂无访问、新增或变更记录" />
              </div>
            )}
          </Card>

          <Card
            title={workModeLabel}
            extra={
              overview.myWork.mode !== 'NONE' ? (
                <Button type="link" size="small" onClick={() => history.push('/system/approvals')}>
                  进入审批中心
                </Button>
              ) : null
            }
            className="dashboard-v2-card dashboard-v2-work-card"
            loading={loading}
          >
            <div className="dashboard-v2-governance">
              <div><span>待处理</span><strong>{numberFormatter.format(numberValue(overview.approvalGovernance.pendingCount))}</strong></div>
              <div><span>超 24 小时</span><strong>{numberFormatter.format(numberValue(overview.approvalGovernance.overdue24hCount))}</strong></div>
              <div><span>期间通过率</span><strong>{numberValue(overview.approvalGovernance.approvalRate).toFixed(1)}%</strong></div>
              <div><span>平均处理</span><strong>{numberValue(overview.approvalGovernance.averageReviewHours).toFixed(1)}h</strong></div>
            </div>

            {overview.myWork.items.length ? (
              <div className="dashboard-v2-work-list">
                {overview.myWork.items.map((item) => (
                  <Button
                    type="text"
                    block
                    className="dashboard-v2-work-item"
                    key={item.changeRequestId}
                    onClick={() => history.push('/system/approvals')}
                  >
                    <span className="dashboard-v2-work-copy">
                      <span className="dashboard-v2-work-title">
                        <Tag color={item.requestType === 'DELETE' ? 'red' : item.requestType === 'CREATE' ? 'green' : 'blue'}>
                          {requestTypeLabels[item.requestType] || item.requestType}
                        </Tag>
                        <strong>{item.sceneName || '未命名场景'}</strong>
                      </span>
                      <span className="dashboard-v2-work-meta">
                        {overview.myWork.mode === 'REVIEW' ? '申请人：' + (item.applicantName || '未知') + ' · ' : ''}
                        等待 {numberFormatter.format(numberValue(item.waitingHours))} 小时
                      </span>
                    </span>
                    {item.overdue ? <Tag color="orange">超时</Tag> : null}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="dashboard-v2-empty dashboard-v2-empty--work">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={overview.myWork.mode === 'NONE' ? '当前账号没有审批待办权限' : '当前没有待处理事项'}
                />
              </div>
            )}

            <div className={'dashboard-v2-risk ' + (overview.riskSummary.hasRisk ? 'is-warning' : 'is-clear')}>
              {overview.riskSummary.hasRisk ? <WarningOutlined /> : <CheckCircleOutlined />}
              <span>
                {overview.riskSummary.hasRisk
                  ? '本周期失败操作 ' +
                    numberFormatter.format(numberValue(overview.riskSummary.failedOperationCount)) +
                    ' 次，超时审批 ' +
                    numberFormatter.format(numberValue(overview.riskSummary.overdueApprovalCount)) +
                    ' 项'
                  : '本周期未发现失败操作或超时审批'}
              </span>
            </div>
          </Card>
        </section>

        <section className="dashboard-v2-grid dashboard-v2-grid--secondary">
          <Card title="场景热度排行" className="dashboard-v2-card" loading={loading}>
            {rankedScenes.some((item) => numberValue(item.viewCount) > 0) ? (
              <ReactECharts option={sceneRankOption} style={{ height: 330 }} notMerge />
            ) : (
              <div className="dashboard-v2-empty dashboard-v2-empty--chart">
                <Empty description="所选周期暂无场景访问记录" />
              </div>
            )}
          </Card>

          <Card
            title="热门知识 Top 10"
            extra={<span className="dashboard-v2-card-hint">按成功访问次数排序</span>}
            className="dashboard-v2-card dashboard-v2-table-card"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              rowKey="knowledgeId"
              loading={loading}
              columns={popularColumns}
              dataSource={overview.popularKnowledge}
              pagination={false}
              size="middle"
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="所选周期暂无热门知识" /> }}
              scroll={{ x: 650 }}
            />
          </Card>
        </section>

        <section>
          <Card
            title="场景运营明细"
            extra={<span className="dashboard-v2-card-hint">所有指标均按当前授权范围过滤</span>}
            className="dashboard-v2-card dashboard-v2-table-card"
            styles={{ body: { padding: 0 } }}
          >
            <Table
              rowKey="sceneTemplateId"
              loading={loading}
              columns={sceneColumns}
              dataSource={overview.scenePerformance}
              pagination={{ pageSize: 8, showSizeChanger: false, hideOnSinglePage: true }}
              scroll={{ x: 1050 }}
            />
          </Card>
        </section>
      </div>
    </PageHeader>
  );
}
