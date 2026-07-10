import React, { useCallback, useRef, useState } from 'react';

import type {
  EditableFormInstance,
  ProColumns,
} from '@ant-design/pro-components';
import { EditableProTable } from '@ant-design/pro-components';

import {
  submitDictDelApi,
  submitDictDisabledApi,
  submitDictNameApi,
} from '@/services/system/dict';
import { Button, message, Tag } from 'antd';
import DictPlaneBatchAdd from './DictPlaneBatchAdd';

import { DictDetailResult } from '../types';

interface Props {
  formRef: any;
  dictTemplateId: number;
  [x: string]: any;
}

const DictPlane: React.FC<Props> = ({ dictTemplateId, formRef }) => {
  const [editableKeys, setEditableRowKeys] = useState<React.Key[]>([]);
  const [open, setOpen] = useState(false);

  const editorFormRef = useRef<EditableFormInstance<DictDetailResult>>(null);

  // 本地form数据设置
  const handleFormEdit = (recordid: number, values: any) => {
    const tableDataSource = formRef?.getFieldValue(
      'plane',
    ) as DictDetailResult[];
    formRef.setFieldValue(
      'plane',
      tableDataSource.map((item) => {
        if (item.id === recordid) {
          return {
            ...item,
            ...values,
          };
        }
        return item;
      }),
    );
  };

  // 本地form数据删除
  const handleFormDel = (recordid: number) => {
    const tableDataSource = formRef?.getFieldValue(
      'plane',
    ) as DictDetailResult[];
    setEditableRowKeys((keys) => keys.filter((item) => item !== recordid))
    formRef?.setFieldValue('plane', tableDataSource.filter((item) => item.id !== recordid))

  }

  // 服务器 - 启用 停用
  const handleActionDisabled = useCallback(
    async (id: number, recordid: number, disabled: boolean) => {
      try {
        await submitDictDisabledApi({
          id,
          isDisabled: disabled,
          dictTemplateId,
        });
        handleFormEdit(recordid, {
          isDisabled: disabled,
        });
      } catch (error) {
        message.error('操作失败');
      }
    },
    [dictTemplateId, editorFormRef],
  );

  // 服务器 - 删除
  const handleDelete = useCallback(
    async (id: number, recordid: number) => {
      try {
        await submitDictDelApi({
          id,
          dictTemplateId,
        });
        handleFormDel(recordid);
      } catch (error) {
        message.error('删除失败');
      }
    },
    [editorFormRef, dictTemplateId],
  );

  // 服务器 - 修改名称
  const handleSaveName = useCallback(
    async (id: number, name: string, callback: any) => {
      try {
        await submitDictNameApi({
          dictTemplateId,
          id,
          dictName: name,
        });
        message.success('保存成功');
        callback && callback();
      } catch (error) {
        message.error('保存失败');
      }
    },
    [dictTemplateId, editorFormRef],
  );

  // 编辑
  const handleEdit = (record: DictDetailResult) => {
    const { id } = record;

    const tableDataSource = formRef?.getFieldValue(
      'plane',
    ) as DictDetailResult[];
    const newTree = tableDataSource.map((item) => {
      if (item?.id === id) {
        return {
          ...item,
          hasSaved: false,
        }
      }
      return item
    });
    formRef.setFieldValue('plane', newTree);

    setEditableRowKeys((keys) => [...keys, id]);
  };

  const columns: ProColumns<DictDetailResult>[] = [
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
      title: '目录状态',
      dataIndex: 'isDisabled',
      key: 'isDisabled',
      render: (status) => {
        if (status === undefined || status === '-') {
          return '-';
        }
        if (status) {
          return <Tag color="red">禁用</Tag>;
        }
        return <Tag color="success">正常</Tag>;
      },
      readonly: true,
    },
    {
      title: '是否使用中',
      dataIndex: 'isUsed',
      key: 'isUsed',
      render: (status) => {
        if (status === undefined || status === '-') {
          return '-';
        }
        if (status) {
          return <span className='text-primary'>使用中</span>;
        }
        return <span>未使用</span>;
      },
      readonly: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 150,
      render: (text, record, _) => {
        return (
          <div className="flex gap-8">
            <span
              key="editable"
              className="cursor-pointer text-primary"
              onClick={() => handleEdit(record)}
            >
              编辑
            </span>
            {record?.type === 'server' &&
              (record.isDisabled ? (
                <span
                  className="text-success cursor-pointer"
                  onClick={() =>
                    handleActionDisabled(record?.contentId, record?.id, false)
                  }
                >
                  启用
                </span>
              ) : !record.isUsed ? (
                <span
                  className="text-bg-yellow cursor-pointer"
                  onClick={() =>
                    handleActionDisabled(record?.contentId, record?.id, true)
                  }
                >
                  禁用
                </span>
              ) : null)
            }
            {
              !record.isUsed && (
                <span
                  key="delete"
                  className="cursor-pointer text-error"
                  onClick={() => {
                    if (record.type === 'server') {
                      handleDelete(record?.contentId, record?.id);
                    } else {
                      handleFormDel(record?.id);
                    }
                  }}
                >
                  删除
                </span>
              )
            }
          </div>
        );
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
        return null;
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
    formRef?.setFieldValue('plane', [
      ...plane,
      ...newPlane.filter((item) => !!item),
    ]);
    setOpen(false);
  }, []);

  return (
    <div className="w-full rounded-lg px-8 pt-8 bg-bg-4 ">
      <EditableProTable<DictDetailResult>
        rowKey="id"
        editableFormRef={editorFormRef}
        controlled={true}
        headerTitle=""
        preserve={true}
        name="plane"
        scroll={false}
        toolBarRender={() => [
          <Button key="rows" type="primary" onClick={() => setOpen(true)}>
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
            isDisabled: undefined,
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
            const arr: any = [
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
                  ) as DictDetailResult[];
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
                  if (row.type === 'server') {
                    handleSaveName(row.id, row.name, () => {
                      handleFormEdit(row.id, {
                        name: row.name,
                        hasSaved: true,
                        originName: row.name,
                      });
                      setEditableRowKeys((keys) => keys.filter((item) => item !== row?.id))

                    });
                  } else {
                    handleFormEdit(row.id, {
                      name: row.name,
                      hasSaved: true,
                      originName: row.name,
                    });
                    setEditableRowKeys((keys) => keys.filter((item) => item !== row?.id))
                  }
                }}
              >
                保存
              </span>,
            ];
            arr.push(
              <span
                key="cancel"
                className="cursor-pointer"
                onClick={() => {
                  if (!!row.originName) {
                    handleFormEdit(row.id, {
                      name: row.originName,
                      hasSaved: true,
                    });

                    if (editableKeys?.includes(row?.id)) {
                      setEditableRowKeys((keys) => keys.filter((item) => item !== row?.id))
                    }
                  } else {
                    handleFormDel(row?.id);
                  }
                }}
              >
                取消
              </span>,
            );
            return arr;
          },
        }}
      />
      <DictPlaneBatchAdd
        open={open}
        updateOpen={setOpen}
        handleBatchAdd={handleBatchAdd}
      />
    </div>
  );
};
export default DictPlane;
