
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
      title: '知识数量历史点击量',
      dataIndex: 'knowledgeViewTimeCount',
      key: 'knowledgeViewTimeCount',
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
