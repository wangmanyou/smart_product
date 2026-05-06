import { DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import { history, useParams, useRequest } from '@umijs/max';
import { Button, Card, Upload, message } from 'antd';
import PageHeader from '@/components/PageHeader';
import { businessApi, fileApi } from '@/services/api';
import { formatBusinessDetail } from '@/utils/data';

export default function ImportKnowledge() {
  const { sceneId = '' } = useParams();
  const sceneReq = useRequest(() => businessApi.detail(sceneId));
  const formatted = formatBusinessDetail(sceneReq.data);

  const downloadTemplate = async () => {
    const result = await businessApi.exportTemplate(sceneId);
    if (result?.filePath) window.location.href = `/api${result.filePath}`;
  };

  return (
    <PageHeader
      title="批量导入知识"
      breadcrumb={`知识中心 / ${formatted.scene.sceneName || ''} / 批量导入`}
      description="请先下载当前场景模板，按模板字段填写后上传。"
      extra={[
        <Button key="back" onClick={() => history.push(`/knowledge/scene/${sceneId}`)}>返回列表</Button>,
        <Button key="template" icon={<DownloadOutlined />} onClick={downloadTemplate}>下载模板</Button>,
      ]}
    >
      <Card className="detail-card">
        <Upload.Dragger
          maxCount={1}
          accept=".xlsx,.xls"
          customRequest={async ({ file, onSuccess, onError }) => {
            try {
              const uploaded = await fileApi.upload(file as File);
              await businessApi.importData({ sceneTemplateId: Number(sceneId), filePath: uploaded.filePath || uploaded.file_path });
              message.success('导入成功');
              onSuccess?.(uploaded);
              history.push(`/knowledge/scene/${sceneId}`);
            } catch (error: any) {
              message.error(error?.message || '导入失败');
              onError?.(error);
            }
          }}
        >
          <p className="ant-upload-drag-icon"><UploadOutlined /></p>
          <p className="ant-upload-text">点击或拖拽 Excel 到此区域上传</p>
          <p className="ant-upload-hint">支持 .xlsx / .xls，字段请与导入模板保持一致。</p>
        </Upload.Dragger>
      </Card>
    </PageHeader>
  );
}
