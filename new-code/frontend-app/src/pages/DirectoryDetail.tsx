import { history, useLocation, useParams } from '@umijs/max';
import { Button, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { dictApi } from '@/services/api';
import { buildWorkTabLabel, formatTime, setWorkTabLabel } from '@/utils/data';

export default function DirectoryDetail() {
  const { id = '' } = useParams();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>({});

  const template = detail?.dictTemplate || {};
  const isTree = template.dictType === 'tree';
  const rows = isTree
    ? detail?.treeDict?.treeDict || []
    : detail?.planeDict?.planeDict || [];
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);

  const load = async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const res = await dictApi.detail(id);
      setDetail(res || {});
      setExpandedRowKeys([]);
      const dictName = res?.dictTemplate?.dictName;
      if (dictName) {
        const tabLabel = buildWorkTabLabel('directory-detail', dictName);
        setWorkTabLabel(location.pathname, tabLabel);
        history.replace({
          pathname: location.pathname,
          state: { tabLabel },
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const columns: ColumnsType<any> = [
    {
      title: '内容名称',
      dataIndex: 'name',
      render: (value) => <span className="directory-name-text">{value}</span>,
    },
    {
      title: '状态',
      width: 180,
      render: (_, record) =>
        record.isDisabled ? <Tag color="red">已禁用</Tag> : <Tag color="green">正常</Tag>,
    },
  ];
  const pageTitle = `${template.dictName || ''}目录详情`;
  const breadcrumb = `系统管理 / 目录管理 / ${pageTitle}`;

  return (
    <PageHeader
      title={pageTitle}
      hideHeader
      breadcrumb={breadcrumb}
    >
      <div className="directory-detail-page">
        <div className="directory-detail-head">
          <div className="directory-detail-breadcrumb page-breadcrumb">{breadcrumb}</div>
          <div className="directory-detail-actions">
            <Button onClick={() => history.push('/system/dicts')}>返回</Button>
            <Button
              type="primary"
              onClick={() => history.push({
                pathname: `/system/dicts/${id}/edit`,
                state: {
                  tabLabel: buildWorkTabLabel('directory-edit', template.dictName),
                  replacePath: location.pathname,
                },
              })}
            >
              编辑
            </Button>
          </div>
        </div>

        <Spin spinning={loading}>
          <div className="directory-detail-layout">
            <section className="directory-detail-info-panel">
              <div className="directory-detail-field">
                <span>目录名称：</span>
                <strong>{template.dictName || '--'}</strong>
              </div>
              <div className="directory-detail-field">
                <span>目录类型：</span>
                <strong>{isTree ? '树状结构数据' : '平面结构数据'}</strong>
              </div>
              <div className="directory-detail-field">
                <span>目录状态：</span>
                <div><StatusTag disabled={template.dictDisabled} used={template.dictIsUsed} /></div>
              </div>
              <div className="directory-detail-field">
                <span>创建人：</span>
                <strong>{template.creatorName || '--'}</strong>
              </div>
              <div className="directory-detail-field">
                <span>更新时间：</span>
                <strong>{formatTime(template.updateTime)}</strong>
              </div>
            </section>

            <section className="directory-detail-content-panel">
              <div className="directory-detail-content-title">目录内容</div>
              <Table
                rowKey="id"
                columns={columns}
                dataSource={rows}
                expandable={{
                  expandedRowKeys,
                  onExpandedRowsChange: (keys) => setExpandedRowKeys([...keys]),
                  rowExpandable: (record) => Boolean(record.children?.length),
                  expandIcon: ({ expanded, onExpand, record }) => {
                    if (!record.children?.length) return <span className="directory-expand-placeholder" />;
                    return (
                      <button
                        type="button"
                        className="directory-expand-button"
                        onClick={(event) => onExpand(record, event)}
                      >
                        {expanded ? '-' : '+'}
                      </button>
                    );
                  },
                }}
                pagination={false}
              />
            </section>
          </div>
        </Spin>
      </div>
    </PageHeader>
  );
}
