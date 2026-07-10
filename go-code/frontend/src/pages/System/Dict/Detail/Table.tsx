import type { TableProps } from 'antd';
import { Table, Tag } from 'antd';
import React from 'react';

import { DictDetailResult } from '../types';

interface Props {
  data: DictDetailResult[];
  [x: string]: any;
}
const Plane: React.FC<Props> = ({ data }) => {
  const columns: TableProps<DictDetailResult>['columns'] = [
    {
      title: '内容名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '状态',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      render: (status) => {
        if (status) {
          return <Tag color="red">禁用</Tag>;
        }
        return <Tag color="success">正常</Tag>;
      },
    },
  ];
  return <Table<DictDetailResult> rowKey="id" columns={columns} dataSource={data || null} />;
};
export default Plane;
