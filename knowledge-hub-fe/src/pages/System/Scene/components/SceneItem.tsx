import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Switch, Select, message } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined, DragOutlined } from '@ant-design/icons';
import type {
    EditableFormInstance,
    ProColumns,
} from '@ant-design/pro-components';
import {
    EditableProTable,
} from '@ant-design/pro-components';

import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
    restrictToVerticalAxis,
} from '@dnd-kit/modifiers';

import Row from './Row';
import DragHandle from './DragHandle';

import { SceneTypeConfig } from '@/constants/type';
import { SceneItem } from '../types';

import { getDictListApi } from '@/services/system/scene';

const createDefaultSceneItem = () => {
    return {
        localId: Date.now(),
        sceneItemName: null,
        type: null,
        multiValue: false,
        isHide: false,
        isRequired: false,
        isSupportSearch: true,
    }
}

type Props = {
    formRef: any;
    initialValue: SceneItem[];
    isEdit: boolean;
    [x: string]: any;
}

export default ({ formRef, initialValue, isEdit }: Props) => {
    const [editableKeys, setEditableRowKeys] = useState<React.Key[]>(() => []);
    const [dictOptions, setDictOptions] = useState<any>([]);
    const editorFormRef = useRef<EditableFormInstance<SceneItem>>(null);

    const handleSearch = useCallback(async (value: string) => {
        try {
            const result = await getDictListApi({
                pageSize: 9999,
                pageNumber: 1,
                searchDictName: value,
                searchDictDisabled: 'enabled',
            });
            setDictOptions(result?.content || []);
        } catch (error) {
            message.error('获取目录列表失败');
        }
    }, [])

    const onDragEnd = ({ active, over }: DragEndEvent) => {
        if (active.id !== over?.id) {
            const data = formRef.getFieldValue('sceneItem');
            const activeIndex = data.findIndex((record) => record.localId === active?.id);
            const overIndex = data.findIndex((record) => record.localId === over?.id);
            const newData = arrayMove(data, activeIndex, overIndex)
            formRef.setFieldValue('sceneItem', newData);
        }
    };

    const columns: ProColumns<SceneItem>[] = [
        {
            title: '排序',
            dataIndex: 'sort',
            width: 60,
            className: 'drag-visible',
            renderFormItem: () => <DragHandle />,
            readonly: true,
        },
        {
            title: '模版名称',
            key: 'sceneItemName',
            dataIndex: 'sceneItemName',
            formItemProps: () => {
                return {
                    allowClear: true,
                    rules: [
                        { required: true, whitespace: true, message: '此项为必填项' },
                        { max: 500, whitespace: true, message: '最多500个字符' },
                        { min: 1, whitespace: true, message: '最少1个字符' },

                    ],
                };
            },
            width: '20%',
        },
        {
            title: '模版类型',
            key: 'type',
            dataIndex: 'type',
            colSpan: 2,
            valueType: 'select',
            width: 150,
            formItemProps: () => {
                return {
                    allowClear: true,
                    rules: [
                        { required: true, whitespace: true, message: '此项为必填项' },
                    ],
                };
            },
            renderFormItem: (_, record) => {
                return (
                    <Select
                        placeholder="请选择模型类型"
                        options={SceneTypeConfig}
                        onChange={(val) => {

                            formRef.setFieldValue([record.recordKey, 'type'], val);
                        }}
                        disabled={isEdit && !!record?.record?.id}
                    />
                )
            }
        },
        {
            title: '目录类型',
            key: 'dictTemplateId',
            dataIndex: 'dictTemplateId',
            colSpan: 0,
            valueType: 'select',
            width: 150,
            renderFormItem: (_, record) => {
                const scenes = formRef.getFieldValue('sceneItem');
                const curr = scenes.find((item) => Number(item.localId) === Number(record.recordKey));
                const type = curr?.type;
                if (type === 'dict') {
                    return (
                        <Select
                            placeholder="请选择目录类型"
                            options={(dictOptions || []).map((d) => ({
                                value: d.dictTemplateId,
                                label: d.dictName,
                            }))}
                            popupMatchSelectWidth={false}
                            onChange={(val) => {
                                formRef.setFieldValue([record.recordKey, 'dictTemplateId'], val);
                            }}
                            disabled={isEdit && !!record?.record?.id}

                        />
                    );
                }
                formRef.setFieldValue([record.recordKey, 'dictTemplateId'], -1);
                return null;
            }
        },
        {
            title: '操作类型',
            key: 'multiValue',
            tooltip: '是否支持添加多个数据',
            dataIndex: 'multiValue',
            valueType: 'switch',
            renderFormItem: (_, record) => {
                return <Switch checkedChildren="多个" unCheckedChildren="单个"
                    disabled={isEdit && !!record?.record?.id} />;
            },
        },
        {
            title: '是否隐藏',
            key: 'isHide',
            dataIndex: 'isHide',
            valueType: 'switch',
            tooltip: '添加知识时是否隐藏这个模版',
            renderFormItem: () => {
                return <Switch checkedChildren="隐藏" unCheckedChildren="显示" />;
            },
            render: (isHide) => {
                return isHide ? <span>隐藏</span> : <span>显示</span>;
            },
        },
        {
            title: '是否必填',
            key: 'isRequired',
            dataIndex: 'isRequired',
            valueType: 'switch',
            tooltip: '添加知识时是否必填这个模版',
            renderFormItem: () => {
                return <Switch checkedChildren="必填" unCheckedChildren="非必填" />;
            },
        },
        {
            title: '支持搜索',
            key: 'isSupportSearch',
            dataIndex: 'isSupportSearch',
            valueType: 'switch',
            tooltip: '知识检索时是否可以通过这个模版搜索',
            renderFormItem: () => {
                return <Switch checkedChildren="可搜索" unCheckedChildren="不可搜索" />;
            },
        },
        {
            title: '操作',
            valueType: 'option',
            width: 100,
            render: (text, record, _, action) => {
                return null
            },
        },
    ];

    useEffect(() => {
        handleSearch('');
    }, [])

    useEffect(() => {
        if (initialValue && initialValue.length > 0) {
            const keys = initialValue.map((item) => item.localId);
            setEditableRowKeys(keys);
        }
    }, [initialValue]);

    const ids = (formRef?.getFieldValue('sceneItem') || []).map(item => item.localId);

    return (
        <DndContext
            onDragEnd={onDragEnd}
            modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                <EditableProTable<SceneItem>
                    rowKey="localId"
                    editableFormRef={editorFormRef}
                    name="sceneItem"
                    controlled={true}
                    columns={columns}
                    recordCreatorProps={{
                        position: 'bottom',
                        record: () => createDefaultSceneItem(),
                        newRecordType: 'dataSource',
                        creatorButtonText: '新增一行',
                        block: false,
                        color: 'primary',
                        variant: 'dashed',
                    }}
                    editable={{
                        type: 'multiple',
                        editableKeys,
                        onChange: setEditableRowKeys,
                        actionRender: (row) => {
                            const arr = [<span
                                key="add-self"
                                className="cursor-pointer text-primary"
                                onClick={() => {
                                    const tableDataSource = formRef?.getFieldValue(
                                        'sceneItem',
                                    ) as SceneItem[];
                                    const index = tableDataSource.findIndex((item) => item.localId === row.localId);
                                    const data = createDefaultSceneItem();
                                    tableDataSource.splice(index + 1, 0, data)
                                    formRef.setFieldValue('sceneItem', tableDataSource);
                                    setEditableRowKeys((keys) => [...keys, data.localId])
                                }}
                            >
                                <PlusCircleOutlined />
                            </span>]
                            if (!row.id) {
                                arr.push(<span
                                    key="del-self"
                                    className="cursor-pointer text-primary"
                                    onClick={() => {
                                        const tableDataSource = formRef?.getFieldValue(
                                            'sceneItem',
                                        ) as SceneItem[];
                                        formRef.setFieldValue('sceneItem', tableDataSource.filter(item => item.localId !== row.localId));
                                        setEditableRowKeys((keys) => keys.filter(item => item !== row.localId))
                                    }}
                                >
                                    <MinusCircleOutlined style={{ color: 'var(--error-color)' }} />
                                </span>)
                            }

                            return arr;
                        },
                    }}
                    components={{ body: { row: Row } }}
                />
            </SortableContext>
        </DndContext>
    );
};