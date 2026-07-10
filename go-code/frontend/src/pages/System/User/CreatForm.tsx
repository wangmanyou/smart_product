import React from 'react';
import {
    ModalForm,
} from '@ant-design/pro-components';
import { Form, Button, message } from 'antd';

import { PlusOutlined } from '@ant-design/icons';

import InfoForm from './InfoForm';

import { createUserApi } from '@/services/system/user';



interface Props {
    info?: any;
    handleRefresh: () => void;
    [x: string]: any
}
const CreateForm: React.FC<Props> = ({
    handleRefresh,
}) => {

    const [form] = Form.useForm<{ name: string; company: string }>();

    const handleFinish = async (values) => {
        try {
            const { account, name, email, phone, sex, password, avatar } = values;
            const icon = !!avatar ? avatar?.[0]?.response?.file_path : undefined;

            await createUserApi({
                userAccount: account, 
                userNickname: name, 
                userEmail: email, 
                userPhoneNum: phone, 
                userSex: sex !== '未知' ? sex : '', 
                userPassword: password,
                userPicture: icon,
            })
            handleRefresh();
            return true

        } catch (error) {
            message.error('添加失败')
        }
    };


    return (
        <ModalForm
            width={1000}
            title={'新增用户'}
            trigger={
                <Button type="primary">
                    <PlusOutlined />
                    新增
                </Button>
            }
            form={form}
            modalProps={{
                destroyOnClose: true,
            }}
            autoFocusFirstInput
            onFinish={handleFinish}>
            <InfoForm
                type="create"
                form={form} />
        </ModalForm>
    );
};
export default CreateForm;