import { CheckOutlined, LoadingOutlined, PlusOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Card, DatePicker, Form, Input, Select, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import '@wangeditor/editor/dist/css/style.css';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { authApi, businessApi, fileApi } from '@/services/api';
import {
  buildKnowledgePayload,
  buildWorkTabLabel,
  closeWorkTab,
  dictNodes,
  findKnowledgeItem,
  formatBusinessDetail,
  knowledgeDisplayTitle,
  normalizeDictFormValue,
  normalizeTagValues,
  setWorkTabLabel,
} from '@/utils/data';
import { runAfterUnsavedConfirm, useUnsavedChanges } from '@/utils/unsavedChanges';

const uploadTypes = ['picture', 'video', 'audio', 'file'];
const uploadTypeRules: Record<string, { accept: string; label: string; extensions: string[]; mimePrefix: string }> = {
  picture: {
    accept: 'image/*',
    label: '图片',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'],
    mimePrefix: 'image/',
  },
  video: {
    accept: 'video/*',
    label: '视频',
    extensions: ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.avi', '.mkv'],
    mimePrefix: 'video/',
  },
  audio: {
    accept: 'audio/*',
    label: '音频',
    extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'],
    mimePrefix: 'audio/',
  },
};

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
  if (path.startsWith('/api/data/')) return path.slice(4);
  if (path.startsWith('/data/')) return path;
  if (path.startsWith('/')) return path;
  return `/data/${path}`;
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

function uploadFileName(file: any) {
  const path = file?.response?.filePath || file?.response?.file_path || file?.url || file?.filePath || file?.file_path || file?.name || '';
  return String(path).split('?')[0].toLowerCase();
}

function isAllowedUploadFile(file: any, item: any) {
  const rule = uploadTypeRules[item.type];
  if (!rule) return true;
  const rawFile = file?.originFileObj || file;
  if (rawFile?.type && String(rawFile.type).startsWith(rule.mimePrefix)) return true;
  const name = uploadFileName(file);
  return rule.extensions.some((extension) => name.endsWith(extension));
}

function validateUploadValues(values: Record<string, any>, sceneItems: any[]) {
  for (const item of sceneItems) {
    if (!uploadTypeRules[item.type]) continue;
    const files = Array.isArray(values[item.id]) ? values[item.id] : [];
    const invalid = files.find((file: any) => !isAllowedUploadFile(file, item));
    if (invalid) {
      message.error(`${item.sceneItemName} 只能上传${uploadTypeRules[item.type].label}文件`);
      return false;
    }
  }
  return true;
}

type RichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const [editor, setEditor] = useState<IDomEditor | null>(null);

  const editorConfig = useMemo<Partial<IEditorConfig>>(() => ({
    placeholder,
    autoFocus: false,
    scroll: false,
    customAlert: (info, type) => {
      const text = info || '富文本编辑器提示';
      if (type === 'error') message.error(text);
      else if (type === 'warning') message.warning(text);
      else message.info(text);
    },
    MENU_CONF: {
      uploadImage: {
        maxFileSize: 20 * 1024 * 1024,
        allowedFileTypes: ['image/*'],
        customUpload: async (file: File, insertFn: (src: string, alt: string, href: string) => void) => {
          const uploaded = await fileApi.upload(file);
          const path = uploaded?.filePath || uploaded?.file_path;
          if (!path) {
            message.error('图片上传失败');
            return;
          }
          insertFn(fileUrl(path), file.name, '');
        },
      },
      uploadVideo: {
        maxFileSize: 200 * 1024 * 1024,
        allowedFileTypes: ['video/*'],
        customUpload: async (file: File, insertFn: (src: string, poster: string) => void) => {
          const uploaded = await fileApi.upload(file);
          const path = uploaded?.filePath || uploaded?.file_path;
          if (!path) {
            message.error('视频上传失败');
            return;
          }
          insertFn(fileUrl(path), '');
        },
      },
    },
  }), [placeholder]);

  const toolbarConfig = useMemo<Partial<IToolbarConfig>>(() => ({
    modalAppendToBody: true,
  }), []);

  useEffect(() => {
    if (!editor) return undefined;

    const syncFullscreenButton = () => {
      const container = editor.getEditableContainer().closest('.rich-text-editor');
      const fullscreenButton = container?.querySelector<HTMLButtonElement>('[data-menu-key="fullScreen"]');
      if (!fullscreenButton) return;
      const label = editor.isFullScreen ? '退出全屏（Esc）' : '全屏编辑';
      fullscreenButton.setAttribute('aria-label', label);
      fullscreenButton.setAttribute('aria-pressed', String(editor.isFullScreen));
      fullscreenButton.setAttribute('data-tooltip', label);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !editor.isFullScreen) return;
      event.preventDefault();
      event.stopPropagation();
      editor.hidePanelOrModal();
      editor.unFullScreen();
    };

    const frame = window.requestAnimationFrame(syncFullscreenButton);
    editor.on('fullScreen', syncFullscreenButton);
    editor.on('unFullScreen', syncFullscreenButton);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      editor.off('fullScreen', syncFullscreenButton);
      editor.off('unFullScreen', syncFullscreenButton);
      window.removeEventListener('keydown', handleEscape);
      editor.destroy();
    };
  }, [editor]);

  return (
    <div className="rich-text-editor is-advanced">
      <Toolbar
        editor={editor}
        defaultConfig={toolbarConfig}
        mode="default"
        className="rich-text-toolbar"
      />
      <Editor
        value={value || ''}
        defaultConfig={editorConfig}
        mode="default"
        className="rich-text-editable"
        onCreated={setEditor}
        onChange={(currentEditor) => onChange?.(currentEditor.getHtml())}
      />
    </div>
  );
}

function draftStorageKey(path: string) {
  return `knowledge-form-draft:${path}`;
}

function serializeDateValue(value: any): any {
  if (Array.isArray(value)) return value.map(serializeDateValue);
  if (dayjs.isDayjs(value)) return value.format('YYYY-MM-DD HH:mm:ss');
  return value ?? undefined;
}

function restoreDateValue(value: any, multiValue?: boolean) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const dates = values.map((date: any) => dayjs(date)).filter((date: any) => date.isValid());
  return multiValue ? dates : dates[0];
}

function serializeUploadFiles(value: any) {
  const files = Array.isArray(value) ? value : [];
  return files.map((file: any) => ({
    uid: file?.uid,
    name: file?.name,
    status: file?.status,
    url: file?.url,
    filePath: file?.filePath,
    file_path: file?.file_path,
    response: file?.response
      ? {
          filePath: file.response.filePath,
          file_path: file.response.file_path,
        }
      : undefined,
  }));
}

function serializeDraftValues(values: Record<string, any>, sceneItems: any[]) {
  const result: Record<string, any> = {};
  sceneItems.forEach((item: any) => {
    const value = values[item.id];
    if (value === undefined) return;
    if (uploadTypes.includes(item.type)) {
      result[item.id] = serializeUploadFiles(value);
      return;
    }
    if (item.type === 'datetime') {
      result[item.id] = serializeDateValue(value);
      return;
    }
    result[item.id] = value;
  });
  return result;
}

function restoreDraftValues(values: Record<string, any>, sceneItems: any[]) {
  const result: Record<string, any> = {};
  sceneItems.forEach((item: any) => {
    const value = values?.[item.id];
    if (value === undefined) return;
    if (uploadTypes.includes(item.type)) {
      result[item.id] = toUploadFiles(value || []);
      return;
    }
    if (item.type === 'datetime') {
      result[item.id] = restoreDateValue(value, item.multiValue);
      return;
    }
    result[item.id] = value;
  });
  return result;
}

function readDraft(path: string, sceneItems: any[]) {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(path));
    if (!raw) return undefined;
    return restoreDraftValues(JSON.parse(raw), sceneItems);
  } catch {
    return undefined;
  }
}

function writeDraft(path: string, values: Record<string, any>, sceneItems: any[]) {
  sessionStorage.setItem(draftStorageKey(path), JSON.stringify(serializeDraftValues(values, sceneItems)));
}

function removeDraft(path: string) {
  sessionStorage.removeItem(draftStorageKey(path));
}

export default function KnowledgeForm() {
  const { sceneId = '', id } = useParams();
  const location = useLocation();
  const routeState = location.state as { defaultDictId?: string; defaultDictFieldId?: string | number } | undefined;
  const query = new URLSearchParams(location.search);
  const defaultDictId = routeState?.defaultDictId || query.get('defaultDictId') || undefined;
  const defaultDictFieldId = routeState?.defaultDictFieldId || query.get('defaultDictFieldId') || undefined;
  const isCreate = !id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [sceneDetail, setSceneDetail] = useState<any>();
  const [knowledge, setKnowledge] = useState<any>();
  const [dirty, setDirty] = useState(false);

  const formatted = formatBusinessDetail(sceneDetail);
  const editableSceneItems = formatted.sceneItems.filter((item: any) => !item.isHide && !isSystemMaintainedDate(item));
  const currentUser = authApi.getCurrentUser();
  const isAdmin = Boolean(currentUser?.isBuiltin || currentUser?.setting?.admin || currentUser?.roleIds?.includes?.(1));
  const operationPermissions = new Set(currentUser?.setting?.operationPermissions || currentUser?.operationPermissions || []);
  const canSave = isAdmin || operationPermissions.has(isCreate ? 'knowledge:create' : 'knowledge:update');
  const saveDraft = useCallback(() => {
    writeDraft(location.pathname, form.getFieldsValue(true), editableSceneItems);
    setDirty(false);
  }, [editableSceneItems, form, location.pathname]);
  const discardDraft = useCallback(() => {
    removeDraft(location.pathname);
  }, [location.pathname]);
  const clearUnsaved = useUnsavedChanges(location.pathname, dirty, true, { saveDraft, discardDraft });

  const load = async () => {
    if (!sceneId) return;
    setLoading(true);
    try {
      const sceneRes = await businessApi.detail(sceneId);
      setSceneDetail(sceneRes);
      const scene = formatBusinessDetail(sceneRes);
      const visibleItems = scene.sceneItems.filter((item: any) => !isSystemMaintainedDate(item));
      const initial: Record<string, any> = {};
      let hasDefaultDirectory = false;
      let defaultDictItem: any;

      if (!id) {
        setWorkTabLabel(location.pathname, buildWorkTabLabel('knowledge-create', scene.scene.sceneName));
      }

      if (id) {
        const knowledge = await businessApi.knowledgeDetail(id);
        setKnowledge(knowledge || {});
        const title = knowledgeDisplayTitle(knowledge || {}, scene.sceneItems, scene.dictDetails);
        setWorkTabLabel(location.pathname, buildWorkTabLabel('knowledge-edit', title));

        visibleItems.forEach((item: any) => {
          const value = findKnowledgeItem(knowledge, item.id);
          if (item.type === 'dict') {
            initial[item.id] = normalizeDictFormValue(value?.sceneItemSelectDictTreeIds, item.multiValue);
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
          if (item.type === 'tag') {
            initial[item.id] = normalizeTagValues(value?.sceneItemValue || []);
            return;
          }
          if (item.type === 'richtext') {
            initial[item.id] = (value?.sceneItemValue || []).join('');
            return;
          }
          initial[item.id] = value?.sceneItemValue?.join('，');
        });
      } else {
        setKnowledge(undefined);
        if (defaultDictId) {
          const dictItems = visibleItems.filter((item: any) => item.type === 'dict');
          defaultDictItem =
            dictItems.find((item: any) => !defaultDictFieldId || String(item.id) === String(defaultDictFieldId)) ||
            dictItems[0];
          if (defaultDictItem) {
            initial[defaultDictItem.id] = defaultDictItem.multiValue ? [String(defaultDictId)] : String(defaultDictId);
            hasDefaultDirectory = true;
          }
        }
      }

      const draft = readDraft(location.pathname, visibleItems);
      const nextValues = draft ? { ...initial, ...draft } : initial;
      if (!id && defaultDictId && defaultDictItem) {
        nextValues[defaultDictItem.id] = defaultDictItem.multiValue ? [String(defaultDictId)] : String(defaultDictId);
      }
      form.setFieldsValue(nextValues);
      setDirty(Boolean(draft) || hasDefaultDirectory);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [sceneId, id, defaultDictId, defaultDictFieldId]);

  const submit = async (values: any) => {
    if (!isCreate && knowledge?.hasPendingChange) {
      message.warning('该知识已有待审批变更，暂不能再次保存');
      return;
    }
    if (!validateUploadValues(values, editableSceneItems)) {
      return;
    }
    const payload = buildKnowledgePayload(values, editableSceneItems);
    if (isCreate) {
      await businessApi.addKnowledge({ sceneTemplateId: Number(sceneId), knowledge: payload });
      message.success('新增成功');
      clearUnsaved();
      closeWorkTab(location.pathname);
      history.push({
        pathname: `/knowledge/scene/${sceneId}`,
        state: {
          tabLabel: buildWorkTabLabel('knowledge-list', formatted.scene.sceneName),
          replacePath: location.pathname,
        },
      });
    } else {
      await businessApi.editKnowledge({ knowledgeId: Number(id), knowledgeItem: payload });
      message.success('修改成功');
      clearUnsaved();
      history.replace({
        pathname: `/knowledge/scene/${sceneId}/detail/${id}`,
        state: {
          tabLabel: buildWorkTabLabel(
            'knowledge-detail',
            String(values[editableSceneItems.find((item: any) => item.type === 'title')?.id] || knowledgeDisplayTitle(knowledge, formatted.sceneItems, formatted.dictDetails)).trim(),
          ),
          replacePath: location.pathname,
        },
      });
    }
  };

  const renderUploadItem = (item: any): UploadProps['itemRender'] => (originNode, file) => (
    <div className={`knowledge-upload-item is-${item.type}`}>
      {originNode}
      {file.status === 'uploading' ? (
        <div className="knowledge-upload-status is-uploading">
          <LoadingOutlined />
          <span>上传中</span>
        </div>
      ) : null}
      {file.status === 'done' ? (
        <div className="knowledge-upload-status is-done">
          <CheckOutlined />
          <span>已上传</span>
        </div>
      ) : null}
    </div>
  );

  const uploadProps = (item: any): UploadProps => ({
    listType: item.type === 'picture' ? 'picture-card' : 'picture',
    multiple: Boolean(item.multiValue),
    maxCount: item.multiValue ? undefined : 1,
    accept: uploadTypeRules[item.type]?.accept,
    itemRender: renderUploadItem(item),
    beforeUpload: (file) => {
      if (isAllowedUploadFile(file, item)) {
        return true;
      }
      message.error(`${item.sceneItemName} 只能上传${uploadTypeRules[item.type].label}文件`);
      return Upload.LIST_IGNORE;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const uploaded = await fileApi.upload(file as File);
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
        disabled: node.isDisabled,
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
          className={`knowledge-form-field knowledge-upload-field is-${item.type}-upload`}
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

    if (item.type === 'title') {
      return (
        <Form.Item
          key={item.id}
          name={item.id}
          label={item.sceneItemName}
          className="knowledge-form-field knowledge-title-field is-wide"
          rules={[
            { required: item.isRequired, message: `请输入${item.sceneItemName}` },
            { max: 120, message: '知识标题不能超过120个字符' },
          ]}
        >
          <Input maxLength={120} showCount placeholder={`请输入${item.sceneItemName}`} />
        </Form.Item>
      );
    }

    if (item.type === 'tag') {
      return (
        <Form.Item key={item.id} name={item.id} label={item.sceneItemName} className="knowledge-form-field" rules={[{ required: item.isRequired }]}>
          <Select
            mode="tags"
            allowClear
            tokenSeparators={[',', '，', '、']}
            placeholder={`请输入${item.sceneItemName}`}
          />
        </Form.Item>
      );
    }

    if (item.type === 'richtext') {
      return (
        <Form.Item key={item.id} name={item.id} label={item.sceneItemName} className="knowledge-form-field is-wide" rules={[{ required: item.isRequired }]}>
          <RichTextEditor placeholder={`请输入${item.sceneItemName}`} />
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
        <Button key="back" onClick={() => runAfterUnsavedConfirm(location.pathname, () => history.push({ pathname: `/knowledge/scene/${sceneId}`, state: { tabLabel: buildWorkTabLabel('knowledge-list', formatted.scene.sceneName) } }))}>返回列表</Button>,
        canSave ? <Button key="save" type="primary" icon={<SaveOutlined />} disabled={!isCreate && knowledge?.hasPendingChange} onClick={() => form.submit()}>保存</Button> : null,
      ].filter(Boolean)}
    >
      <Card className="detail-card knowledge-form-card" loading={loading}>
        <Form form={form} layout="vertical" onFinish={submit} onValuesChange={() => setDirty(true)} className="knowledge-form-grid">
          {editableSceneItems.map(renderField)}
        </Form>
      </Card>
    </PageHeader>
  );
}
