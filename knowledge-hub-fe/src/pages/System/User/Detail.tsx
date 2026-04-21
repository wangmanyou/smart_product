import React, { useEffect } from 'react';
import {
    ModalForm,
} from '@ant-design/pro-components';
import { Form, Button, message } from 'antd';

import InfoForm from './InfoForm';

import { editUserApi, } from '@/services/system/user';

import { getFilenameByPath } from '@/utils/download';


interface Props {
    info: any;
    [x: string]: any
}
const DetailForm: React.FC<Props> = ({
    info,
}) => {

    const [form] = Form.useForm<{ name: string; company: string }>();

    const handleFinish = async (values) => {
        try {
            const { account, name, email, phone, sex, password, avatar } = values;
            const icon = !!avatar ? avatar?.[0]?.response?.file_path : undefined;

            await editUserApi({
                account, name, email, phone, sex, password,
                avatar: icon,
            })
            handleRefresh();
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
            avatar: !!userPicture ? [{
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
            title={'查看'}
            trigger={
                <span className='text-center cursor-pointer shrink-0'>
                    查看
                </span>
            }
            form={form}
            modalProps={{
                destroyOnClose: false,
                footer: null,
            }}
            submitter={false}
            autoFocusFirstInput
            onFinish={handleFinish}>
            <InfoForm
                type="check"
                form={form} />
        </ModalForm>
    );
};
export default DetailForm;