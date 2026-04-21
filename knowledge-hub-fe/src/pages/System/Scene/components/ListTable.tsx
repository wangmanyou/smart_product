import { PlusOutlined, CopyOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import type { TableProps } from 'antd';
import { Button, Space, Table, Tag, Tooltip } from 'antd';
import React from 'react';
import dayjs from 'dayjs';

import { SceneListParams, SceneListResult } from '../types';

interface Props {
  list: SceneListResult[];
  total: number;
  loading: boolean;
  pageSize: number;
  page: number;
  getSceneList: (data: SceneListParams) => void;
  handleActionDisabled: (id: number, status: boolean) => void;
}

const ListTable: React.FC<Props> = ({
  list,
  total,
  loading,
  pageSize,
  page,
  getSceneList,
  handleActionDisabled,
}) => {
  const columns: TableProps<SceneListResult>['columns'] = [
    {
      title: '场景名称',
      dataIndex: 'sceneName',
      key: 'sceneName',
      ellipsis: {
        showTitle: false,
      },
      render: (name) => (
        <Tooltip placement="topLeft" title={name}>
          {name}
        </Tooltip>
      ),
    },
    {
      title: '场景状态',
      dataIndex: 'sceneIsDisabled',
      key: 'sceneIsDisabled',
      render: (status) => {
        if (status) {
          return <Tag color="red">禁用</Tag>;
        }
        return <Tag color="success">正常</Tag>;
      },
    },
    {
      title: '使用状态',
      dataIndex: 'sceneIsUsed',
      key: 'sceneIsUsed',
      render: (status) => {
        if (status) {
          return <Tag color="blue">使用中</Tag>;
        }
        return <Tag>未使用</Tag>;
      },
    },
    {
      title: '创建人',
      dataIndex: 'creatorName',
      key: 'creatorName',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (time) => {
        if(time) {
          return dayjs(time * 1000).format('YYYY-MM-DD HH:mm:ss')

        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="small">
          <span
            className="cursor-pointer"
            onClick={() =>
              history.push(`/system/scene/detail/${record.sceneTemplateId}`)
            }
          >
            查看
          </span>
          <span
            onClick={() =>
              history.push(`/system/scene/edit/${record.sceneTemplateId}`)
            }
            className="text-link cursor-pointer"
          >
            编辑
          </span>
          {record.sceneIsDisabled ? (
            <span
              className="text-success cursor-pointer"
              onClick={() => handleActionDisabled(record.sceneTemplateId, false)}
            >
              启用
            </span>
          ) : (!record.sceneIsDisabled && !record.sceneIsUsed) && (
            <span
              className="text-error cursor-pointer"
              onClick={() => handleActionDisabled(record.sceneTemplateId, true)}
            >
              禁用
            </span>
          )}
          {/* <span
            className="cursor-pointer"
            onClick={() =>
              history.push(`/system/scene/detail/${record.sceneTemplateId}`)
            }
          >
            复制
          </span> */}
        </Space>
      ),
    },
  ];
  return (
    <div>
      <div className="flex justify-end pb-12 gap-16">
        <Button
          type="primary"
          onClick={() => history.push('/system/scene/create')}
          icon={<PlusOutlined />}
        >
          新建
        </Button>
        <Button
          type="default"
          onClick={() => history.push('/system/scene/copy')}
          icon={<CopyOutlined />}
        >
          复制已有场景
        </Button>
      </div>
      <Table<SceneListResult>
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{
          total: total,
          pageSize: pageSize,
          current: page,
          defaultPageSize: 10,
          showQuickJumper: true,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page, size) => {
            getSceneList({
              pageNumber: page,
              pageSize: size,
            });
          },
          onShowSizeChange: (current, size) => {
            getSceneList({
              pageNumber: current,
              pageSize: size,
            });
          },
        }}
      />
    </div>
  );
};

export default ListTable;
