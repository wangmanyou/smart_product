import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Col, Form, Input, Row, Select, Space } from 'antd';
import React, { useCallback } from 'react';

import { SceneStatusConfig } from '../constants';
import { SceneListParams } from '../types';

import { formatFilterEmpty } from '@/utils/format';

type Props = {
  getSceneList: (data: any) => void;
};
const SearchPanel: React.FC<Props> = ({ getSceneList }) => {
  const [form] = Form.useForm();

  const handleFinish = useCallback((values: SceneListParams) => {
    getSceneList(formatFilterEmpty(values));
  }, []);

  // 重置
  const handleReset = useCallback(async () => {
    await form.resetFields();
    getSceneList({});
  }, [form]);

  return (
    <Form layout={'inline'} form={form} onFinish={handleFinish} initialValues={{searchSceneDisabled: 'all'}}>
      <Row gutter={[0, 16]} className='w-full'>
        <Col className="gutter-row" xl={8} md={8} xs={24}>
          <Form.Item label="场景名称" name="searchSceneName">
            <Input placeholder="请输入场景名称" allowClear={true}/>
          </Form.Item>
        </Col>

        <Col className="gutter-row" xl={8} md={8} xs={24}>
          <Form.Item label="场景状态" name="searchSceneDisabled">
            <Select
              style={{ width: '100%' }}
              options={SceneStatusConfig}
              placeholder="请选择场景状态"
              allowClear={true}
            />
          </Form.Item>
        </Col>

        <Col className="gutter-row" xl={6} md={6} xs={24}>
          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SearchOutlined />}
              >
                查询
              </Button>
              <Button htmlType="reset" 
                icon={<ReloadOutlined />}
                onClick={handleReset}>
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
