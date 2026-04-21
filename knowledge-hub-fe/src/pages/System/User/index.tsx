import { PlusOutlined } from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { message, Popconfirm, Tooltip } from 'antd';
import { useModel } from '@umijs/max';

import CreateForm from './CreatForm';
import EditForm from './EditForm';
import DetailForm from './Detail';
import ResetPassword from './ResetPassword';
import RoleConfig from './RoleConfig';
import { useCallback, useEffect } from 'react';

import { deleteUserApi, getUserListApi, stopApi, startApi } from '@/services/system/user';

import { formatFilterEmpty } from '@/utils/format';

export default () => {

    const {
        openRole,
        setOpenRole,
        openRoleInfo,
        setOpenRoleInfo,
        list,
        saveList,
        searchParams,
        saveSearchParams,
        total,
    } = useModel('user')

    const { initialState } = useModel('@@initialState');

    const currentUserAccount = initialState?.userInfo?.userAccount;

    // 刷新列表
    const handleRefresh = useCallback(async (params?: any) => {
        try {
            const nowParams = {
                ...searchParams,
                ...params,
            }
            const res = await getUserListApi(nowParams)
            saveList(res.content, res.totalElements)
        } catch (error) {
            console.log(error)
        }
    }, [searchParams])

    // 列表请求
    const handleRequest = useCallback(async (params) => {
        saveSearchParams({
            ...searchParams,
            ...params,
        })
        try {
            const res = await getUserListApi(params)
            saveList(res.content, res.totalElements)
        } catch (error) {
            message.error('获取数据失败')
            console.log(error)
        }

    }, [searchParams])

    // 角色配置modal
    const handleRoleSet = useCallback((bool: boolean, info: any) => {
        setOpenRole(bool);
        setOpenRoleInfo(info);
    }, [])

    // 删除
    const handleDel = useCallback(async (info: any) => {
        try {
            await deleteUserApi({
                userId: info.userId
            })
            if (list?.length === 1) {
                handleRefresh({
                    pageNumber: 1,
                });
            } else {
                handleRefresh();
            }

        } catch (error) {
            message.error('删除失败')
            console.log(error)
        }
    }, [list])

    // 启用
    const handleStart = useCallback(async (info: any) => {
        try {
            await startApi(
                {
                    userId: info.userId,
                    isDisabled: false,
                }
            )
            handleRefresh();
        } catch (error) {
            console.log(error)
        }
    }, [])

    // 停用
    const handleStop = useCallback(async (info: any) => {
        try {
            await stopApi({
                userId: info.userId,
                isDisabled: true,
            })
            handleRefresh();
            message.success('账号已停用');
        } catch (error) {
            console.log()
        }
    }, [])

    const columns = [
        {
            title: '用户ID',
            dataIndex: 'userId',
            valueType: 'userId',
            search: false,
        },
        {
            title: '用户账号',
            dataIndex: 'userAccount',
        },
        {
            title: '用户昵称',
            dataIndex: 'userNickname',
        },
        {
            title: '用户邮箱',
            dataIndex: 'userEmail',
        },
        {
            title: '手机号码',
            dataIndex: 'userPhoneNum',
        },
        {
            title: '性别',
            dataIndex: 'userSex',
            valueEnum: {
                '未知': { text: '未知' },
                '男': { text: '男' },
                '女': { text: '女' },
            },
            render: (_, record) => {
                return <span>{!!record.userSex ? record.userSex : '未知'}</span>
            }
        },
        {
            title: '账号状态',
            dataIndex: 'isDisabled',
            valueEnum: {
                'all': { text: '全部' },
                'disabled': { text: '停用', status: 'Error' },
                'enabled': { text: '正常', status: 'Success' },
            },
            initialValue: 'all',
            render: (_, record) => {
                if (!record.isDisabled) {
                    return (
                        <span className='text-success'>正常</span>
                    )
                }
                return (
                    <span className='text-error'>已停用</span>
                )

            }
        },
        {
            title: '操作',
            width: 280,
            key: 'option',
            valueType: 'option',
            fixed: 'right',
            render: (_, record) => {
                return (
                    <div className='flex  gap-4 items-center'>
                        <DetailForm info={record} />
                        <EditForm
                            info={record}
                            handleRefresh={handleRefresh} />
                        {
                            record.isDisabled ?
                                <span className='shrink-0 cursor-pointer text-success' onClick={() => handleStart(record)}>启用</span>
                                : record.userAccount !== 'admin' && record.userAccount !== currentUserAccount && <span className='shrink-0 cursor-pointer text-error' onClick={() => handleStop(record)}>停用</span>
                        }

                        <ResetPassword
                            info={record}
                            handleRefresh={handleRefresh} />
                        {/* <span className='shrink-0 cursor-pointer' 
                            onClick={() => handleRoleSet(true, record)}>
                                配置角色
                        </span> */}
                        {
                            record.userAccount !== 'admin' && record.userAccount !== currentUserAccount && (
                                <Popconfirm
                                    title="删除"
                                    description="确定要删除这个用户吗?"
                                    onConfirm={() => handleDel(record)}
                                    okText="确定"
                                    cancelText="取消"
                                >
                                    <Tooltip title="删除" placement='top'>
                                        <span className='shrink-0 cursor-pointer text-error'>
                                            删除
                                        </span>
                                    </Tooltip>
                                </Popconfirm>
                            )
                        }


                    </div>
                )
            },
        },
    ];


    useEffect(() => {
        handleRequest({
            pageSize: 10,
            pageNumber: 1,
        })
    }, [])

    return (
        <div>
            <ProTable<TableListItem>
                columns={columns}
                dataSource={list || []}
                request={async (params) => {
                    const { current, pageSize, userAccount, userNickname, userEmail,
                        userPhoneNum, userSex, isDisabled,
                    } = params;

                    const searchParams = formatFilterEmpty({
                        pageSize,
                        pageNumber: current,
                        searchUserAccount: userAccount,
                        searchUserNickname: userNickname,
                        searchUserEmail: userEmail,
                        searchUserPhoneNum: userPhoneNum,
                        searchUserSex: userSex,
                        searchUserDisabled: isDisabled,
                    })

                    handleRequest(searchParams)
                }}
                rowKey={(row) => row.userId}
                pagination={{
                    showQuickJumper: true,
                    pageSize: searchParams.pageSize,
                    current: searchParams.pageNumber,
                    total: total,

                }}
                search={{
                    layout: 'vertical',
                    defaultCollapsed: false,

                }}
                dateFormatter="string"
                toolBarRender={() => [
                    <CreateForm
                        info={null}
                        handleRefresh={handleRefresh} />,
                ]}
            />
            <RoleConfig
                open={openRole}
                setOpen={setOpenRole}
                info={null}
                currentRole={openRoleInfo}
                handleRefresh={handleRefresh} />
        </div>
    );
};