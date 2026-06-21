import { PlusOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Card, DatePicker, Form, Input, Select, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { authApi, businessApi, fileApi } from '@/services/api';
import {
  buildKnowledgePayload,
  dictNodes,
  findKnowledgeItem,
  formatBusinessDetail,
  knowledgeDisplayTitle,
  safeJson,
  setWorkTabLabel,
} from '@/utils/data';

const uploadTypes = ['picture', 'video', 'audio', 'file'];

function isSystemMaintainedDate(item: any) {
  return item?.type === 'datetime' && /更新|update/i.test(item?.sceneItemName || '');
}

function filePath(url?: string) {
  if (!url) return '';
  if (url.startsWith('/api/data/')) return url.slice(4);
  if (url.startsWith('/data/')) return url;
  return url;
}

function fileUrl(url?: string) {
  const path = filePath(url);
  if (!path) return '';
  if (/^(https?:|blob:|data:)/.test(path)) return path;
  if (path.startsWith('/api')) return path;
  if (path.startsWith('/')) return `/api${path}`;
  return `/api/${path}`;
}

function fileName(url?: string) {
  if (!url) return 'file';
  const clean = url.split('?')[0];
  return decodeURIComponent(clean.split('/').filter(Boolean).pop() || 'file');
}

function toUploadFiles(values: any[] = []): UploadFile[] {
  return values.filter(Boolean).map((value, index) => {
    const path = typeof value === 'string'
      ? value
      : value?.filePath || value?.file_path || value?.url || value?.path || value?.response?.filePath;
    return {
      uid: `${index}-${path}`,
      name: value?.fileName || value?.filename || value?.name || fileName(path),
      status: 'done',
      url: fileUrl(path),
      response: { filePath: filePath(path), file_path: filePath(path) },
    };
  });
}

function normalizeUploadEvent(event: any) {
  return Array.isArray(event) ? event : event?.fileList || [];
}

export default function KnowledgeForm() {
  const { sceneId = '', id } = useParams();
  const location = useLocation();
  const isCreate = !id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sceneDetail, setSceneDetail] = useState<any>();

  const formatted = formatBusinessDetail(sceneDetail);
  const editableSceneItems = formatted.sceneItems.filter((item: any) => !item.isHide && !isSystemMaintainedDate(item));
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

      scene.sceneItems.filter((item: any) => !isSystemMaintainedDate(item)).forEach((item: any) => {
        const value = findKnowledgeItem(knowledge, item.id);
        if (item.type === 'dict') {
          const ids = safeJson(value?.sceneItemSelectDictTreeIds).flat(Infinity).map(String);
          initial[item.id] = item.multiValue ? ids : ids[0];
          return;
        }
        if (uploadTypes.includes(item.type)) {
          initial[item.id] = toUploadFiles(value?.sceneItemValue || []);
          return;
        }
        if (item.type === 'datetime') {
          const values = value?.sceneItemValue || [];
          initial[item.id] = item.multiValue
            ? values.slice(0, 2).map((date: string) => dayjs(date)).filter((date: any) => date.isValid())
            : values[0] ? dayjs(values[0]) : undefined;
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
    const payload = buildKnowledgePayload(values, editableSceneItems);
    if (isCreate) {
      await businessApi.addKnowledge({ sceneTemplateId: Number(sceneId), knowledge: payload });
      message.success('新增成功');
    } else {
      await businessApi.editKnowledge({ knowledgeId: Number(id), knowledgeItem: payload });
      message.success('保存成功');
    }
    history.push({ pathname: `/knowledge/scene/${sceneId}`, state: { tabLabel: formatted.scene.sceneName || '知识列表' } });
  };

  const uploadProps = (item: any): UploadProps => ({
    listType: item.type === 'picture' ? 'picture-card' : 'picture',
    multiple: Boolean(item.multiValue),
    maxCount: item.multiValue ? undefined : 1,
    accept: item.type === 'picture'
      ? 'image/*'
      : item.type === 'video'
        ? 'video/*'
        : item.type === 'audio'
          ? 'audio/*'
          : undefined,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const uploaded = await fileApi.upload(file as File);
        message.success(`${(file as File).name} 上传成功`);
        onSuccess?.(uploaded);
      } catch (error: any) {
        message.error(error?.message || `${(file as File).name} 上传失败`);
        onError?.(error);
      }
    },
  });

  const renderField = (item: any) => {
    if (item.type === 'dict') {
      const options = dictNodes(item, formatted.dictDetails).map((node: any) => ({
        value: String(node.id),
        label: `${'　'.repeat(node.level || 0)}${node.name}`,
      }));
      return (
        <Form.Item key={item.id} name={item.id} label={item.sceneItemName} className="knowledge-form-field" rules={[{ required: item.isRequired }]}>
          <Select mode={item.multiValue ? 'multiple' : undefined} allowClear options={options} placeholder="请选择目录" />
        </Form.Item>
      );
    }

    if (uploadTypes.includes(item.type)) {
      return (
        <Form.Item
          key={item.id}
          name={item.id}
          label={item.sceneItemName}
          className="knowledge-form-field"
          valuePropName="fileList"
          getValueFromEvent={normalizeUploadEvent}
          rules={[{ required: item.isRequired, message: `请上传${item.sceneItemName}` }]}
        >
          <Upload {...uploadProps(item)}>
            {item.type === 'picture' ? (
              <div>
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传</div>
              </div>
            ) : (
              <Button icon={<UploadOutlined />}>上传{item.sceneItemName}</Button>
            )}
          </Upload>
        </Form.Item>
      );
    }

    if (item.type === 'datetime') {
      return (
        <Form.Item key={item.id} name={item.id} label={item.sceneItemName} className="knowledge-form-field" rules={[{ required: item.isRequired }]}>
          {item.multiValue ? (
            <DatePicker.RangePicker showTime style={{ width: '100%' }} />
          ) : (
            <DatePicker showTime style={{ width: '100%' }} />
          )}
        </Form.Item>
      );
    }

    const isWide = /内容|说明|描述|content|description/i.test(item.sceneItemName || '');
    return (
      <Form.Item key={item.id} name={item.id} label={item.sceneItemName} className={`knowledge-form-field ${isWide ? 'is-wide' : ''}`} rules={[{ required: item.isRequired }]}>
        {isWide ? (
          <Input.TextArea rows={6} placeholder={`请输入${item.sceneItemName}`} />
        ) : (
          <Input placeholder={`请输入${item.sceneItemName}`} />
        )}
      </Form.Item>
    );
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
      <Card className="detail-card knowledge-form-card" loading={loading}>
        <Form form={form} layout="vertical" onFinish={submit} className="knowledge-form-grid">
          {editableSceneItems.map(renderField)}
        </Form>
      </Card>
    </PageHeader>
  );
}
