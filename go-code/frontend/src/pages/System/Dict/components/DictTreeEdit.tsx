import React, { useRef, useState, useCallback } from 'react';

import type {
    EditableFormInstance,
    ProColumns,
} from '@ant-design/pro-components';
import { EditableProTable } from '@ant-design/pro-components';
import { message, Button, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import {
    submitDictDelApi,
    submitDictDisabledApi,
    submitDictNameApi,
} from '@/services/system/dict';

import { ActionType, DictDetailResult } from '../types';

import {
    formatDictaddChild,
    getAllTreeChildName,
    findChildrenIDs,
    deleteDictTreeById,
    findSingleChildParent,
    updateDictTreeById,
    updateDictTreeAndChildrenById,
} from '@/pages/System/Dict/dict';

interface Props {
    sourceType: ActionType;
    formRef: any;
    dictTemplateId: number;
    [x: string]: any;
}

const DictTree: React.FC<Props> = ({ dictTemplateId, formRef }) => {
    const [editableKeys, setEditableRowKeys] = useState<number[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
    const editorFormRef = useRef<EditableFormInstance<DictDetailResult>>(null);


    // 添加顶级
    const handleAddTop = () => {
        if (editableKeys?.length) {
            return message.warning('只能同时编辑一行');
        }
        const tableDataSource = formRef?.getFieldValue(
            'tree',
        ) as DictDetailResult[] || [];

        const child = {
            name: '',
            id: Date.now(),
            hasSaved: false,
            level: 0,
            isDisabled: undefined,
        }
        tableDataSource.push(child);
        formRef?.setFieldValue('tree', tableDataSource);
        setEditableRowKeys([...editableKeys, child.id])
    }

    // 添加子集
    const handleAddChildren = (record: DictDetailResult) => {

        if (editableKeys?.length) {
            return message.warning('只能同时编辑一行');
        }
        const tableDataSource = formRef?.getFieldValue(
            'tree',
        ) as DictDetailResult[];
        const child = {
            name: '',
            id: Date.now(),
            hasSaved: false,
            localParentId: record.id,
            level: record?.level + 1,
        }
        if (record.type === 'server') {
            child.parentId = record.contentId;
        }
        formRef?.setFieldValue('tree', formatDictaddChild(tableDataSource, record.id, child));
        setExpandedRowKeys([...expandedRowKeys, record!.id])
        setEditableRowKeys([...editableKeys, child.id])
    }

    // 处理展开收起行
    const handleExpandedRowsChange = (expanded: boolean, record: any) => {
        if (!expanded) {
            // 收起
            const childs = findChildrenIDs(record);
            setExpandedRowKeys(expandedRowKeys?.filter((item) => !childs.includes(item)));
        } else {
            //  展开
            setExpandedRowKeys([...expandedRowKeys, record.id]);
        }
    };

    // 本地保存
    const handleSave = (row: DictDetailResult, data: DictDetailResult) => {

        const tableDataSource = formRef?.getFieldValue(
            'tree',
        ) as DictDetailResult[];
        const newTree = updateDictTreeById(tableDataSource, row.id, data);
        formRef.setFieldValue('tree', newTree);
        setEditableRowKeys((keys) => {
            return keys.filter((key) => key !== row.id);
        });
    }

    // 删除
    const handleDel = (record: DictDetailResult) => {
        const tableDataSource = formRef?.getFieldValue(
            'tree',
        ) as DictDetailResult[] || [];
        const newTree = deleteDictTreeById(tableDataSource, record.id);
        formRef?.setFieldValue('tree', newTree);

        // 删除子节点的展开状态
        let expendids: number[] = [];
        let editedids: number[] = [record.id];
        if (expandedRowKeys.includes(record.id)) {
            // handleExpandedRowsChange(false, record);
            const childs = findChildrenIDs(record);
            if (childs.length) {
                expendids = [...expendids, ...childs];
                editedids = [...editedids, ...childs];
            }
        }


        // 删除父节点的展开状态
        if (record.level !== 0) {
            const parentids = findSingleChildParent(newTree, record.localParentId);
            if (parentids && parentids.length) {
                expendids = [...expendids, ...parentids];
            }
        }
        setExpandedRowKeys(expandedRowKeys?.filter((item) => !expendids.includes(item)));
        setEditableRowKeys(editableKeys?.filter((item) => !editedids.includes(item)));
    }

    // 编辑
    const handleEdit = (record: DictDetailResult) => {
        if (editableKeys?.length) {
            return message.warning('只能同时编辑一行');
        }
        const { id } = record;

        const tableDataSource = formRef?.getFieldValue(
            'tree',
        ) as DictDetailResult[];
        const newTree = updateDictTreeById(tableDataSource, id, { hasSaved: false });
        formRef.setFieldValue('tree', newTree);
        setEditableRowKeys([...editableKeys, id])
    }

    // 本地 - 启用 停用 级联
    const handleDisabled = (row: DictDetailResult, data: DictDetailResult) => {
        const tableDataSource = formRef?.getFieldValue(
            'tree',
        ) as DictDetailResult[];
        const newtree = updateDictTreeAndChildrenById(tableDataSource, row.id, data);
        formRef.setFieldValue('tree', newtree);
    }
    // 服务器 - 启用 停用
    const handleActionDisabled = async (record: DictDetailResult, disabled: boolean) => {
        try {
            await submitDictDisabledApi({
                id: record.contentId,
                isDisabled: disabled,
                dictTemplateId,
            });
            handleDisabled(record, {
                isDisabled: disabled,
            })

        } catch (error) {
            message.error('操作失败');
        }
    }

    // 服务器 - 删除
    const handleServerDel = async (record: DictDetailResult) => {
        try {
            await submitDictDelApi({
                id: record.contentId,
                dictTemplateId,
            });
            handleDel(record);
        } catch (error) {
            message.error('删除失败');
        }
    }

    // 服务器 - 修改名称
    const handleServerSaveName = useCallback(
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
            width: 200,
            render: (text, record, _, action) => {
                return (
                    <div className='flex gap-8'>
                        <span
                            key="editable"
                            className="cursor-pointer text-primary"
                            onClick={() => {
                                handleEdit(record);
                            }}
                        >
                            编辑
                        </span>
                        {record?.type === 'server' &&
                            (record.isDisabled ? (
                                <span
                                    className="text-success cursor-pointer"
                                    onClick={() =>
                                        handleActionDisabled(record, false)
                                    }
                                >
                                    启用
                                </span>
                            ) : !record.isUsed ? (
                                <span
                                    className="text-bg-yellow cursor-pointer"
                                    onClick={() =>
                                        handleActionDisabled(record, true)
                                    }
                                >
                                    禁用
                                </span>
                            ) : null)}
                        {
                            !record.isUsed && (
                                <span
                                    key="delete"
                                    className="cursor-pointer text-error"
                                    onClick={() => {
                                        if (record.type === 'server') {
                                            handleServerDel(record)
                                        } else {
                                            handleDel(record)
                                        }

                                    }}
                                >
                                    删除
                                </span>
                            )
                        }

                        {
                            Number(record?.level || 0) < 2 && !record.isUsed && (
                                <span className='text-bg-yellow cursor-pointer'
                                    onClick={() => {
                                        handleAddChildren(record)
                                    }}>
                                    新增子集
                                </span>
                            )
                        }

                    </div>
                )
            },
        },
    ];

    return (
        <div className="w-full rounded-lg px-8 pt-8 bg-bg-4 ">
            <EditableProTable<DictDetailResult>
                rowKey="id"
                editableFormRef={editorFormRef}
                controlled={true}
                headerTitle=""
                preserve={true}
                name="tree"
                scroll={false}
                columns={columns}
                recordCreatorProps={false}
                expandable={{
                    expandedRowKeys: expandedRowKeys,
                    onExpand: handleExpandedRowsChange,
                }}
                editable={{
                    type: 'single',
                    editableKeys,
                    onChange: setEditableRowKeys,
                    actionRender: (row) => {
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
                                        'tree',
                                    ) as DictDetailResult[];
                                    const names = getAllTreeChildName(tableDataSource, row.localParentId, row.id)
                                    if (names.includes(row.name)) {
                                        message.error('内容名称不能重复');
                                        editorFormRef.current?.setRowData?.(row.id, {
                                            hasSaved: false,
                                        });
                                        return;
                                    }
                                    if (row.type === 'server') {
                                        handleServerSaveName(row.contentId, row.name, () => {
                                            handleSave(row, {
                                                name: row.name,
                                                originName: row.name,
                                                hasSaved: true,
                                            })
                                        })
                                    } else {
                                        handleSave(row, {
                                            name: row.name,
                                            originName: row.name,
                                            hasSaved: true,
                                        })
                                    }
                                }}
                            >
                                保存
                            </span>,
                            <span key="cancel"
                                className="cursor-pointer"
                                onClick={() => {
                                    if (!!row.originName) {
                                        const tableDataSource = formRef?.getFieldValue(
                                            'tree',
                                        ) as DictDetailResult[];
                                        const newTree = updateDictTreeById(tableDataSource, row.id, {
                                            name: row.originName,
                                            hasSaved: true,
                                        });
                                        formRef.setFieldValue('tree', newTree);
                                        setEditableRowKeys((keys) => {
                                            return keys.filter((key) => key !== row.id);
                                        });
                                    } else {
                                        handleDel(row);
                                    }
                                }}>
                                取消
                            </span>,
                        ];
                    },
                }}
                footer={() => (
                    <Button
                        block
                        color="primary"
                        variant="dashed"
                        icon={<PlusOutlined />}
                        onClick={handleAddTop}>
                        新增一行
                    </Button>
                )}
            />
        </div>
    );
};
export default DictTree;
