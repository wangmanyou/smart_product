
import type { TableProps } from 'antd';
import { Table, Tooltip } from 'antd';
import React from 'react';


interface Props {
  list: any;
  total: number;
  loading: boolean;
  pageSize: number;
  page: number;
  getList: (data: any) => void;
}

const ListTable: React.FC<Props> = ({
  list,
  total,
  loading,
  pageSize,
  page,
  getList,
}) => {
  const columns: TableProps<any>['columns'] = [
    {
      title: '创建人',
      dataIndex: 'creatorName',
      key: 'creatorName',
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
      title: '创建知识数量',
      dataIndex: 'knowledgeNum',
      key: 'knowledgeNum',
    },
  ];
  return (
    <div>
      <Table<any>
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={false}
      />
    </div>
  );
};

export default ListTable;
