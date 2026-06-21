import { SearchOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Empty, Form, Input, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { businessApi, sceneApi } from '@/services/api';
import { formatTime } from '@/utils/data';

export default function KnowledgeCenter() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [scenes, setScenes] = useState<any[]>([]);
  const [sceneStats, setSceneStats] = useState<Record<string, any>>({});

  const todayKey = new Date().toDateString();

  const openScene = (scene: any) => {
    history.push({
      pathname: `/knowledge/scene/${scene.sceneTemplateId}`,
      state: { tabLabel: `${scene.sceneName}知识列表` },
    });
  };

  const loadScenes = async (values: any = {}) => {
    setLoading(true);
    try {
      const res = await sceneApi.list({ searchSceneDisabled: 'enabled', ...values });
      const sceneRows = Array.isArray(res?.content) ? res.content : [];
      setScenes(sceneRows);

      const statsEntries = await Promise.all(
        sceneRows.map(async (scene: any) => {
          const list = await businessApi.knowledgeList({
            sceneTemplateId: scene.sceneTemplateId,
            pageNumber: 1,
            pageSize: 100,
          });
          const content = Array.isArray(list?.content) ? list.content : [];
          const todayCount = content.filter((item: any) => {
            if (!item.updateTime) return false;
            return new Date(Number(item.updateTime) * 1000).toDateString() === todayKey;
          }).length;
          return [
            scene.sceneTemplateId,
            {
              knowledgeNum: Number(list?.totalElements || content.length || 0),
              todayUpdate: todayCount,
            },
          ];
        }),
      );
      setSceneStats(Object.fromEntries(statsEntries));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  return (
    <PageHeader title="知识中心" breadcrumb="知识中心" hideHeader>
      <div className="legacy-business-page">
        <Form
          form={form}
          layout="inline"
          initialValues={{ searchSceneDisabled: 'enabled' }}
          onFinish={loadScenes}
          className="legacy-business-filter"
        >
          <Form.Item name="searchSceneName" label="业务名称">
            <Input allowClear placeholder="请输入业务名称" style={{ width: 280 }} />
          </Form.Item>
          <Form.Item name="searchSceneDisabled" label="状态">
            <Select
              style={{ width: 160 }}
              options={[
                { value: 'enabled', label: '正常' },
                { value: 'disabled', label: '已禁用' },
                { value: '', label: '全部' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>查询</Button>
              <Button onClick={() => { form.resetFields(); loadScenes(); }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>

        <div className="legacy-business-grid">
          {scenes.map((scene: any) => (
            <Card
              key={scene.sceneTemplateId}
              loading={loading}
              hoverable
              className="legacy-business-card"
              bodyStyle={{ padding: 0 }}
              onClick={() => openScene(scene)}
            >
              <div className="legacy-business-card-head">
                <div className="legacy-business-title">{scene.sceneName}</div>
                <StatusTag disabled={scene.sceneIsDisabled} />
              </div>
              <div className="legacy-business-card-body">
                <span>{scene.creatorName || 'admin'}</span>
                <span>{formatTime(scene.updateTime)}</span>
              </div>
              <div className="legacy-business-stats">
                <span>知识 {sceneStats[scene.sceneTemplateId]?.knowledgeNum ?? 0}</span>
                <span>今日更新 {sceneStats[scene.sceneTemplateId]?.todayUpdate ?? 0}</span>
              </div>
            </Card>
          ))}
        </div>

        {!loading && scenes.length === 0 ? (
          <Card className="detail-card">
            <Empty description="暂无业务数据" />
          </Card>
        ) : null}
      </div>
    </PageHeader>
  );
}
