import { SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Button, Card, Form, Input, Select, Space, message } from 'antd';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { authApi, businessApi } from '@/services/api';
import {
  buildKnowledgePayload,
  dictNodes,
  findKnowledgeItem,
  formatBusinessDetail,
  knowledgeDisplayTitle,
  safeJson,
  setWorkTabLabel,
} from '@/utils/data';

export default function KnowledgeForm() {
  const { sceneId = '', id } = useParams();
  const location = useLocation();
  const isCreate = !id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sceneDetail, setSceneDetail] = useState<any>();

  const formatted = formatBusinessDetail(sceneDetail);
  const currentUser = authApi.getCurrentUser();
  const isAdmin = Boolean(currentUser?.isBuiltin || currentUser?.roleId === 1 || currentUser?.roleIds?.includes?.(1));
  const operationPermissions = new Set(currentUser?.setting?.operationPermissions || currentUser?.operationPermissions || []);
  const canSave = isAdmin || operationPermissions.has(isCreate ? 'knowledge:create' : 'knowledge:update');

  const load = async () => {
    if (!sceneId) return;
    setLoading(true);
    try {
      const sceneRes = await businessApi.detail(sceneId);
      setSceneDetail(sceneRes);
      if (!id) return;

      const knowledge = await businessApi.knowledgeDetail(id);
      const scene = formatBusinessDetail(sceneRes);
      const title = knowledgeDisplayTitle(knowledge || {}, scene.sceneItems, scene.dictDetails);
      setWorkTabLabel(location.pathname, `${title}知识编辑`);
      const initial: Record<string, any> = {};
      scene.sceneItems.forEach((item: any) => {
        const value = findKnowledgeItem(knowledge, item.id);
        if (item.type === 'dict') {
          const ids = safeJson(value?.sceneItemSelectDictTreeIds).flat(Infinity).map(String);
          initial[item.id] = item.multiValue ? ids : ids[0];
          return;
        }
        initial[item.id] = value?.sceneItemValue?.join('，');
      });
      form.setFieldsValue(initial);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sceneId, id]);

  const submit = async (values: any) => {
    const payload = buildKnowledgePayload(values, formatted.sceneItems);
    if (isCreate) {
      await businessApi.addKnowledge({ sceneTemplateId: Number(sceneId), knowledge: payload });
      message.success('新增成功');
    } else {
      await businessApi.editKnowledge({ knowledgeId: Number(id), knowledgeItem: payload });
      message.success('保存成功');
    }
    history.push({ pathname: `/knowledge/scene/${sceneId}`, state: { tabLabel: formatted.scene.sceneName || '知识列表' } });
  };

  return (
    <PageHeader
      title={isCreate ? '新增知识' : '编辑知识'}
      breadcrumb={`知识中心 / ${formatted.scene.sceneName || ''} / ${isCreate ? '新增知识' : '编辑知识'}`}
      extra={[
        <Button key="back" onClick={() => history.push({ pathname: `/knowledge/scene/${sceneId}`, state: { tabLabel: formatted.scene.sceneName || '知识列表' } })}>返回列表</Button>,
        canSave ? <Button key="save" type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>保存</Button> : null,
      ].filter(Boolean)}
    >
      <Alert
        style={{ marginBottom: 18 }}
        type="info"
        showIcon
        message="编辑过程支持浏览器本地草稿扩展；更新时间由系统保存时自动维护。"
      />
      <Card className="detail-card" loading={loading}>
        <Form form={form} layout="vertical" onFinish={submit}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {formatted.sceneItems.filter((item: any) => !item.isHide).map((item: any) => {
              if (item.type === 'dict') {
                const options = dictNodes(item, formatted.dictDetails).map((node: any) => ({
                  value: String(node.id),
                  label: `${'　'.repeat(node.level || 0)}${node.name}`,
                }));
                return (
                  <Form.Item key={item.id} name={item.id} label={item.sceneItemName} rules={[{ required: item.isRequired }]}>
                    <Select mode={item.multiValue ? 'multiple' : undefined} allowClear options={options} placeholder="请选择目录" />
                  </Form.Item>
                );
              }
              return (
                <Form.Item key={item.id} name={item.id} label={item.sceneItemName} rules={[{ required: item.isRequired }]}>
                  {item.sceneItemName?.includes('内容') ? <Input.TextArea rows={6} placeholder={`请输入${item.sceneItemName}`} /> : <Input placeholder={`请输入${item.sceneItemName}`} />}
                </Form.Item>
              );
            })}
          </Space>
        </Form>
      </Card>
    </PageHeader>
  );
}
