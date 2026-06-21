import {
  AudioOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  FileOutlined,
  FileWordOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Button, Card, Descriptions, Image, Popconfirm, Space, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { authApi, businessApi } from '@/services/api';
import {
  closeWorkTab,
  displayKnowledgeValue,
  findKnowledgeItem,
  formatBusinessDetail,
  formatTime,
  knowledgeDisplayTitle,
  safeJson,
  setWorkTabLabel,
} from '@/utils/data';

type DetailItem = {
  key: string | number;
  name: string;
  type?: string;
  value: any;
  raw?: any;
};

const mediaTypes = ['picture', 'video', 'audio', 'file'];

function fileUrl(url?: string) {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  if (url.startsWith('/api/data/')) return url.slice(4);
  if (url.startsWith('/data/')) return url;
  if (url.startsWith('/')) return url;
  return `/data/${url}`;
}

function fileName(url?: string) {
  if (!url) return '附件';
  const clean = url.split('?')[0];
  return decodeURIComponent(clean.split('/').filter(Boolean).pop() || '附件');
}

function normalizeFiles(raw: any) {
  const values = raw?.sceneItemValue || [];
  const list = values.flatMap((item: any) => {
    if (typeof item !== 'string') return [item];
    const parsed = safeJson(item);
    return parsed.length > 1 || typeof parsed[0] === 'object' ? parsed : [item];
  });

  return list
    .map((item: any) => {
      if (typeof item === 'object' && item) {
        const url = item.filePath || item.file_path || item.url || item.path || item.response?.filePath;
        return {
          url: fileUrl(url),
          name: item.fileName || item.filename || item.name || fileName(url),
          size: item.size,
        };
      }
      return { url: fileUrl(String(item)), name: fileName(String(item)) };
    })
    .filter((item: any) => item.url);
}

function mediaKind(file: any, fieldType?: string) {
  const source = `${file?.name || ''} ${file?.url || ''}`.toLowerCase();
  if (fieldType === 'picture' || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(source)) return 'picture';
  if (fieldType === 'video' || /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(source)) return 'video';
  if (fieldType === 'audio' || /\.(mp3|wav|ogg|aac|m4a|flac)(\?|$)/i.test(source)) return 'audio';
  return 'file';
}

function renderFileCard(file: any) {
  const isWord = /\.(doc|docx)$/i.test(file.name);
  return (
    <a className="knowledge-file-card" key={file.url} href={file.url} target="_blank" rel="noreferrer">
      {isWord ? <FileWordOutlined /> : <FileOutlined />}
      <span>{file.name}</span>
      <DownloadOutlined />
    </a>
  );
}

function renderMediaFiles(type: string | undefined, raw: any) {
  const files = normalizeFiles(raw);
  if (!files.length) return <Typography.Text type="secondary">--</Typography.Text>;

  const pictures = files.filter((file: any) => mediaKind(file, type) === 'picture');
  const videos = files.filter((file: any) => mediaKind(file, type) === 'video');
  const audios = files.filter((file: any) => mediaKind(file, type) === 'audio');
  const attachments = files.filter((file: any) => mediaKind(file, type) === 'file');

  return (
    <div className="knowledge-resource-renderer">
      {pictures.length ? (
        <Image.PreviewGroup>
          <div className="knowledge-media-grid knowledge-picture-grid">
            {pictures.map((file: any) => (
              <Image
                key={file.url}
                className="knowledge-image-thumb"
                src={file.url}
                alt={file.name}
                fallback=""
              />
            ))}
          </div>
        </Image.PreviewGroup>
      ) : null}
      {videos.length ? (
        <div className="knowledge-media-grid">
          {videos.map((file: any) => (
            <div className="knowledge-video-box" key={file.url}>
              <video src={file.url} controls preload="metadata" />
              <div className="knowledge-file-title"><VideoCameraOutlined /> {file.name}</div>
            </div>
          ))}
        </div>
      ) : null}
      {audios.length ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          {audios.map((file: any) => (
            <div className="knowledge-audio-box" key={file.url}>
              <AudioOutlined />
              <span>{file.name}</span>
              <audio src={file.url} controls />
            </div>
          ))}
        </Space>
      ) : null}
      {attachments.length ? <div className="knowledge-file-list">{attachments.map(renderFileCard)}</div> : null}
    </div>
  );
}

function renderDetailValue(item: DetailItem) {
  if (['picture', 'video', 'audio', 'file'].includes(item.type || '')) {
    return renderMediaFiles(item.type, item.raw);
  }
  if (item.type === 'dict') return <div className="knowledge-path-value">{item.value || '--'}</div>;
  return <Typography.Paragraph className="knowledge-text-value">{item.value || '--'}</Typography.Paragraph>;
}

function renderResourceIcon(type?: string) {
  if (type === 'picture') return <PictureOutlined />;
  if (type === 'video') return <VideoCameraOutlined />;
  if (type === 'audio') return <AudioOutlined />;
  return <FileOutlined />;
}

export default function KnowledgeDetail() {
  const { sceneId = '', id = '' } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [sceneDetail, setSceneDetail] = useState<any>();
  const [knowledge, setKnowledge] = useState<any>({});

  const formatted = formatBusinessDetail(sceneDetail);
  const sceneName = formatted.scene.sceneName || '知识列表';
  const knowledgeTitle = knowledgeDisplayTitle(knowledge, formatted.sceneItems, formatted.dictDetails);
  const fallbackItems = Array.isArray(knowledge?.knowledgeShow) ? knowledge.knowledgeShow : [];
  const detailItems = formatted.sceneItems.length
    ? formatted.sceneItems.filter((item: any) => !item.isHide).map((item: any) => ({
        key: item.id,
        name: item.sceneItemName,
        type: item.type,
        value: displayKnowledgeValue(findKnowledgeItem(knowledge, item.id), item, formatted.dictDetails),
        raw: findKnowledgeItem(knowledge, item.id),
      }))
    : fallbackItems.map((item: any) => ({
        key: item.sceneItemId,
        name: item.sceneItemName,
        type: item.type,
        value: item.sceneItemValue?.length ? item.sceneItemValue.join('，') : (item.sceneItemSelectDictTreeIds || '--'),
        raw: item,
      }));
  const visibleItems = detailItems;
  const dictItems = visibleItems.filter((item: DetailItem) => item.type === 'dict');
  const mediaItems = visibleItems.filter((item: DetailItem) => mediaTypes.includes(item.type || ''));
  const normalItems = visibleItems.filter((item: DetailItem) => item.type !== 'dict' && !mediaTypes.includes(item.type || ''));
  const titleItem = normalItems.find((item) => /主题|标题|名称|title|name/i.test(item.name || ''));
  const articleTitle = titleItem?.value && titleItem.value !== '--' ? titleItem.value : knowledgeTitle || '知识详情';
  const articleItems = normalItems.filter((item) => item.key !== titleItem?.key);
  const currentUser = authApi.getCurrentUser();
  const isAdmin = Boolean(currentUser?.isBuiltin || currentUser?.setting?.admin || currentUser?.roleIds?.includes?.(1));
  const operationPermissions = new Set(currentUser?.setting?.operationPermissions || currentUser?.operationPermissions || []);
  const canUpdate = isAdmin || operationPermissions.has('knowledge:update');
  const canDelete = isAdmin || operationPermissions.has('knowledge:delete');
  const hasPendingChange = Boolean(knowledge?.hasPendingChange);
  const backToList = () => {
    closeWorkTab(location.pathname);
    history.push({
      pathname: `/knowledge/scene/${sceneId}`,
      state: { tabLabel: `${sceneName}知识列表` },
    });
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      businessApi.detail(sceneId).catch(() => undefined),
      businessApi.knowledgeDetail(id),
    ])
      .then(([sceneRes, knowledgeRes]) => {
        if (!mounted) return;
        setSceneDetail(sceneRes);
        setKnowledge(knowledgeRes || {});
        const formattedScene = formatBusinessDetail(sceneRes);
        const title = knowledgeDisplayTitle(knowledgeRes || {}, formattedScene.sceneItems, formattedScene.dictDetails);
        setWorkTabLabel(location.pathname, `${title}知识详情`);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [sceneId, id]);

  const remove = async () => {
    await businessApi.deleteKnowledge(id);
    message.success('已删除');
    backToList();
  };

  return (
    <PageHeader
      title={knowledgeTitle || '知识详情'}
      hideTitle
      breadcrumb={`知识中心 / ${sceneName} / 知识详情`}
      extra={[
        <Button
          key="back"
          onClick={backToList}
        >
          返回列表
        </Button>,
        canUpdate ? <Button
          key="edit"
          type="primary"
          icon={<EditOutlined />}
          disabled={hasPendingChange}
          onClick={() => history.push({
            pathname: `/knowledge/scene/${sceneId}/edit/${id}`,
            state: {
              tabLabel: `${knowledgeTitle}知识编辑`,
              replacePath: location.pathname,
            },
          })}
        >
          修改
        </Button> : null,
        canDelete ? <Popconfirm key="delete" title="确认删除这条知识？" disabled={hasPendingChange} onConfirm={remove}>
          <Button danger icon={<DeleteOutlined />} disabled={hasPendingChange}>删除</Button>
        </Popconfirm> : null,
      ].filter(Boolean)}
    >
      <div className="knowledge-detail-layout knowledge-detail-redesign">
        <div className="knowledge-detail-main">
          <Card className="knowledge-article-card" loading={loading}>
            <article>
              <header className="knowledge-article-header">
                <div className="knowledge-article-kicker">{sceneName}</div>
                <Typography.Title level={2}>{articleTitle}</Typography.Title>
                {dictItems.length ? (
                  <div className="knowledge-taxonomy-row">
                    {dictItems.map((item: DetailItem) => (
                      <span className="knowledge-directory-pill" key={item.key}>{item.name}：{item.value}</span>
                    ))}
                  </div>
                ) : null}
              </header>

              {articleItems.length ? (
                <div className="knowledge-article-body">
                  {articleItems.map((item: DetailItem) => (
                    <section className="knowledge-article-section" key={item.key}>
                      <Typography.Title level={4}>{item.name}</Typography.Title>
                      {renderDetailValue(item)}
                    </section>
                  ))}
                </div>
              ) : null}
            </article>

            {mediaItems.length ? (
              <section className="knowledge-article-section knowledge-article-assets">
                <Typography.Title level={4}>资源内容</Typography.Title>
                <div className="knowledge-media-section">
                {mediaItems.map((item: DetailItem) => (
                  <div className="knowledge-media-card" key={item.key}>
                    <div className="knowledge-field-label">
                      {renderResourceIcon(item.type)}
                      {item.name}
                    </div>
                    {renderDetailValue(item)}
                  </div>
                ))}
                </div>
              </section>
            ) : null}
            {!detailItems.length ? <Typography.Text type="secondary">暂无知识内容</Typography.Text> : null}
          </Card>
        </div>
        <aside className="knowledge-detail-side">
          <Card title="基础信息" className="knowledge-side-card" loading={loading}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="知识ID">{knowledge.knowledgeId || id}</Descriptions.Item>
              <Descriptions.Item label="创建人">{knowledge.creatorName || '--'}</Descriptions.Item>
              <Descriptions.Item label="点击次数">{knowledge.viewTime ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatTime(knowledge.createTime)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatTime(knowledge.updateTime)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </aside>
      </div>
    </PageHeader>
  );
}
