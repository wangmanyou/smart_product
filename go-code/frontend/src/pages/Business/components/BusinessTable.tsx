import {
    PlusOutlined, UploadOutlined, FileOutlined, EyeOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { history, Link, useModel } from '@umijs/max';
import type { TableProps } from 'antd';
import { Button, Table, Tag, Upload, Space, Tooltip, Modal, message } from 'antd';
import React, { useCallback, useMemo, useState } from 'react';
import { SceneType, SceneTypeConfigEnum } from '@/constants/type';

import dayjs from 'dayjs';

import DropdownAction from './DropdownAction';

import DefaultImage from '@/components/DefaultImages';
import DefaultAudio from '@/components/DefaultAudio';
import DefaultVideo from '@/components/DefaultVideo';
import DefaultFile from '@/components/DefaultFile';


import { findPlaneDictById, findTreeDictById } from '@/utils/business';

import { exportTemplateApi, 
    // exportDataApi, 
    importDataApi 
} from '@/services/business';

interface Props {
    businessId: number;
    sceneData: any;
    list: any[];
    total: number;
    loading: boolean;
    pageSize: number;
    pageNumber: number;
    isDisabled: boolean;
    getSearchList: (data: any) => void;
    handleRefresh: (type: string) => void;
    handlePageChange: ({page, pageSize}: {page: number, pageSize: number}) => void;
    handleActionDisabled: (id: number, status: boolean) => void;
}


const BusinessTable: React.FC<Props> = ({
    businessId,
    sceneData,
    isDisabled,
    list,
    total,
    loading,
    pageSize,
    pageNumber,
    handleRefresh,
    handlePageChange,
    // handleActionDisabled,
}) => {

    console.log(99, pageNumber, pageSize)

    const [visible, setVisible] = useState(false);
    const [currentFiles, setCurrentFiles] = useState<any>({});

    const [uploading, setUploading] = useState(false);

    const handleCheckFiles = (nowType: SceneType, nodeValues: string[]) => {
       
        setVisible(true);
        setCurrentFiles({
            type: nowType,
            data: nodeValues,
        })
    }

    const {
        setSettingOpen,
        setSettingInfo,
    } = useModel('businessDetail')


    // 设置
    const handleSetting = useCallback((info) => {
        setSettingOpen(true)
        setSettingInfo(info);

    }, [])

    const columns = useMemo(() => {
        const nowColumns: TableProps<any>['columns'] = [{
            title: '知识ID',
            dataIndex: 'knowledgeId',
            key: 'knowledgeId',
            fixed: 'left',
            width: 100,
            render: (knowledgeId) => {
                return <Link className='text-primary' to={`/business/${businessId}/knowledge/${knowledgeId}`}>{knowledgeId}</Link>
            },
        }]
        sceneData?.forEach((item) => {
            const nowItem: any = {
                title: item.sceneItemName,
                dataIndex: item.id,
                key: item.id,

            }
            if (item.type === SceneType.dict) {
                nowItem.render = (text) => {
                    if (!text?.sceneItemSelectDictTreeIds) {
                        return '--'
                    }
                    const val = JSON.parse(text?.sceneItemSelectDictTreeIds);
                    if (item.dictType === 'plane') {
                        const names = findPlaneDictById(item.dict, val);
                        return names && names.length ? names?.map(name => <><Tag key={name}>{name}</Tag><br /></>) : '--'
                    }

                    const names = findTreeDictById(item.dict, val);
                    if (names && Array.isArray(names)) {
                        return names.map(name => <><Tag key={name}>{name}</Tag><br /></>)
                    } else if(names) {
                        return <Tag>{names}</Tag>;
                    }
                    return '--'

                    
                }
            }
            if (item.type === SceneType.audio || item.type === SceneType.video || item.type === SceneType.picture || item.type === SceneType.file) {
                nowItem.render = (values) => {
                    if (values?.sceneItemValue && values?.sceneItemValue.length) {
                        return (
                            <span
                                className='text-primary cursor-pointer'
                                onClick={() => handleCheckFiles(item.type, values.sceneItemValue)}>
                                查看
                            </span>
                        )
                    }
                    return '--'
                }
            }
            if (item.type === SceneType.text) {
                nowItem.ellipsis = true;
                nowItem.render = (value) => {
                    const now = value?.sceneItemValue;
                    if (!now || !now.length) {
                        return '--'
                    }
                    return <div title={now} className='ant-table-cell-ellipsis'>{now.join('')}</div>
                }
            }
            if (item.type === SceneType.datetime) {
                nowItem.render = (value) => {
                    const now = value?.sceneItemValue;
                    if (!now || !now.length) {
                        return '--'
                    }
                    if (item.multiValue) {
                        return now?.join(' 至 ') || '--'
                    }
                    return now.join('，')
                }
            }
            if (item.type === SceneType.integer || item.type === SceneType.decimal) {
                nowItem.render = (value) => {
                    const now = value?.sceneItemValue;
                    if (!now || !now.length) {
                        return '--'
                    }
                    return now.join('，')
                }
            }

            nowColumns.push(nowItem)
        })

        nowColumns?.push({
            title: '创建时间',
            dataIndex: 'createTime',
            key: 'createTime',
            render: (_, record) => {
                const num = !!record.createTime ? Number(record.createTime) * 1000 : 0;
                if (!num) {
                    return '--'
                }
                return dayjs(num).format('YYYY-MM-DD HH:mm:ss')
            }
        }, {
            title: '更新时间',
            dataIndex: 'updateTime',
            key: 'updateTime',
            render: (_, record) => {
                const num = !!record.updateTime ? Number(record.updateTime) * 1000 : 0;
                if (!num) {
                    return '--'
                }
                return dayjs(num).format('YYYY-MM-DD HH:mm:ss')
            }

        }, {
            title: '创建人',
            dataIndex: 'creatorName',
            key: 'creatorName',

        }, {
            title: '操作',
            dataIndex: 'action',
            key: 'action',
            fixed: 'right',
            width: 80,
            render: (_, record) => {
                return (
                    <Space size="small" className='flex justify-between items-center'>
                        <Tooltip title="查看详情" placement='top'>
                            <span
                                className="cursor-pointer"
                                onClick={() =>
                                    history.push(`/business/${businessId}/knowledge/${record.knowledgeId}`)
                                }
                            >
                                <EyeOutlined />
                            </span>
                        </Tooltip>
                        <DropdownAction
                            businessId={businessId}
                            knowledgeId={record.knowledgeId}
                            isDisabled={isDisabled}
                            record={record}
                            sceneData={sceneData}
                            handleSetting={handleSetting}
                            handleRefresh={handleRefresh} >
                            <span className='w-32 flex items-center justify-center cursor-pointer'>
                                <MoreOutlined style={{ color: 'var(--primary)' }} />
                            </span>
                        </DropdownAction>
                    </Space>
                )
            },
        })
        return nowColumns
    }, [sceneData])

    // 导出模版
    const handleDownnloadTemplate = useCallback(async () => {
        try {
            await exportTemplateApi(businessId)
        } catch (error: any) {
            message.error(error?.msg || '导出模版失败')
        }
    }, [])

    // 导出数据
    // const handleDownnload = useCallback(async () => {
    //     try {
    //         await exportDataApi(businessId)
    //     } catch (error: any) {
    //         message.error(error?.msg || '导出模版失败')
    //     }

    // }, [])

    // 导入数据
    const handleUpload = async (filePath: any) => {
        try {
            await importDataApi({
                sceneTemplateId: businessId,
                filePath,
            })
            message.success('导入成功')
            handleRefresh();
        } catch (error: any) {
            message.error(error?.msg || '导入失败')
        } finally {
            setUploading(false);
        }
    }


    return (
        <div>
            <div className="flex justify-end pb-12 gap-16">
                {
                    !isDisabled && (
                        <Button
                            type="primary"
                            onClick={() => history.push(`/business/${businessId}/create`)}
                            icon={<PlusOutlined />}
                        >
                            新增
                        </Button>
                    )
                }

                <Button
                    type="default"
                    onClick={handleDownnloadTemplate}
                    icon={<FileOutlined />}
                >
                    导出模版
                </Button>
                {
                    !isDisabled && (
                        <Upload
                            withCredentials={true}
                            action='/api/v1/data/business/upload/file'
                            data={(file) => ({
                                filename: file.name,
                            })}
                            onChange={(info) => {
                                setUploading(true)
                                const { file, fileList } = info;
                                if (file.status !== 'uploading') {
                                    console.log(file, fileList);
                                }
                                if (file.status === 'done') {
                                    if (file.response.status === 'success') {
                                        handleUpload(file?.response?.file_path)
                                    }
                                } else if (file.status === 'error') {
                                    message.error(`${file.name} 文件导入失败`);
                                    setUploading(false)
                                }
                            }}
                            showUploadList={false}>
                            <Button
                                type="default"
                                icon={<UploadOutlined />}
                                disabled={uploading}
                            >
                                导入数据
                            </Button>
                        </Upload>
                    )
                }


                {/* <Button
                    type="default"
                    onClick={handleDownnload}
                    icon={<DownloadOutlined />}
                >
                    导出数据
                </Button> */}
            </div>
            <Table
                columns={columns}
                dataSource={list}
                loading={loading}
                scroll={{
                    x: columns.length * 180,
                }}
                pagination={{
                    total: total,
                    pageSize: pageSize,
                    current: pageNumber,
                    defaultPageSize: 10,
                    showQuickJumper: true,
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 条`,
                    onChange: (page, pageSize) => {
                        // getSearchList({
                        //     pageNumber: page,
                        //     pageSize: pageSize,
                        // });

                        handlePageChange({
                            page: page,
                            pageSize: pageSize,
                        })
                    },
                    onShowSizeChange: (current, size) => {
                       
                        handlePageChange({
                            page: current,
                            pageSize: size,
                        })
                    },
                }}
            />

            <Modal
                open={visible}
                onCancel={() => setVisible(false)}
                onOk={() => setVisible(false)}
                footer={null}
                width={800}
                destroyOnClose={true}
                title={`${SceneTypeConfigEnum[currentFiles?.type]?.text}详情`}
            >
                {
                    currentFiles?.type === SceneType.picture ? (
                        <DefaultImage data={currentFiles.data} />
                    ) : currentFiles?.type === SceneType.video ? (
                        <DefaultVideo data={currentFiles.data} />
                    ) : currentFiles?.type === SceneType.audio ? (
                        <DefaultAudio data={currentFiles.data} />
                    ) : currentFiles?.type === SceneType.file ? (
                        <DefaultFile data={currentFiles.data} />
                    ) : ''
                }
            </Modal>

        </div >
    );
};

export default BusinessTable;
