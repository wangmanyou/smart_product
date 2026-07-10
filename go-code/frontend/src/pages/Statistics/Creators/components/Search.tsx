import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Col, Form, Row, DatePicker, Space, Select } from 'antd';
import React, { useCallback } from 'react';
import type { GetProps } from 'antd';
import dayjs from 'dayjs';


const { RangePicker } = DatePicker;
type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

type Props = {
    sceneList: any;
    getList: (data: any) => void;
};
const SearchPanel: React.FC<Props> = ({ sceneList, getList }) => {
    const [form] = Form.useForm();
    const handleFinish = useCallback((values) => {
        const { searchTime, sceneName, ...rest } = values;
        const result = {
            ...rest,
        }
        if (searchTime && searchTime.length) {
            result.searchCreateTime = [dayjs(searchTime[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss'), dayjs(searchTime[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss')]
        }
        if(sceneName && sceneName !== 'all') {
            result.sceneTemplateId = sceneName
        }

        getList(result);
    }, []);

    // 重置
    const handleReset = useCallback(async () => {
        await form.resetFields();
        getList({});
    }, [form]);

    const disabledDate: RangePickerProps['disabledDate'] = (current) => {
        // Can not select days before today and today
        return current && current > dayjs().endOf('day');
    };

    return (
        <Form layout={'inline'}
            form={form}
            onFinish={handleFinish}
            initialValues={{ sceneName: 'all', searchTime: [dayjs(new Date()).startOf('month').startOf('day'), dayjs(new Date()).endOf('day')], }}>
            <Row gutter={[16, 16]} className='w-full'>
                <Col className="gutter-row" xl={6} md={12} xs={24}>
                    <Form.Item label="日期区间" name="searchTime">
                        <RangePicker
                            disabledDate={disabledDate} />
                    </Form.Item>
                </Col>
                <Col className="gutter-row" xl={6} md={12} xs={24}>
                    <Form.Item label="场景名称" name="sceneName">
                        <Select
                            fieldNames={{ label: 'sceneName', value: 'sceneTemplateId' }}
                            options={sceneList} />
                    </Form.Item>
                </Col>

                <Col className="gutter-row" xl={6} md={12} xs={24}>
                    <Form.Item>
                        <Space>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SearchOutlined />}
                            >
                                查询
                            </Button>
                            <Button
                                onClick={handleReset}
                                htmlType="reset"
                                icon={<ReloadOutlined />}>
                                重置
                            </Button>
                        </Space>
                    </Form.Item>
                </Col>
            </Row>
        </Form>
    );
};

export default SearchPanel;
