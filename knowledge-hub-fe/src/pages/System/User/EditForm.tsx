import React, { useEffect } from 'react';
import {
    ModalForm,
} from '@ant-design/pro-components';
import { Form, Button, message } from 'antd';

import InfoForm from './InfoForm';

import { editUserApi } from '@/services/system/user';

import { getFilenameByPath } from '@/utils/download';


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
            console.log(344444, values)
            const { account, name, email, phone, sex, avatar } = values;
            const icon = !!avatar && avatar.length ? avatar?.[0]?.response?.file_path : '';

            await editUserApi({
                userId: info.userId,
                userAccount: account,
                userNickname: name,
                userEmail: email,
                userPhoneNum: phone,
                userSex: sex !== '未知' ? sex : '',
                userPicture: icon,
            })
            handleRefresh();
            return true
        } catch (error) {
            message.error('添加成功')
        }
    };

    useEffect(() => {
        const { userAccount, userNickname, userEmail, userPhoneNum, userSex, userPicture } = info;
        form.setFieldsValue({
            account: userAccount || '',
            name: userNickname || '',
            email: userEmail || '',
            phone: userPhoneNum || '',
            sex: userSex || '未知',
            avatar: !!(userPicture || ' ' ).trim() ? [{
                uid: 2,
                name: getFilenameByPath(userPicture),
                status: 'success',
                url: userPicture,
                response: {
                    status: 'success',
                    file_path: userPicture,
                },
            }] : undefined,
        })
    }, [info])


    return (
        <ModalForm
            width={1000}
            title={'编辑用户'}
            trigger={
                <span className='text-center cursor-pointer text-primary shrink-0'>
                    编辑
                </span>
            }
            form={form}
            modalProps={{
                destroyOnClose: false,
            }}
            omitNil={false}
            autoFocusFirstInput
            onFinish={handleFinish}>
            <InfoForm
                type="edit"
                form={form} />
        </ModalForm>
    );
};
export default EditForm;