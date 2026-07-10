import React, { useEffect } from 'react';
import {
    ProForm, ModalForm, ProFormDateTimePicker, ProFormDigit, ProFormRadio,
    ProFormText,
} from '@ant-design/pro-components';
import { Form } from 'antd';
import { setKnowledgeSettingApi } from '@/services/business';

interface Props {
    open: boolean;
    info: any;
    setOpen: (value: boolean) => void;
    handleRefresh: () => void;
    [x: string]: any
}
const BusinessSetting: React.FC<Props> = ({
    open,
    info,
    setOpen,
    handleRefresh,
}) => {

    const [form] = Form.useForm<{ name: string; company: string }>();

    const handleFinish = async (values) => {
        try {
            const { type, viewTime, createTime, creatorName, viewAt } = values;

            let nowViewTime = 0;
            if (type === 1) {
                nowViewTime = viewTime;
            } else {
                nowViewTime = -viewTime;
            }
            setKnowledgeSettingApi({
                knowledgeId: info.knowledgeId,
                createTime: Math.round(createTime / 1000),
                creatorName,
                viewTime: nowViewTime,
                viewAt: Math.round(viewAt / 1000),
            }).then(rst => {

                setOpen(false);
                handleRefresh();
            })
                .catch(err => {
                    console.log(err?.msg || '设置失败');
                })

        } catch (error) {

        }
    };

    useEffect(() => {
        if (open && form) {
            form?.setFieldsValue({
                createTime: Number(info.createTime) * 1000,
                creatorName: info.creatorName,
                currViewTime: info.viewTime,
                type: 1,
                viewAt: Date.now(),
            });
        }
    }, [open, form]);

    return (
        <ModalForm
            width={1000}
            title="维护"
            form={form}
            open={open}
            modalProps={{
                destroyOnClose: true,
                onCancel: () => setOpen(false),
            }}
            onOpenChange={setOpen}
            submitTimeout={2000}
            onFinish={handleFinish}>
            <ProForm.Group>
                <ProFormDateTimePicker
                    width='lg'
                    label="创建时间"
                    name="createTime"
                    required={true}
                    rules={[{
                        required: true,
                        message: '请选择创建时间',
                    }]}
                />
                <ProFormText
                    width='lg'
                    label="创建人"
                    name="creatorName"
                    rules={[{
                        required: true,
                        message: '请填写创建人',
                    }]} />
            </ProForm.Group>

            <ProForm.Group>
                <ProFormDigit
                    width={'lg'}
                    name="currViewTime"
                    label="当前点击次数"
                    disabled={true} />
                <ProFormRadio.Group
                    width={'lg'}
                    label="点击次数类型"
                    name='type'
                    radioType="button"
                    options={[{ value: 1, label: '增加' }, { value: 2, label: '减少' }]}
                />
            </ProForm.Group>

            <ProForm.Group>

                <ProFormDateTimePicker
                    width={'lg'}
                    label="调整次数记录时间"
                    name="viewAt"
                    required={true}
                    rules={[{
                        required: true,
                        message: '请选择时间',
                    }]}
                />
                <ProFormDigit
                    width={'lg'}
                    name="viewTime"
                    label="调整点击次数"
                    rules={[{
                        required: true,
                        message: '请输入要调整的点击次数',
                    }]} />
            </ProForm.Group>

        </ModalForm>
    );
};
export default BusinessSetting;