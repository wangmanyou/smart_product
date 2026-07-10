import React, { useCallback, useState } from 'react';
import {
    ProForm, ProFormUploadButton, ProFormSelect,
    ProFormText,
} from '@ant-design/pro-components';
import { Space, message, Button } from 'antd';
import type { UploadProps } from 'antd';

import { isSupportFileType } from '@/utils/judge';
import { generateRandomPassword, copyTextToClipboard } from '@/utils/common';


const limit = {
    type: ['.jpg', '.jpeg', '.png'],
    size: 50,
}

const extra = `文件大小不能超过${limit?.size}MB, 只支持${limit?.type.join(',')}格式的文件`;

interface Props {
    type: 'create' | 'edit' | 'check';
    form: any;
    [x: string]: any
}
const InfoForm: React.FC<Props> = ({
    type,
    form,
}) => {

    const disabled = type === 'check';

    const handleBeforeUpload = (file: File) => {

        if (file.size / 1024 / 1024 > limit?.size) {
            message.error(`文件大小不能超过${limit?.size}MB`);

            return false;
        }

        if (!isSupportFileType(file, limit?.type)) {
            message.error(`文件格式不正确, 请上传${limit?.type.join(',')}格式的文件`);

            return false;
        }
        return true;
    }

    const handleChange: UploadProps['onChange'] = (info) => {
        const { file } = info;
        if (file.status === 'done') {
            const { status } = file.response;
            if (status === "success") {
                form?.setFieldValue('avatar', [{
                    name: file.name,
                    status: 'success',
                    url: file.response.file_path,
                    response: file.response,
                }])
                message.success(`${file.name}上传成功`);
            } else {
                file.status = 'error';
                form?.setFieldValue('avatar', [])
                message.error(`${file.name} 上传失败，请删除后重新上传`);
            }

        } else if (file.status === 'error') {
            form?.setFieldValue('avatar', [])
            message.error(`${file.name} 上传失败，请重新上传`);
        } else if (!file.hasOwnProperty('status')) {
            form?.setFieldValue('avatar', [])
        }

    };

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
        <>
            <ProForm.Group>
                <ProFormText
                    width='lg'
                    label="用户账号"
                    name="account"
                    placeholder="请输入用户账号"
                    fieldProps={{
                        maxLength: 50,
                        showCount: true,
                        disabled: disabled || type === 'edit',
                    }}
                    rules={[{
                        required: true,
                        message: '请输入用户账号',
                    }, {
                        min: 1,
                        max: 50,
                        whitespace: true,
                        message: '用户账号长度不能超过50字符',
                    }]} />

                <ProFormText
                    width='lg'
                    label="用户昵称"
                    placeholder="请输入用户昵称"
                    name="name"
                    fieldProps={{
                        maxLength: 50,
                        showCount: true,
                        disabled,
                    }}
                    rules={[{
                        min: 0,
                        max: 50,
                        whitespace: true,
                        message: '用户账号长度不能超过50字符',
                    }]} />
            </ProForm.Group>

            <ProForm.Group>
                <ProFormText
                    width='lg'
                    label="用户邮箱"
                    placeholder="请输入用户邮箱"
                    fieldProps={{
                        disabled,
                        maxLength: 255,
                        showCount: true,
                    }}
                    name="email"
                    rules={[{
                        type: 'email',
                        min: 0,
                        max: 255,
                        whitespace: true,
                        message: '请检查邮箱',
                    }, {
                        
                    }]} />
                <ProFormText
                    width='lg'
                    label="手机号码"
                    placeholder="请输入手机号码"
                    name="phone"
                    fieldProps={{
                        disabled,
                        maxLength: 11,
                        showCount: true,
                    }}
                    rules={[{
                        min: 11,
                        max: 11,
                        whitespace: true,
                        message: '手机号码需要11位数字字符',
                    }]} />
            </ProForm.Group>

            <ProForm.Group>

                <ProFormSelect
                    width={'lg'}
                    label="用户性别"
                    name="sex"
                    fieldProps={{
                        disabled,
                        defaultValue: '未知',
                    }}
                    valueEnum={{
                        '未知': '未知',
                        '男': '男',
                        '女': '女',
                    }}
                />
                {
                    type === 'create' && (
                        <Space direction="horizontal">
                            <ProFormText.Password
                                label="用户密码"
                                name="password"
                                fieldProps={{
                                    disabled,
                                    autoComplete: 'new-password',
                                }}
                                required={true}
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
                                onClick={handleCreatePassword}
                                disabled={disabled}>
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
                    )
                }


            </ProForm.Group>
            <ProForm.Group>
                <ProFormUploadButton
                    accept={limit?.type.join(',')}
                    name={'avatar'}
                    label={'用户头像'}
                    fieldProps={{
                        disabled,
                        maxCount: 1,
                        withCredentials: true,
                        listType: 'picture-card',
                        action: '/api/v1/data/business/upload/file',
                        beforeUpload: handleBeforeUpload,
                        onChange: handleChange,
                        data: (file) => ({
                            filename: file.name,
                        }),
                    }}
                    extra={extra}
                />
            </ProForm.Group>
        </>
    );
};
export default InfoForm;