import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Select, Space } from 'antd';
import React, { useCallback } from 'react';

import { DictStatusConfig, DictTypeConfig } from '../constants';
import { DictListParams } from '../types';

import { formatFilterEmpty } from '@/utils/format';

type Props = {
  getDictList: (data: any) => void;
};
const SearchPanel: React.FC<Props> = ({ getDictList }) => {
  const [form] = Form.useForm();
  const handleFinish = useCallback((values: DictListParams) => {
    getDictList(formatFilterEmpty(values));
  }, []);

  // 重置
  const handleReset = useCallback(async () => {
    await form.resetFields();
    getDictList({});
  }, [form]);
  return (
    <Form layout={'inline'}
      form={form}
      onFinish={handleFinish}
      initialValues={{ searchDictDisabled: 'all' }}>
      <Row gutter={[16, 16]} className='w-full'>
        <Col className="gutter-row" xl={6} md={12} xs={24}>
          <Form.Item label="目录名称" name="searchDictName">
            <Input placeholder="请输入目录名称" allowClear={true} />
          </Form.Item>
        </Col>

        <Col className="gutter-row" xl={6} md={12} xs={24}>
          <Form.Item label="目录类型" name="searchDictType">
            <Select
              style={{ width: '100%' }}
              options={DictTypeConfig}
              placeholder="请选择"
              allowClear={true}
            />
          </Form.Item>
        </Col>

        <Col className="gutter-row" xl={6} md={12} xs={24}>
          <Form.Item label="目录状态" name="searchDictDisabled">
            <Select
              style={{ width: '100%' }}
              options={DictStatusConfig}
              placeholder="请选择"
              allowClear={true}
            />
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
