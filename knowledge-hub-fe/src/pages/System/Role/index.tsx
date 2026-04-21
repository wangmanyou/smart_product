import { PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable, TableDropdown } from '@ant-design/pro-components';
import { Popconfirm, Tooltip, Button } from 'antd';
import { useModel, history } from '@umijs/max';
import { useCallback } from 'react';

import { deleteUserApi, getUserListApi } from '@/services/system/user';

const valueEnum = {
    0: 'close',
    1: 'running',
};

export type TableListItem = {
    key: number;
    name: string;
    containers: number;
    creator: string;
    status: string;
    createdAt: number;
    progress: number;
    money: number;
};
const tableListDataSource: TableListItem[] = [];

const creators = ['付小小', '曲丽丽', '林东东', '陈帅帅', '兼某某'];

for (let i = 0; i < 5; i += 1) {
    tableListDataSource.push({
        key: i,
        name: 'AppName',
        containers: Math.floor(Math.random() * 20),
        creator: creators[Math.floor(Math.random() * creators.length)],
        status: valueEnum[((Math.floor(Math.random() * 10) % 4) + '') as '0'],
        createdAt: Date.now() - Math.floor(Math.random() * 2000),
        money: Math.floor(Math.random() * 2000) * i,
        progress: Math.ceil(Math.random() * 100) + 1,
    });
}



export default () => {

    const {
        openRole,
        setOpenRole,
        openRoleInfo,
        setOpenRoleInfo,
    } = useModel('user')

    // 刷新列表
    const handleRefresh = useCallback(() => {
        console.log('刷新')
    }, [])

    // 列表请求
    const handleRequest = useCallback(async (params, sort, filter) => {
        console.log(2222, params, sort, filter);

    }, [])

    // 新增
    const handleAdd = useCallback(() => {
        history.push('/system/role/add')
    }, [])
    // 角色配置
    const handleRoleSet = useCallback((bool: boolean, info: any) => {
        setOpenRole(bool);
        setOpenRoleInfo(info);
    }, [])

    // 删除
    const handleDel = useCallback(async (info: any) => {
        try {
            await deleteUserApi(info.id)
            handleRefresh();
        } catch (error) {
            console.log(error)
        }
    }, [])

    // 启用
    const handleStart = useCallback(async (info: any) => {
        try {
            await deleteUserApi(info.id)
            handleRefresh();
        } catch (error) {
            console.log(error)
        }
    }, [])

    // 停用
    const handleStop = useCallback(async (info: any) => {
        try {
            await deleteUserApi(info.id)
            handleRefresh();
        } catch (error) {
            console.log
        }
    })

    const columns: ProColumns<TableListItem>[] = [
        {
            title: '排序',
            dataIndex: 'index',
            valueType: 'indexBorder',
            width: 48,
        },
        {
            title: '角色名称',
            dataIndex: 'roleName',
        },
        {
            title: '角色备注',
            dataIndex: 'roleRemark',
        },
        {
            title: '角色状态',
            dataIndex: 'status',
            valueEnum: {
                close: { text: '停用', status: 'Error' },
                running: { text: '正常', status: 'Success' },
            },
        },
        {
            title: '操作',
            width: 280,
            key: 'option',
            valueType: 'option',
            fixed: 'right',
            render: (_, record) => {
                return (
                    <div className='flex justify-between gap-4 items-center'>
                        <span>查看</span>
                        <span>编辑</span>

                        {
                            record.status === '停用' ?
                                <span className='shrink-0 cursor-pointer text-success' onClick={() => handleStart(record)}>启用</span>
                                : <span className='shrink-0 cursor-pointer text-error' onClick={() => handleStop(record)}>停用</span>
                        }

                        <Popconfirm
                            title="删除"
                            description="确定要删除这个用户吗?"
                            onConfirm={handleDel}
                            okText="确定"
                            cancelText="取消"
                        >
                            <Tooltip title="删除" placement='top'>
                                <span className='shrink-0 cursor-pointer text-error'>
                                    删除
                                </span>
                            </Tooltip>
                        </Popconfirm>

                    </div>
                )
            },
        },
    ];

    return (
        <div>
            <ProTable<TableListItem>
                columns={columns}
                request={handleRequest}
                rowKey="key"
                pagination={{
                    showQuickJumper: true,
                }}
                search={{
                    layout: 'vertical',
                    defaultCollapsed: false,
                }}
                dateFormatter="string"
                toolBarRender={() => [
                    <Button icon={<PlusOutlined />} type="primary" onClick={handleAdd}>新增</Button>,
                ]}
            />

        </div>

    );
};