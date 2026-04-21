import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space, message } from 'antd';
import React, { useCallback, useEffect } from 'react';

import { SceneItem } from '../types';
import { ActionType } from '@/constants/type';

import SceneItemComp from './SceneItem';


type FieldType = {
    sceneName?: string;
    sceneItem?: SceneItem[];
};

type Props = {
    sourceType: ActionType;
    sceneTemplateId?: number;
    initialValues?: FieldType;
    handleSubmit: (values: any) => void;
};

const SceneForm: React.FC<Props> = ({
    handleSubmit,
    initialValues,
    sourceType,
}) => {
    const [form] = Form.useForm();

    const isEdit = sourceType === ActionType.edit;

    // 提交
    const handleFinish = useCallback(async (values: FieldType) => {
        const { sceneItem } = values;
        // 校验name是否重复， 校验目录是否填写
        if (!sceneItem || !sceneItem.length) {
            message.error('至少填写一个模版');
            return;
        }
        const hasRepeat = sceneItem.map((item: SceneItem) => item.sceneItemName);
        if (new Set(hasRepeat).size !== hasRepeat.length) {
            message.warning('模版名称不能重复，请检查')
            return;
        }
        const dicts = sceneItem.filter(item => item.type === 'dict');
        for (let dict of dicts) {
            if (!dict.dictTemplateId) {
                message.error('请选择目录类型');
                return;
            }
        }
        const sceneItemResult = sceneItem.map((item: SceneItem, index: number) => {
            return {
                ...item,
                sortNumber: index + 1,
            }
        })

        handleSubmit({
            ...values,
            sceneItem: sceneItemResult,
        });
    }, []);

    // 重置
    const handleReset = useCallback(() => {
        form.resetFields();
    }, [form]);

    useEffect(() => {
        form.setFieldsValue(initialValues);
    }, []);

    return (
        <Form
            name="basic"
            labelAlign="left"
            initialValues={initialValues}
            onFinish={handleFinish}
            onFinishFailed={(error) => console.log(error)}
            autoComplete="off"
            labelWrap={true}
            form={form}
            preserve={true}
        >
            <Form.Item<FieldType>
                label="场景名称"
                name="sceneName"
                rules={[
                    { required: true, message: '请输入场景名称' },
                    { type: 'string', whitespace: true, message: '请输入有效内容' },
                ]}
            >
                <Input />
            </Form.Item>

            <Form.Item<FieldType> label="场景内容" required={true}></Form.Item>
            <Form.Item<FieldType>
                label=""
                className="w-full dict-content"
                wrapperCol={{ span: 24 }}
                preserve={true}
            >
                <SceneItemComp
                    sourceType={sourceType}
                    formRef={form}
                    initialValue={initialValues?.sceneItem}
                    isEdit={isEdit} />
            </Form.Item>

            <Form.Item label={null} layout="horizontal" wrapperCol={{ span: 24 }}>
                <Space size={[16, 16]} className="w-full flex justify-center">
                    <Button
                        type="default"
                        onClick={handleReset}
                        icon={<ReloadOutlined />}
                    >
                        重置
                    </Button>
                    <Button type="primary" htmlType="submit" icon={<CheckOutlined />}>
                        提交
                    </Button>
                </Space>
            </Form.Item>
        </Form>
    );
};

export default SceneForm;
