import { CheckOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Radio, Space, message } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';

import { DictTypeConfig } from '../constants';
import { ActionType, DictType, DictListResult } from '../types';

import DictPlane from './DictPlane';
import DictPlaneEdit from './DictPlaneEdit';
import DictTree from './DictTree';
import DictTreeEdit from './DictTreeEdit';

import { hasUnsavedData } from '../dict';

import '../index.less';

type FieldType = {
  dictName?: string;
  dictType?: DictType;
  plane?: DictListResult[];
  tree?: DictListResult[];
};

type Props = {
  sourceType: ActionType;
  dictTemplateId?: number;
  initialValues?: FieldType;
  handleSubmit: (values: any) => void;
};

const DictForm: React.FC<Props> = ({
  dictTemplateId,
  handleSubmit,
  initialValues,
  sourceType,
}) => {
  const [form] = Form.useForm();
  const [currentType, setCurrentType] = useState(
    initialValues?.dictType || DictType.plane,
  );
  const isEdit = sourceType === ActionType.edit;
  const handleDictType = useCallback((e: any) => {
    setCurrentType(e.target.value);
  }, []);

  // 提交
  const handleFinish = useCallback(async (values: FieldType) => {
    const { dictType, plane, tree } = values;
    if (dictType === DictType.plane) {
      if (!plane || !plane.length) {
        message.error('请填写目录内容');
        return;
      }
      if (plane.some((item) => !item.hasSaved)) {
        message.error('请保存目录内容');
        return;
      }
    } else if (dictType === DictType.tree) {
      if (!tree || !tree.length) {
        message.error('请填写目录内容');
        return;
      }
      if (hasUnsavedData(tree)) {
        message.error('请保存目录内容');
        return;
      }
    }
    handleSubmit(values);
  }, []);

  // 重置
  const handleReset = useCallback(() => {
    form.resetFields();
    setCurrentType(initialValues?.dictType || DictType.plane);
  }, [form]);

  useEffect(() => {
    form.setFieldsValue(initialValues);
    setCurrentType(initialValues?.dictType || DictType.plane);
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
        label="目录名称"
        name="dictName"
        rules={[
          { required: true, message: '请输入目录名称' },
          { type: 'string', whitespace: true, message: '请输入有效内容' },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item<FieldType>
        label="目录类型"
        name="dictType"
        rules={[{ required: true, message: '选择目录类型' }]}
      >
        <Radio.Group
          onChange={handleDictType}
          disabled={sourceType === ActionType.edit}>
          {
            DictTypeConfig.map(item => <Radio.Button key={item.value} value={item.value}>{item.label}</Radio.Button>)
          }
        </Radio.Group>
      </Form.Item>
      <Form.Item<FieldType> label="目录内容" required={true}></Form.Item>
      {currentType === DictType.plane && (
        <Form.Item<FieldType>
          label=""
          className="w-full dict-content"
          wrapperCol={{ span: 24 }}
          preserve={true}
        >
          {isEdit ? (
            <DictPlaneEdit
              sourceType={sourceType}
              dictTemplateId={dictTemplateId}
              formRef={form}
            />
          ) : (
            <DictPlane sourceType={sourceType} formRef={form} />
          )}
        </Form.Item>
      )}
      {currentType === DictType.tree && (
        <Form.Item<FieldType>
          label=""
          className="w-full dict-content"
          wrapperCol={{ span: 24 }}
          preserve={true}
        >
          {isEdit ? (
            <DictTreeEdit
              sourceType={sourceType}
              dictTemplateId={dictTemplateId}
              formRef={form}
            />
          ) : (
            <DictTree sourceType={sourceType} formRef={form} />
          )}
        </Form.Item>
      )}
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

export default DictForm;
