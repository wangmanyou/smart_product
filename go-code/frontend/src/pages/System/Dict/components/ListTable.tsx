import { PlusOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import type { TableProps } from 'antd';
import { Button, Space, Table, Tag, Tooltip } from 'antd';
import React from 'react';
import dayjs from 'dayjs';

import { DictListParams, DictListResult, DictType } from '../types';
import { DictTypeMap } from '../constants';

interface Props {
  list: DictListResult[];
  total: number;
  loading: boolean;
  pageSize: number;
  page: number;
  getDictList: (data: DictListParams) => void;
  handleActionDisabled: (id: number, status: boolean) => void;
}

const ListTable: React.FC<Props> = ({
  list,
  total,
  loading,
  pageSize,
  page,
  getDictList,
  handleActionDisabled,
}) => {
  const columns: TableProps<DictListResult>['columns'] = [
    {
      title: '目录名称',
      dataIndex: 'dictName',
      key: 'dictName',
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
      title: '目录类型',
      dataIndex: 'dictType',
      key: 'dictType',
      render: (type) => {
        if (type === DictType.plane) {
          return <Tag color="blue">{DictTypeMap[DictType.plane] || '平面数据结构'}</Tag>;
        }
        return <Tag color="green">{DictTypeMap[DictType.tree] || '树形数据结构'}</Tag>;
      }
    },
    {
      title: '目录状态',
      dataIndex: 'dictDisabled',
      key: 'dictDisabled',
      render: (status) => {
        if (status) {
          return <Tag color="red">禁用</Tag>;
        }
        return <Tag color="success">正常</Tag>;
      },
    },
    // {
    //   title: '目录是否被引用',
    //   dataIndex: 'dictIsUsed',
    //   key: 'dictIsUsed',
    //   render: (status) => {
    //     if (status) {
    //       return <Tag color="success">使用中</Tag>;
    //     }
    //     return <Tag>未使用</Tag>;
    //   },
    // },
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
        if (time) {
          return dayjs(time * 1000).format('YYYY-MM-DD HH:mm:ss')

        }
        return '-'
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <span
            className="cursor-pointer"
            onClick={() =>
              history.push(`/system/dict/detail/${record.dictTemplateId}`)
            }
          >
            查看
          </span>
          <span
            onClick={() =>
              history.push(`/system/dict/edit/${record.dictTemplateId}`)
            }
            className="text-link cursor-pointer"
          >
            编辑
          </span>
          {record.dictDisabled ? (
            <span
              className="text-success cursor-pointer"
              onClick={() => handleActionDisabled(record.dictTemplateId, false)}
            >
              启用
            </span>
          ) : (
            <span
              className="text-error cursor-pointer"
              onClick={() => handleActionDisabled(record.dictTemplateId, true)}
            >
              禁用
            </span>
          )}

        </Space>
      ),
    },
  ];
  return (
    <div>
      <div className="flex justify-end pb-12">
        <Button
          type="primary"
          onClick={() => history.push('/system/dict/create')}
          icon={<PlusOutlined />}
        >
          新建
        </Button>
      </div>
      <Table<DictListResult>
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
          onChange: (page, pageSize) => {
            getDictList({
              pageNumber: page,
              pageSize: pageSize,
            });
          },
          onShowSizeChange: (current, size) => {
            getDictList({
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
