import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Card, Checkbox, Form, Input, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { authApi } from '@/services/api';

export default function Login() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const account = localStorage.getItem('account');
    if (account) form.setFieldValue('userAccount', account);
  }, [form]);

  const submit = async (values: any) => {
    setLoading(true);
    try {
      if (values.autoLogin) {
        localStorage.setItem('account', values.userAccount);
      } else {
        localStorage.removeItem('account');
      }
      const result = await authApi.login({
        userAccount: values.userAccount,
        userPassword: values.userPassword,
      });
      authApi.setToken(result.token);
      const user = await authApi.current();
      authApi.setCurrentUser(user);
      message.success('登录成功');
      history.push('/knowledge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-bar">
        <span>知识管理系统</span>
        <em>常州 · 智能制造知识平台</em>
      </div>
      <Card className="login-panel">
        <div className="login-panel-head">
          <Typography.Title level={2}>欢迎登录</Typography.Title>
          <Typography.Paragraph type="secondary">进入企业知识管理与智能制造协同平台</Typography.Paragraph>
        </div>
        <Form form={form} layout="vertical" onFinish={submit} autoComplete="off">
          <Form.Item name="userAccount" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input size="large" prefix={<UserOutlined />} placeholder="请输入用户名" autoComplete="off" />
          </Form.Item>
          <Form.Item name="userPassword" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password
              size="large"
              prefix={<LockOutlined />}
              placeholder="请输入密码"
              autoComplete="new-password"
            />
          </Form.Item>
          <Form.Item name="autoLogin" valuePropName="checked">
            <Checkbox>记住账号</Checkbox>
          </Form.Item>
          <Button block size="large" type="primary" htmlType="submit" loading={loading}>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
