import { history, useLocation, useParams } from '@umijs/max';
import { Button, Card, Col, Row, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import StatusTag from '@/components/StatusTag';
import { dictApi } from '@/services/api';
import { formatTime } from '@/utils/data';

function setCurrentTabLabel(path: string, label: string) {
  window.dispatchEvent(new CustomEvent('work-tab-label-change', { detail: { path, label } }));
}

function collectExpandedKeys(nodes: any[] = []): Key[] {
  return nodes.flatMap((node) => (
    node.children?.length ? [node.id, ...collectExpandedKeys(node.children)] : []
  ));
}

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
  const defaultExpandedRowKeys = useMemo(() => collectExpandedKeys(rows), [rows]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);

  useEffect(() => {
    setExpandedRowKeys(defaultExpandedRowKeys);
  }, [defaultExpandedRowKeys]);

  const load = async () => {
    if (!id || id === 'new') return;
    setLoading(true);
    try {
      const res = await dictApi.detail(id);
      setDetail(res || {});
      const dictName = res?.dictTemplate?.dictName;
      if (dictName) {
        setCurrentTabLabel(location.pathname, `${dictName}目录详情`);
        history.replace({
          pathname: location.pathname,
          state: { tabLabel: `${dictName}目录详情` },
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

  return (
    <PageHeader
      title={`${template.dictName || ''}目录详情`}
      breadcrumb={`系统管理 / 目录管理 / ${template.dictName || ''}目录详情`}
      extra={[
        <Button key="back" onClick={() => history.push('/system/dicts')}>返回</Button>,
        <Button
          key="edit"
          type="primary"
          onClick={() => history.push({
            pathname: `/system/dicts/${id}/edit`,
            state: {
              tabLabel: `${template.dictName || ''}目录编辑`,
              replacePath: location.pathname,
            },
          })}
        >
          编辑
        </Button>,
      ]}
    >
      <div className="legacy-form-page">
        <Spin spinning={loading}>
          <div className="legacy-detail-stack">
            <Row gutter={16}>
              <Col span={4} className="legacy-label">目录名称：</Col>
              <Col span={20} className="legacy-value">{template.dictName || '--'}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={4} className="legacy-label">目录类型：</Col>
              <Col span={20} className="legacy-value">{isTree ? '树状结构数据' : '平面结构数据'}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={4} className="legacy-label">目录状态：</Col>
              <Col span={20}><StatusTag disabled={template.dictDisabled} used={template.dictIsUsed} /></Col>
            </Row>
            <Row gutter={16}>
              <Col span={4} className="legacy-label">创建人：</Col>
              <Col span={20} className="legacy-value">{template.creatorName || '--'}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={4} className="legacy-label">更新时间：</Col>
              <Col span={20} className="legacy-value">{formatTime(template.updateTime)}</Col>
            </Row>
            <Row gutter={16}>
              <Col span={4} className="legacy-label">目录内容：</Col>
              <Col span={24} className="pt-16">
                <Card className="legacy-edit-table" bodyStyle={{ padding: 0 }}>
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
                </Card>
              </Col>
            </Row>
          </div>
        </Spin>
      </div>
    </PageHeader>
  );
}
