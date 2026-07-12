import {
  CheckCircleOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams, useRequest } from '@umijs/max';
import { Button, Modal, Radio, Space, Tag, Typography, Upload, message } from 'antd';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { businessApi, fileApi } from '@/services/api';
import { buildWorkTabLabel, formatBusinessDetail, setWorkTabLabel } from '@/utils/data';

const metricItems = [
  { key: 'totalRows', label: '读取行数' },
  { key: 'importedRows', label: '直接导入' },
  { key: 'pendingRows', label: '提交审批' },
  { key: 'skippedRows', label: '跳过行数' },
];

export default function ImportKnowledge() {
  const { sceneId = '' } = useParams();
  const location = useLocation();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>();
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateType, setTemplateType] = useState<'normal' | 'directory'>('normal');
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const sceneReq = useRequest(() => businessApi.detail(sceneId));
  const formatted = formatBusinessDetail(sceneReq.data);
  const visibleItems = formatted.sceneItems.filter((item: any) => !item.isHide);
  const directoryItems = visibleItems.filter((item: any) => item.type === 'dict');
  const hasRequiredDirectoryItem = directoryItems.some((item: any) => item.isRequired);

  useEffect(() => {
    if (formatted.scene.sceneName) {
      setWorkTabLabel(location.pathname, buildWorkTabLabel('knowledge-import', formatted.scene.sceneName));
    }
  }, [formatted.scene.sceneName, location.pathname]);

  const downloadTemplate = async (includeDirectory = false) => {
    const result = await businessApi.exportTemplate(sceneId, includeDirectory);
    if (result?.filePath) window.location.href = `/api${result.filePath}`;
  };

  const confirmTemplateDownload = async () => {
    setTemplateDownloading(true);
    try {
      await downloadTemplate(templateType === 'directory');
      setTemplateOpen(false);
    } finally {
      setTemplateDownloading(false);
    }
  };

  const requestTemplateDownload = async () => {
    if (!directoryItems.length) {
      await downloadTemplate(false);
      return;
    }
    if (hasRequiredDirectoryItem) {
      await downloadTemplate(true);
      return;
    }
    setTemplateType('normal');
    setTemplateOpen(true);
  };

  const goList = () => {
    history.push({
      pathname: `/knowledge/scene/${sceneId}`,
      state: { tabLabel: buildWorkTabLabel('knowledge-list', formatted.scene.sceneName) },
    });
  };

  const failedRows = Array.isArray(result?.failedRows) ? result.failedRows : [];
  const hasWarnings = failedRows.length > 0 || Array.isArray(result?.warnings) && result.warnings.length > 0;
  const isPendingOnly = !result?.failed && Number(result?.pendingRows || 0) > 0 && Number(result?.importedRows || 0) === 0;
  const resultTone = result?.failed ? 'error' : hasWarnings || Number(result?.skippedRows || 0) > 0 ? 'warning' : 'success';

  return (
    <PageHeader
      title="批量导入知识"
      breadcrumb={`知识中心 / ${formatted.scene.sceneName || ''} / 批量导入`}
      description="下载当前场景模板，填写后上传。导入完成后会在页面和通知中心同步结果。"
      extra={[
        <Button key="back" onClick={goList}>返回列表</Button>,
        <Button key="template" icon={<DownloadOutlined />} onClick={requestTemplateDownload}>下载模板</Button>,
      ]}
    >
      <section className="import-workbench">
        <div className="import-workbench-head">
          <div>
            <Typography.Text className="import-kicker">批量导入</Typography.Text>
            <Typography.Title level={3}>把 Excel 写入当前知识场景</Typography.Title>
          </div>
          <Tag color="blue">{formatted.scene.sceneName || '当前场景'}</Tag>
        </div>

        <div className="import-workbench-grid">
          <div className="import-upload-panel">
            <Upload.Dragger
              maxCount={1}
              accept=".xlsx,.xls"
              disabled={importing}
              showUploadList={false}
              customRequest={async ({ file, onSuccess, onError }) => {
                setImporting(true);
                setResult(undefined);
                try {
                  const uploaded = await fileApi.upload(file as File);
                  const importResult = await businessApi.importData({
                    sceneTemplateId: Number(sceneId),
                    filePath: uploaded.filePath || uploaded.file_path,
                  });
                  setResult(importResult || {});
                  message.success(importResult?.message || '导入完成');
                  onSuccess?.(uploaded);
                } catch (error: any) {
                  const msg = error?.message || '导入失败，请检查模板和文件内容';
                  setResult({ failed: true, message: msg });
                  message.error(msg);
                  onError?.(error);
                } finally {
                  setImporting(false);
                }
              }}
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">{importing ? '正在导入，请稍候' : '上传 Excel 文件'}</p>
              <p className="ant-upload-hint">支持 .xlsx / .xls，请使用当前场景模板填写。</p>
            </Upload.Dragger>
            <div className="import-template-note">
              模板表头带有字段编号，调整列顺序可以，删除必填字段或留空会被跳过。
            </div>
          </div>

          <div className={`import-result-panel is-${resultTone}`}>
            {result ? (
              <>
                <div className="import-result-status">
                  {resultTone === 'success' ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                  <div>
                    <Typography.Text strong>{result.message || '导入完成'}</Typography.Text>
                    {!result.failed ? (
                      <Typography.Paragraph>
                        {isPendingOnly ? '数据已进入审批流程，通过后会出现在正式知识列表。' : '导入结果已同步到通知中心。'}
                      </Typography.Paragraph>
                    ) : null}
                  </div>
                </div>

                {!result.failed ? (
                  <>
                    <div className="import-metric-strip">
                      {metricItems.map((item) => (
                        <div className="import-metric" key={item.key}>
                          <span>{item.label}</span>
                          <strong>{result[item.key] ?? 0}</strong>
                        </div>
                      ))}
                    </div>

                    {hasWarnings ? (
                      <div className="import-warning-list">
                        <Typography.Text strong>导入提醒</Typography.Text>
                        <ul>
                          {failedRows.length
                            ? failedRows.slice(0, 6).map((item: any, index: number) => (
                                <li key={`${item.rowNumber}-${item.fieldName}-${index}`}>
                                  第 {item.rowNumber} 行，{item.fieldName}：{item.reason}
                                  {item.originalValue ? `（原值：${item.originalValue}）` : ''}
                                </li>
                              ))
                            : result.warnings.slice(0, 6).map((warning: string, index: number) => (
                                <li key={`${warning}-${index}`}>{warning}</li>
                              ))}
                        </ul>
                      </div>
                    ) : null}

                    <Space wrap>
                      <Button type="primary" onClick={goList}>查看知识列表</Button>
                      <Button icon={<DownloadOutlined />} onClick={requestTemplateDownload}>重新下载模板</Button>
                    </Space>
                  </>
                ) : (
                  <Button icon={<DownloadOutlined />} onClick={requestTemplateDownload}>重新下载模板</Button>
                )}
              </>
            ) : (
              <div className="import-result-empty">
                <Typography.Text strong>等待导入</Typography.Text>
                <Typography.Paragraph>
                  导入完成后，这里会显示写入数量、审批数量和被跳过的行。
                </Typography.Paragraph>
              </div>
            )}
          </div>
        </div>
      </section>
      <Modal
        open={templateOpen}
        title="选择导入模板"
        okText="下载"
        cancelText="取消"
        confirmLoading={templateDownloading}
        onOk={confirmTemplateDownload}
        onCancel={() => setTemplateOpen(false)}
      >
        <Radio.Group
          value={templateType}
          onChange={(event) => setTemplateType(event.target.value)}
        >
          <Space direction="vertical">
            <Radio value="normal">普通模板</Radio>
            <Radio value="directory">带目录模板</Radio>
          </Space>
        </Radio.Group>
      </Modal>
    </PageHeader>
  );
}
