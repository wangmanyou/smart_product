import React from 'react';
import { Drawer, Space, Button, Form, Input, message } from 'antd';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface Props {
    open: boolean;
    updateOpen: (open: boolean) => void;
    handleBatchAdd: (value: string[]) => void;
    [x: string]: any
}

type FieldType = {
    value: string;
}
const DictPlaneBatchAdd: React.FC<Props> = ({
    open,
    updateOpen,
    handleBatchAdd,
}) => {

    const [form] = Form.useForm();
    const onClose = () => {
        form?.resetFields();
        updateOpen(false);
    };

    const handleReset = () => {
        form?.resetFields();
    };

    const onFinish = (values: FieldType) => {
        const { value } = values;

        let lines = value.split('\n').filter(item => !!item.trim());
        if (!lines.length) {
            message.error('请输入有效内容');
            return;
        }
        const re: string[] = lines.map(item => item.trim());
        handleBatchAdd([...(new Set(re))]);
    };
    return (
        <Drawer
            title="批量新增"
            width={520}
            onClose={onClose}
            open={open}
            styles={{
                body: {
                    paddingBottom: 80,
                },
            }}
            destroyOnClose={true}
        >
            <div className='text-error py-16'>
                每一行代表一个内容名称，以换行符分隔单个内容！单行不能超过255个字符！
            </div>
            <Form
                name="basic"
                layout='vertical'
                initialValues={{ remember: true }}
                onFinish={onFinish}
                onFinishFailed={() => { }}
                autoComplete="off"
                form={form}
            >
                <Form.Item<FieldType>
                    label="目录内容名称"
                    name="value"
                    rules={[
                        { required: true, message: '请输入目录内容名称' },
                        { type: 'string', whitespace: true, message: '请输入有效内容' },
                    ]}
                >
                    <TextArea rows={10} />
                </Form.Item>
                <Form.Item label={null} wrapperCol={{ span: 24 }}>
                    <Space size={[16, 16]} className='w-full flex justify-center'>
                        <Button type="default" onClick={handleReset} icon={<ReloadOutlined />} >
                            重置
                        </Button>
                        <Button type="primary" htmlType="submit" icon={<CheckOutlined />}>
                            确定
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </Drawer>
    );
};
export default DictPlaneBatchAdd;