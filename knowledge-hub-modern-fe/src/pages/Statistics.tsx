import ReactECharts from 'echarts-for-react';
import { Card, Col, Row, Statistic, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { businessApi } from '@/services/api';

export default function Statistics() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    businessApi
      .statisticsKnowledge()
      .then((res) => {
        if (!mounted) return;
        setRows(Array.isArray(res?.content) ? res.content : []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const totalKnowledge = rows.reduce((sum, item) => sum + Number(item.knowledgeNum || 0), 0);
  const totalViews = rows.reduce((sum, item) => sum + Number(item.knowledgeViewTimeCount || 0), 0);

  const option = useMemo(
    () => ({
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0 },
      grid: { left: 40, right: 20, top: 34, bottom: 58 },
      xAxis: { type: 'category', data: rows.map((item) => item.sceneName), axisLabel: { interval: 0 } },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          name: '知识数量',
          type: 'bar',
          data: rows.map((item) => item.knowledgeNum || 0),
          itemStyle: { color: '#1769e8', borderRadius: [6, 6, 0, 0] },
        },
        {
          name: '历史点击量',
          type: 'bar',
          data: rows.map((item) => item.knowledgeViewTimeCount || 0),
          itemStyle: { color: '#16a05d', borderRadius: [6, 6, 0, 0] },
        },
      ],
    }),
    [rows],
  );

  const columns: ColumnsType<any> = [
    { title: '场景', dataIndex: 'sceneName' },
    { title: '知识数量', dataIndex: 'knowledgeNum' },
    { title: '历史点击量', dataIndex: 'knowledgeViewTimeCount' },
  ];

  return (
    <PageHeader title="数据展板" breadcrumb="数据展板">
      <Row gutter={16} style={{ marginBottom: 18 }}>
        <Col span={8}>
          <Card>
            <Statistic title="场景总数" value={rows.length} loading={loading} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="知识总数" value={totalKnowledge} loading={loading} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="历史点击量" value={totalViews} loading={loading} />
          </Card>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={14}>
          <Card title="按场景统计" className="detail-card" loading={loading}>
            <ReactECharts option={option} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="统计明细" className="modern-table-card" bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="sceneName"
              loading={loading}
              columns={columns}
              dataSource={rows}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </PageHeader>
  );
}
