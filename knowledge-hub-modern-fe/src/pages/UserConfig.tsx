import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Button, Card, Form, Input, Space, Transfer, message } from 'antd';
import type { TransferProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { roleApi, userApi } from '@/services/api';
import { setWorkTabLabel } from '@/utils/data';

export default function UserConfig() {
  const { id = '' } = useParams();
  const location = useLocation();
  const isCreate = location.pathname.includes('/system/users/new/config');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [initialRoleIds, setInitialRoleIds] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);

  const roleItems = useMemo(
    () => roles.map((role) => ({
      key: String(role.roleId),
      title: role.roleName,
      description: role.roleRemark || '',
      disabled: role.isDisabled,
    })),
    [roles],
  );
  const unsavedRoleIds = useMemo(
    () => roleIds.filter((key) => !initialRoleIds.includes(key)),
    [roleIds, initialRoleIds],
  );
  const removedRoleIds = useMemo(
    () => initialRoleIds.filter((key) => !roleIds.includes(key)),
    [roleIds, initialRoleIds],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [roleRes, userRes] = await Promise.all([
        roleApi.list({ pageSize: 100 }),
        isCreate ? Promise.resolve(null) : userApi.detail(id),
      ]);
      setRoles(roleRes?.content || []);
      setUser(userRes);
      if (userRes) {
        form.setFieldsValue({
          userAccount: userRes.userAccount,
          userNickname: userRes.userNickname,
          userEmail: userRes.userEmail,
          userPhoneNum: userRes.userPhoneNum,
          userSex: userRes.userSex,
          userPicture: userRes.userPicture,
        });
        const loadedRoleIds = (userRes.roleIds?.length ? userRes.roleIds : userRes.roleId ? [userRes.roleId] : []).map(String);
        setRoleIds(loadedRoleIds);
        setInitialRoleIds(loadedRoleIds);
        setWorkTabLabel(location.pathname, `${userRes.userAccount}用户编辑`);
      } else {
        form.resetFields();
        setRoleIds([]);
        setInitialRoleIds([]);
        setWorkTabLabel(location.pathname, '新增用户');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const submit = async () => {
    const values = await form.validateFields();
    if (!roleIds.length) {
      message.warning('请至少选择一个角色');
      return;
    }
    const payload = {
      ...values,
      roleIds: roleIds.map(Number),
    };
    if (isCreate) {
      await userApi.add(payload);
      message.success('用户已创建');
    } else {
      await userApi.edit({ ...payload, userId: Number(id) });
      message.success('用户已保存');
    }
    history.push('/system/users');
  };

  return (
    <PageHeader
      title={isCreate ? '新增用户' : '用户编辑'}
      breadcrumb={`系统管理 / 用户管理 / ${isCreate ? '新增用户' : user?.userAccount || '用户编辑'}`}
      description="维护用户基本信息，并通过穿梭框为用户分配一个或多个角色。"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.push('/system/users')}>
          返回
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={loading} onClick={submit}>
          保存
        </Button>,
      ]}
    >
      <div className="user-config-layout">
        <Card title="基础信息" className="user-config-card">
          <Form form={form} layout="vertical">
            <Form.Item name="userAccount" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
              <Input disabled={!isCreate} placeholder="登录账号" />
            </Form.Item>
            {isCreate ? (
              <Form.Item name="userPassword" label="初始密码" rules={[{ required: true, message: '请输入初始密码' }]}>
                <Input.Password placeholder="初始登录密码" />
              </Form.Item>
            ) : null}
            <Form.Item name="userNickname" label="昵称">
              <Input placeholder="用户显示名称" />
            </Form.Item>
            <Space.Compact block>
              <Form.Item name="userEmail" label="邮箱" style={{ width: '50%' }}>
                <Input />
              </Form.Item>
              <Form.Item name="userPhoneNum" label="手机号" style={{ width: '50%' }}>
                <Input />
              </Form.Item>
            </Space.Compact>
          </Form>
        </Card>

        <Card title="角色分配" className="user-config-card">
          <Alert
            type="info"
            showIcon
            className="user-role-change-note"
            message="浅绿色表示本次新增但尚未保存的角色；浅红色表示本次移除但尚未保存的角色。"
          />
          <Transfer
            showSearch
            oneWay={false}
            dataSource={roleItems}
            targetKeys={roleIds}
            titles={['待选角色', '已有角色']}
            listStyle={{ width: '45%', height: 360 }}
            render={(item) => (
              <span className={`user-role-transfer-option ${roleIds.includes(String(item.key)) ? 'is-assigned' : ''} ${unsavedRoleIds.includes(String(item.key)) ? 'is-unsaved' : ''} ${removedRoleIds.includes(String(item.key)) ? 'is-removed' : ''}`}>
                {item.title}
              </span>
            )}
            filterOption={(input, item) =>
              String(item.title).includes(input) || String(item.description || '').includes(input)
            }
            onChange={(nextKeys: TransferProps['targetKeys']) => setRoleIds((nextKeys || []).map(String))}
          />
        </Card>
      </div>
    </PageHeader>
  );
}
