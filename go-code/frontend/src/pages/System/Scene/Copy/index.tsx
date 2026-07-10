import React, { useCallback, useEffect, useState } from 'react';
import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Space, message } from 'antd';
import { history } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-layout';

import { copySceneApi, getSceneListApi } from '@/services/system/scene';

type FieldType = {
    sceneName: string;
    sceneTemplateId: number;
};

const CopyForm: React.FC = ({ }) => {
    // const params = useParams();
    // const sceneTemplateId = params?.id;

    const [sceneTemplate, setSceneTemplate] = useState<any>(null);

    const [form] = Form.useForm();
    // 提交
    const handleSubmit = useCallback(async (values: FieldType) => {
        try {
            await copySceneApi(values);
            message.success('复制成功');
            history.push('/system/scene');
        } catch (error) {
            message.error('复制失败');
        }
    }, []);

    // 重置
    const handleReset = useCallback(() => {
        form.resetFields();
    }, [form]);

    // 获取模版
    const getSceneList = useCallback(async (name: string) => {
        try {
            const res = await getSceneListApi({
                pageSize: 1000,
                pageNumber: 1,
                searchSceneName: name,
            });
            if(res?.totalElements > 0) {
                setSceneTemplate(res?.content?.map(item => ({
                    value: item.sceneTemplateId,
                    label: item.sceneName,
                })));

            } else {
                setSceneTemplate([]);
            }
        } catch (error) {
            message.error('获取模版失败');
        }
    }, []);

    useEffect(() => {
        getSceneList('');
    }, [])

    return (
        <PageContainer>
            <div className="h-full overflow-y-auto bg-white dict-action-page">
                <div className="px-48 m-auto pb-24 pt-48">
                    <Form
                        name="basic"
                        labelAlign="left"
                        // initialValues={null}
                        onFinish={handleSubmit}
                        onFinishFailed={(error) => console.log(error)}
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
                            <Input placeholder='请输入场景名称' />
                        </Form.Item>

                        <Form.Item<FieldType> 
                            name="sceneTemplateId" 
                            label="场景模版" 
                            required={true}>
                            <Select 
                                options={sceneTemplate || []} 
                                placeholder="请选择场景模版" />
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
                                    复制
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </PageContainer>

    );
};

export default CopyForm;