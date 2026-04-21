import React, { useCallback, useEffect, useState } from 'react';
import { Transfer, Modal, message } from 'antd';
import type { TransferProps } from 'antd';

import { getRoleListApi } from '@/services/system/role';
import { roleConfigApi } from '@/services/system/user';


interface Props {
    open: boolean;
    setOpen: (value: boolean) => void;
    info: any;
    handleRefresh: () => void;
    [x: string]: any
}

const mockData = Array.from({ length: 50 }).map<RecordType>((_, i) => ({
    key: i.toString(),
    title: `content${i + 1}`,
    description: `description of content${i + 1}`,
}));

const initialTargetKeys = mockData.filter((item) => Number(item.key) > 40).map((item) => item.key);

const EditForm: React.FC<Props> = ({
    currentRole,
    open,
    setOpen,
    handleRefresh,
}) => {

    const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>(initialTargetKeys);
    const [selectedKeys, setSelectedKeys] = useState<TransferProps['selectedKeys']>([]);
    const [roleList, setRoleList] = useState<any>([]);

    const handleFinish = async (values) => {
        try {
            console.log(23444, targetKeys)
            await roleConfigApi(targetKeys)
            handleRefresh();
        } catch (error) {
            message.error('添加成功')
        }
    };

    const onChange: TransferProps['onChange'] = (nextTargetKeys, direction, moveKeys) => {
        console.log('targetKeys:', nextTargetKeys);
        console.log('direction:', direction);
        console.log('moveKeys:', moveKeys);
        setTargetKeys(nextTargetKeys);
    };

    const onSelectChange: TransferProps['onSelectChange'] = (
        sourceSelectedKeys,
        targetSelectedKeys,
    ) => {
        console.log('sourceSelectedKeys:', sourceSelectedKeys);
        console.log('targetSelectedKeys:', targetSelectedKeys);
        setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
    };

    const onScroll: TransferProps['onScroll'] = (direction, e) => {
        console.log('direction:', direction);
        console.log('target:', e.target);
    };

    const getRolesList = useCallback(async () => {
        try {
            const data = await getRoleListApi({
                pageNumber: 1,
                pageSize: 9999,
            })
            setRoleList(data.content)
        } catch (error) {

        }
    }, [])

    useEffect(() => {
        // getRolesList()
        // 获取所有角色
    }, [])



    return (
        <Modal
            width={1000}
            wrapClassName="user-role-config-modal"
            title={'配置角色'}
            open={open}
            destroyOnClose={true}
            onCancel={() => setOpen(false)}
            onOk={handleFinish}>
            <Transfer
                dataSource={mockData}
                titles={['全部角色', '已选角色']}
                targetKeys={targetKeys}
                onChange={onChange}
                onSelectChange={onSelectChange}
                onScroll={onScroll}
                render={(item) => item.title}
                oneWay
                style={{ marginBottom: 16 }}
                listStyle={{
                    width: '100%',
                    height: '100%',
                }}
            />
        </Modal >
    );
};
export default EditForm;