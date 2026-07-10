import React, { useEffect, useCallback } from 'react';
import {
    ModalForm,
    ProFormText,
} from '@ant-design/pro-components';
import { Form, Button, message, Space } from 'antd';

import { resetUserPasswordApi } from '@/services/system/user';
import { generateRandomPassword, copyTextToClipboard } from '@/utils/common';



interface Props {
    info: any;
    handleRefresh: () => void;
    [x: string]: any
}
const EditForm: React.FC<Props> = ({
    info,
    handleRefresh,
}) => {

    const [form] = Form.useForm<{ name: string; company: string }>();

    const handleFinish = async (values) => {
        try {
            const { password } = values;

            await resetUserPasswordApi({
                userId: info.userId,
                userPassword: password,
            })
            handleRefresh();
            return true
        } catch (error) {
            message.error('重置密码成功')
        }
    };

    useEffect(() => {
        const { password } = info;
        form.setFieldsValue({
            password: password || undefined,
        })
    }, [])

    // 生成随机密码
    const handleCreatePassword = useCallback(() => {
        const password = generateRandomPassword();
        form?.setFieldValue('password', password);
    }, [])

    // 复制密码
    const handleCopy = useCallback(() => {
        copyTextToClipboard(form?.getFieldValue('password'), (bool) => {
            if (bool) {
                message.success('已复制');
            } else {
                message.error('复制失败');
            }
        })
    }, [])


    return (
        <ModalForm
            width={500}
            title={'重置密码'}
            trigger={
                <span className='text-center cursor-pointer shrink-0'>
                    重置密码
                </span>
            }
            form={form}
            modalProps={{
                destroyOnClose: true,
            }}
            autoFocusFirstInput
            onFinish={handleFinish}>
            <Space direction="horizontal" className='flex items-center'>
                <ProFormText.Password
                    label="用户密码"
                    name="password"
                    required={true}
                    fieldProps={{
                        autoComplete: 'new-password',
                    }}
                    rules={[{
                        required: true,
                        message: '请输入用户密码',
                    }, {
                        // 只能包含数字，大小写字母
                        pattern: /^[A-Za-z0-9]{6,}$/,
                        message: '密码只能包含数字，大小写字母，至少6位长度',
                    }, {
                        max: 50,
                        message: '密码长度不能超过50字符',
                    }]} />
                <Button
                    color='primary'
                    variant='link'
                    style={{ width: 40 }}
                    onClick={handleCreatePassword}>
                    随机
                </Button>
                <Button
                    color='default'
                    variant='link'
                    style={{ width: 40 }}
                    onClick={handleCopy}>
                    复制
                </Button>
            </Space>
        </ModalForm>
    );
};
export default EditForm;