import React, { useCallback, useRef, useState } from 'react';

import type {
  EditableFormInstance,
  ProColumns,
} from '@ant-design/pro-components';
import { EditableProTable } from '@ant-design/pro-components';

import { Button, message } from 'antd';
import DictPlaneBatchAdd from './DictPlaneBatchAdd';

import { ActionType } from '../types';

interface Props {
  sourceType: ActionType;
  formRef: any;
  [x: string]: any;
}

type DataSourceType = {
  id: React.Key;
  name?: string;
  status?: string;
  hasSaved?: boolean;
};

const DictPlane: React.FC<Props> = ({ formRef }) => {
  const [editableKeys, setEditableRowKeys] = useState<number[]>();
  const [open, setOpen] = useState(false);

  const editorFormRef = useRef<EditableFormInstance<DataSourceType>>(null);
  const columns: ProColumns<DataSourceType>[] = [
    {
      title: '内容名称',
      dataIndex: 'name',
      ellipsis: true,
      formItemProps: () => {
        return {
          rules: [
            { required: true, message: '请输入有效内容' },
            { type: 'string', whitespace: true, message: '请输入有效内容' },
          ],
        };
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (text, record, _, action) => {
        return (
          <div className='flex gap-8'>
            <span
              key="editable"
              className="cursor-pointer text-primary"
              onClick={() => {
                action?.startEditable?.(record.id, {
                  ...record,
                  hasSaved: false,
                });
                const tableDataSource = formRef?.getFieldValue(
                  'plane',
                ) as DataSourceType[];
                formRef?.setFieldsValue({
                  plane: tableDataSource.map((item) => {
                    if (item.id === record.id) {
                      return {
                        ...item,
                        hasSaved: false,
                      };
                    }
                    return item;
                  }),
                });
              }}
            >
              编辑
            </span>
            <span
              key="delete"
              className="cursor-pointer text-error"
              onClick={() => {
                const tableDataSource = formRef?.getFieldValue(
                  'plane',
                ) as DataSourceType[];
                formRef?.setFieldsValue({
                  plane: tableDataSource.filter((item) => item.id !== record.id),
                });
              }}
            >
              删除
            </span>
          </div>
        )
      },
    },
  ];

  // 批量添加
  const handleBatchAdd = useCallback((value: string[]) => {
    const plane = formRef?.getFieldValue('plane') || [];
    const planeNames = plane.map((item) => item.name);
    let len = plane.length - 1;
    const newPlane = value.map((item) => {
      if (planeNames.includes(item)) {
        return null
      } else {
        len = len + 1;
        return {
          id: Number(`${Date.now()}${len}`),
          name: item,
          hasSaved: true,
          index: len,
        };
      }

    });
    formRef?.setFieldValue('plane', [...plane, ...newPlane.filter((item) => !!item)]);
    setOpen(false);
  }, []);

  return (
    <div className="w-full rounded-lg px-8 pt-8 bg-bg-4 ">
      <EditableProTable<DataSourceType>
        rowKey="id"
        editableFormRef={editorFormRef}
        controlled={true}
        headerTitle=""
        preserve={true}
        name="plane"
        scroll={false}
        toolBarRender={() => [
          <Button key="rows" type="primary"
            onClick={() => setOpen(true)}>
            批量添加
          </Button>,
        ]}
        columns={columns}
        recordCreatorProps={{
          position: 'bottom',
          record: () => ({
            id: Date.now(),
            name: '',
            hasSaved: false,
          }),
          creatorButtonText: '新增一行',
          block: false,
          color: 'primary',
          variant: 'dashed',
        }}
        editable={{
          type: 'multiple',
          editableKeys,
          onChange: setEditableRowKeys,
          actionRender: (row, config, defaultDom) => {
            return [
              <span
                key="set"
                className="cursor-pointer"
                onClick={() => {
                  if (!row.name || !row.name.trim()) {
                    message.error('内容名称不能为空');
                    return;
                  }
                  const tableDataSource = formRef?.getFieldValue(
                    'plane',
                  ) as DataSourceType[];
                  const names = tableDataSource
                    .filter((item: any) => item.id !== row.id)
                    .map((item: any) => item.name);
                  if (names.includes(row.name)) {
                    message.error('内容名称不能重复');
                    editorFormRef.current?.setRowData?.(row.id, {
                      name: '',
                      hasSaved: false,
                    });
                    return;
                  }

                  editorFormRef.current?.setRowData?.(row.id, {
                    name: row.name,
                    hasSaved: true,
                  });

                  setEditableRowKeys((keys) => keys.filter((item) => item !== row?.id))
                }}
              >
                保存
              </span>,
              defaultDom.cancel,
            ];
          },
        }}
      />
      <DictPlaneBatchAdd
        open={open}
        updateOpen={setOpen}
        handleBatchAdd={handleBatchAdd} />
    </div>

  );
};
export default DictPlane;
