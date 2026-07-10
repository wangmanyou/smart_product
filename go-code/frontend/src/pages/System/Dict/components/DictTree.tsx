import React, { useRef, useState } from 'react';

import type {
    EditableFormInstance,
    ProColumns,
} from '@ant-design/pro-components';
import { EditableProTable } from '@ant-design/pro-components';
import { message, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

import { ActionType, DictDetailResult } from '../types';

import {
    formatDictaddChild,
    getAllTreeChildName,
    findChildrenIDs,
    deleteDictTreeById,
    findDictTreeById,
    findSingleChildParent,
    updateDictTreeById,
} from '@/pages/System/Dict/dict';

interface Props {
    sourceType: ActionType;
    formRef: any;
    [x: string]: any;
}

const DictTree: React.FC<Props> = ({ formRef }) => {
    const [editableKeys, setEditableRowKeys] = useState<number[]>([]);
    const [expandedRowKeys, setExpandedRowKeys] = useState<number[]>([]);
    const editorFormRef = useRef<EditableFormInstance<DictDetailResult>>(null);

    console.log(expandedRowKeys, 'expandedRowKeys');

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
        }
        tableDataSource.push(child);
        formRef?.setFieldValue('tree', tableDataSource);
        setEditableRowKeys([...editableKeys, child.id])
    }

    // 添加子集
    const handleAddChildren = (id: number, level: number) => {
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
            localParentId: id,
            level: level + 1,
        }
        formRef?.setFieldValue('tree', formatDictaddChild(tableDataSource, id, child));
        setExpandedRowKeys([...expandedRowKeys, id])
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
                        <span
                            key="delete"
                            className="cursor-pointer text-error"
                            onClick={() => {
                                handleDel(record)
                            }}
                        >
                            删除
                        </span>
                        {
                            record.level < 2 && (
                                <span className='text-bg-yellow cursor-pointer'
                                    onClick={() => {
                                        handleAddChildren(record.id, record.level)
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
                                    if(row.type === 'server') {

                                    } else {

                                    }
                                    const newTree = updateDictTreeById(tableDataSource, row.id, {
                                        name: row.name,
                                        originName: row.name,
                                        hasSaved: true,
                                    });
                                    formRef.setFieldValue('tree', newTree);
                                    setEditableRowKeys((keys) => {
                                        return keys.filter((key) => key !== row.id);
                                    });
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