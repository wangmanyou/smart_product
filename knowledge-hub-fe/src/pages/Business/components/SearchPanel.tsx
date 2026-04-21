import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Space } from 'antd';
import React, { useCallback, useEffect } from 'react';

import { formatFilterEmpty } from '@/utils/format';
import { BusinessListParams } from '../types';

type Props = {
  getList: (data: any) => void;
  searchParams: BusinessListParams;
  saveSearchParams: (data: BusinessListParams) => void;
};

const SearchPanel: React.FC<Props> = ({ getList, searchParams, saveSearchParams }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    const { pageSize, pageNumber, ...values } = searchParams;
    if(values) {
      form.setFieldsValue(values);
    }
  }, []);

  const handleFinish = useCallback((values: BusinessListParams) => {
    getList({
      ...values,
      pageNumber: 1,
      pageSize: searchParams.pageSize,
    });
  }, [searchParams]);

  // 重置
  const handleReset = useCallback(async () => {
    await form.resetFields();
    const values = form.getFieldsValue();
    getList({
      ...values,
      pageNumber: 1,
      pageSize: searchParams.pageSize,
    });
  }, [form]);

  return (
    <Form layout={'inline'} 
      form={form} 
      onFinish={handleFinish}>
      <Row gutter={[16, 16]} className='w-full'>
        <Col className="gutter-row" xl={6} md={12} xs={24}>
          <Form.Item label="业务名称" name="searchSceneName">
            <Input placeholder="请输入业务名称" allowClear={true}/>
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
