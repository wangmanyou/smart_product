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
import { Button, Card, Col, Descriptions, Image, Popconfirm, Row, Space, Tag, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { businessApi } from '@/services/api';
import {
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

function fileUrl(url?: string) {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  if (url.startsWith('/api')) return url;
  if (url.startsWith('/')) return `/api${url}`;
  return `/api/${url}`;
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

function renderMediaFiles(type: string | undefined, raw: any) {
  const files = normalizeFiles(raw);
  if (!files.length) return <Typography.Text type="secondary">--</Typography.Text>;

  if (type === 'picture') {
    return (
      <Image.PreviewGroup>
        <div className="knowledge-media-grid">
          {files.map((file: any) => (
            <Image
              key={file.url}
              className="knowledge-image-thumb"
              width={96}
              height={72}
              src={file.url}
              alt={file.name}
              fallback=""
            />
          ))}
        </div>
      </Image.PreviewGroup>
    );
  }

  if (type === 'video') {
    return (
      <div className="knowledge-media-grid">
        {files.map((file: any) => (
          <div className="knowledge-video-box" key={file.url}>
            <video src={file.url} controls preload="metadata" />
            <div className="knowledge-file-title"><VideoCameraOutlined /> {file.name}</div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <Space direction="vertical" style={{ width: '100%' }}>
        {files.map((file: any) => (
          <div className="knowledge-audio-box" key={file.url}>
            <AudioOutlined />
            <audio src={file.url} controls />
          </div>
        ))}
      </Space>
    );
  }

  return (
    <div className="knowledge-file-list">
      {files.map((file: any) => {
        const isWord = /\.(doc|docx)$/i.test(file.name);
        return (
          <a className="knowledge-file-card" key={file.url} href={file.url} target="_blank" rel="noreferrer">
            {isWord ? <FileWordOutlined /> : <FileOutlined />}
            <span>{file.name}</span>
            <DownloadOutlined />
          </a>
        );
      })}
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
  const dictItems = detailItems.filter((item: DetailItem) => item.type === 'dict');
  const mediaItems = detailItems.filter((item: DetailItem) => ['picture', 'video', 'audio', 'file'].includes(item.type || ''));
  const normalItems = detailItems.filter((item: DetailItem) => item.type !== 'dict' && !['picture', 'video', 'audio', 'file'].includes(item.type || ''));

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
    history.push({ pathname: `/knowledge/scene/${sceneId}`, state: { tabLabel: `${sceneName}知识列表` } });
  };

  return (
    <PageHeader
      title={knowledgeTitle || '知识详情'}
      breadcrumb={`知识中心 / ${sceneName} / 知识详情`}
      extra={[
        <Button key="back" onClick={() => history.push({ pathname: `/knowledge/scene/${sceneId}`, state: { tabLabel: `${sceneName}知识列表` } })}>返回列表</Button>,
        <Button
          key="edit"
          type="primary"
          icon={<EditOutlined />}
          onClick={() => history.push({
            pathname: `/knowledge/scene/${sceneId}/edit/${id}`,
            state: {
              tabLabel: `${knowledgeTitle}知识编辑`,
              replacePath: location.pathname,
            },
          })}
        >
          修改
        </Button>,
        <Popconfirm key="delete" title="确认删除这条知识？" onConfirm={remove}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>,
      ]}
    >
      <Row gutter={20} className="knowledge-detail-layout">
        <Col flex="auto">
          <Card className="knowledge-detail-card" title="知识内容" loading={loading}>
            {dictItems.map((item: DetailItem) => (
              <div className="knowledge-path-panel" key={item.key}>
                <div className="knowledge-field-label">{item.name}</div>
                {renderDetailValue(item)}
              </div>
            ))}

            <div className="knowledge-field-grid">
              {normalItems.map((item: DetailItem) => (
                <div
                  className={`knowledge-field-card ${String(item.value || '').length > 80 ? 'is-wide' : ''}`}
                  key={item.key}
                >
                  <div className="knowledge-field-label">{item.name}</div>
                  {renderDetailValue(item)}
                </div>
              ))}
            </div>

            {mediaItems.length ? (
              <div className="knowledge-media-section">
                {mediaItems.map((item: DetailItem) => (
                  <div className="knowledge-media-card" key={item.key}>
                    <div className="knowledge-field-label">
                      {item.type === 'picture' ? <PictureOutlined /> : null}
                      {item.type === 'video' ? <VideoCameraOutlined /> : null}
                      {item.type === 'audio' ? <AudioOutlined /> : null}
                      {item.type === 'file' ? <FileOutlined /> : null}
                      {item.name}
                    </div>
                    {renderDetailValue(item)}
                  </div>
                ))}
              </div>
            ) : null}
            {!detailItems.length ? <Typography.Text type="secondary">暂无知识内容</Typography.Text> : null}
          </Card>
        </Col>
        <Col flex="360px">
          <Card title="基础信息" className="knowledge-side-card" loading={loading}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="知识ID">{knowledge.knowledgeId || id}</Descriptions.Item>
              <Descriptions.Item label="创建人">{knowledge.creatorName || '--'}</Descriptions.Item>
              <Descriptions.Item label="点击次数">{knowledge.viewTime ?? '--'}</Descriptions.Item>
              <Descriptions.Item label="创建时间">{formatTime(knowledge.createTime)}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{formatTime(knowledge.updateTime)}</Descriptions.Item>
            </Descriptions>
            <Tag color="blue">更新时间由系统自动维护</Tag>
          </Card>
        </Col>
      </Row>
    </PageHeader>
  );
}
