import type { TableProps } from 'antd';
import { Table } from 'antd';
import React from 'react';

import { SceneItem } from '../types';
import { SceneType, SceneTypeConfigEnum } from '@/constants/type';

interface Props {
  data: SceneItem[];
  [x: string]: any;
}
const Plane: React.FC<Props> = ({ data }) => {
  const columns: TableProps<SceneItem>['columns'] = [
    {
      title: '内容名称',
      dataIndex: 'sceneItemName',
      key: 'sceneItemName',
      ellipsis: true,
    },
    {
      title: '内容类型',
      dataIndex: 'type',
      key: 'type',
      render: (value, record) => {
        if (value === SceneType.dict) {
          return `${SceneTypeConfigEnum[value].text}-(目录id: ${record.dictTemplateId})`
        }
        return SceneTypeConfigEnum[value].text;
      },
    },
    {
      title: '是否支持多条数据',
      dataIndex: 'multiValue',
      key: 'multiValue',
      render: (value) => {
        return value ? '多条数据' : '单条数据';
      },
    },
    {
      title: '是否隐藏',
      dataIndex: 'isHide',
      key: 'isHide',
      render: (value) => {
        return value ? '是' : '否';
      },
    },
    {
      title: '是否必填',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (value) => {
        return value ? '是' : '否';
      },
    },
    {
      title: '是否支持搜索',
      dataIndex: 'isRequired',
      key: 'isRequired',
      render: (value) => {
        return value ? '是' : '否';
      },
    },

  ];
  return <Table<SceneItem> rowKey="id" columns={columns} dataSource={data || null} />;
};
export default Plane;
