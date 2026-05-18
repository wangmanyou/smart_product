import {
  BookOutlined,
  DatabaseOutlined,
  EyeOutlined,
  ReloadOutlined,
  RiseOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { Button, Card, DatePicker, Empty, Progress, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { businessApi } from '@/services/api';

const { RangePicker } = DatePicker;

type RangeValue = [Dayjs, Dayjs] | null;

type StatisticsRow = {
  sceneName?: string;
  knowledgeNum?: number | string;
  knowledgeViewTimeCount?: number | string;
};

function numberValue(value: unknown) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function percent(part: number, total: number) {
  return total > 0 ? Number(((part / total) * 100).toFixed(1)) : 0;
}

function formatRange(range: RangeValue) {
  if (!range) return undefined;
  return [
    range[0].startOf('day').format('YYYY-MM-DD HH:mm:ss'),
    range[1].endOf('day').format('YYYY-MM-DD HH:mm:ss'),
  ];
}

function shortName(name: string) {
  return name.length > 8 ? `${name.slice(0, 8)}...` : name;
}

export default function Statistics() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StatisticsRow[]>([]);
  const [range, setRange] = useState<RangeValue>(null);
  const [sceneName, setSceneName] = useState('all');

  const loadData = async (nextRange = range) => {
    setLoading(true);
    try {
      const res = await businessApi.statisticsKnowledge({
        searchCreateTime: formatRange(nextRange),
      });
      setRows(Array.isArray(res?.content) ? res.content : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sceneOptions = useMemo(
    () => [
      { label: '全部场景', value: 'all' },
      ...rows.map((item) => ({
        label: item.sceneName || '未命名场景',
        value: item.sceneName || '未命名场景',
      })),
    ],
    [rows],
  );

  const filteredRows = useMemo(
    () => (sceneName === 'all' ? rows : rows.filter((item) => (item.sceneName || '未命名场景') === sceneName)),
    [rows, sceneName],
  );

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort(
        (a, b) =>
          numberValue(b.knowledgeNum) - numberValue(a.knowledgeNum) ||
          numberValue(b.knowledgeViewTimeCount) - numberValue(a.knowledgeViewTimeCount),
      ),
    [filteredRows],
  );

  const totalKnowledge = filteredRows.reduce((sum, item) => sum + numberValue(item.knowledgeNum), 0);
  const totalViews = filteredRows.reduce((sum, item) => sum + numberValue(item.knowledgeViewTimeCount), 0);
  const activeScenes = filteredRows.filter((item) => numberValue(item.knowledgeNum) > 0).length;
  const avgViews = totalKnowledge > 0 ? Number((totalViews / totalKnowledge).toFixed(1)) : 0;
  const leadingScene = sortedRows[0]?.sceneName || '暂无数据';

  const kpis = [
    {
      label: '场景总数',
      value: filteredRows.length,
      suffix: '个',
      note: `${activeScenes} 个场景已有知识`,
      icon: <DatabaseOutlined />,
      tone: 'blue',
    },
    {
      label: '知识总数',
      value: totalKnowledge,
      suffix: '条',
      note: `当前领先：${leadingScene}`,
      icon: <BookOutlined />,
      tone: 'green',
    },
    {
      label: '历史点击量',
      value: totalViews,
      suffix: '次',
      note: `平均 ${avgViews} 次/知识`,
      icon: <EyeOutlined />,
      tone: 'amber',
    },
    {
      label: '活跃场景率',
      value: percent(activeScenes, filteredRows.length),
      suffix: '%',
      note: '按已有知识的场景计算',
      icon: <RiseOutlined />,
      tone: 'slate',
    },
  ];

  const trendOption = useMemo(
    () => ({
      color: ['#1769e8', '#13a06f'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { top: 0, right: 8, itemWidth: 12, itemHeight: 8 },
      grid: { left: 48, right: 52, top: 54, bottom: sortedRows.length > 5 ? 72 : 48 },
      xAxis: {
        type: 'category',
        data: sortedRows.map((item) => item.sceneName || '未命名场景'),
        axisTick: { alignWithLabel: true },
        axisLabel: {
          interval: 0,
          rotate: sortedRows.length > 5 ? 24 : 0,
          color: '#64748b',
          formatter: shortName,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: '知识',
          minInterval: 1,
          axisLabel: { color: '#64748b' },
          splitLine: { lineStyle: { color: '#e8eef7' } },
        },
        {
          type: 'value',
          name: '点击',
          minInterval: 1,
          axisLabel: { color: '#64748b' },
          splitLine: { show: false },
        },
      ],
      dataZoom:
        sortedRows.length > 8
          ? [
              { type: 'inside', start: 0, end: 70 },
              { type: 'slider', height: 18, bottom: 18, borderColor: '#d7e1ee' },
            ]
          : [],
      series: [
        {
          name: '知识数量',
          type: 'bar',
          barMaxWidth: 34,
          data: sortedRows.map((item) => numberValue(item.knowledgeNum)),
          itemStyle: { borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '历史点击量',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          symbolSize: 7,
          data: sortedRows.map((item) => numberValue(item.knowledgeViewTimeCount)),
          lineStyle: { width: 3 },
        },
      ],
    }),
    [sortedRows],
  );

  const rankRows = useMemo(
    () =>
      [...filteredRows]
        .sort(
          (a, b) =>
            numberValue(b.knowledgeViewTimeCount) - numberValue(a.knowledgeViewTimeCount) ||
            numberValue(b.knowledgeNum) - numberValue(a.knowledgeNum),
        )
        .slice(0, 6)
        .reverse(),
    [filteredRows],
  );

  const rankOption = useMemo(
    () => ({
      color: ['#1769e8'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 92, right: 24, top: 18, bottom: 24 },
      xAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: '#e8eef7' } },
      },
      yAxis: {
        type: 'category',
        data: rankRows.map((item) => item.sceneName || '未命名场景'),
        axisLabel: { color: '#334155', formatter: shortName },
      },
      series: [
        {
          name: '历史点击量',
          type: 'bar',
          barWidth: 14,
          data: rankRows.map((item) => numberValue(item.knowledgeViewTimeCount)),
          itemStyle: { borderRadius: [0, 6, 6, 0] },
        },
      ],
    }),
    [rankRows],
  );

  const pieOption = useMemo(
    () => ({
      color: ['#1769e8', '#13a06f', '#f59e0b', '#64748b', '#8b5cf6', '#ef4444'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll' },
      series: [
        {
          name: '知识占比',
          type: 'pie',
          radius: ['54%', '74%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: { formatter: '{b}\n{d}%', color: '#334155' },
          labelLine: { length: 12, length2: 8 },
          data: sortedRows.map((item) => ({
            name: item.sceneName || '未命名场景',
            value: numberValue(item.knowledgeNum),
          })),
        },
      ],
    }),
    [sortedRows],
  );

  const columns: ColumnsType<StatisticsRow> = [
    {
      title: '场景',
      dataIndex: 'sceneName',
      fixed: 'left',
      ellipsis: true,
      render: (text) => <span className="dashboard-scene-name">{text || '未命名场景'}</span>,
    },
    {
      title: '知识数量',
      align: 'right',
      width: 110,
      render: (_, record) => numberValue(record.knowledgeNum),
    },
    {
      title: '点击量',
      align: 'right',
      width: 110,
      render: (_, record) => numberValue(record.knowledgeViewTimeCount),
    },
    {
      title: '点击/知识',
      align: 'right',
      width: 120,
      render: (_, record) => {
        const knowledge = numberValue(record.knowledgeNum);
        return knowledge > 0 ? (numberValue(record.knowledgeViewTimeCount) / knowledge).toFixed(1) : '0';
      },
    },
    {
      title: '知识占比',
      width: 180,
      render: (_, record) => (
        <Progress
          percent={percent(numberValue(record.knowledgeNum), totalKnowledge)}
          size="small"
          strokeColor="#1769e8"
        />
      ),
    },
  ];

  return (
    <PageHeader title="数据看板" breadcrumb="数据看板">
      <div className="dashboard-page">
        <section className="dashboard-toolbar">
          <div>
            <div className="dashboard-title">数据看板</div>
            <div className="dashboard-subtitle">按时间和场景汇总知识规模、点击表现与场景占比</div>
          </div>
          <div className="dashboard-toolbar-main">
            <RangePicker
              value={range}
              placeholder={['开始日期', '结束日期']}
              allowClear={false}
              onChange={(value) => {
                const nextRange = value as RangeValue;
                setRange(nextRange);
                loadData(nextRange);
              }}
            />
            <Select
              value={sceneName}
              className="dashboard-scene-select"
              options={sceneOptions}
              onChange={setSceneName}
            />
            <Button icon={<ReloadOutlined />} onClick={() => loadData()} loading={loading}>
              刷新
            </Button>
          </div>
        </section>

        <section className="dashboard-kpi-grid">
          {kpis.map((item) => (
            <div className={`dashboard-kpi-card dashboard-kpi-${item.tone}`} key={item.label}>
              <div className="dashboard-kpi-head">
                <span>{item.label}</span>
                <span className="dashboard-kpi-icon">{item.icon}</span>
              </div>
              <div className="dashboard-kpi-value">
                {item.value}
                <small>{item.suffix}</small>
              </div>
              <div className="dashboard-kpi-note">{item.note}</div>
            </div>
          ))}
        </section>

        <section className="dashboard-grid">
          <Card title="知识规模与点击表现" className="dashboard-card" loading={loading}>
            {sortedRows.length ? (
              <ReactECharts option={trendOption} style={{ height: 390 }} />
            ) : (
              <div className="dashboard-chart-empty">
                <Empty description="暂无统计数据" />
              </div>
            )}
          </Card>
          <Card title="热门场景排行" className="dashboard-card" loading={loading}>
            {rankRows.length ? (
              <ReactECharts option={rankOption} style={{ height: 390 }} />
            ) : (
              <div className="dashboard-chart-empty">
                <Empty description="暂无排行数据" />
              </div>
            )}
          </Card>
        </section>

        <section className="dashboard-grid dashboard-grid-secondary">
          <Card title="场景知识占比" className="dashboard-card" loading={loading}>
            {totalKnowledge > 0 ? (
              <ReactECharts option={pieOption} style={{ height: 360 }} />
            ) : (
              <div className="dashboard-chart-empty">
                <Empty description="暂无知识占比" />
              </div>
            )}
          </Card>
          <Card title="场景明细" className="dashboard-card dashboard-table-card" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey={(record) => record.sceneName || '未命名场景'}
              loading={loading}
              columns={columns}
              dataSource={sortedRows}
              pagination={{ pageSize: 6, showSizeChanger: false }}
              scroll={{ x: 720 }}
            />
          </Card>
        </section>
      </div>
    </PageHeader>
  );
}
