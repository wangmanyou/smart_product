import { ArrowLeftOutlined, CameraOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Avatar, Button, Card, Form, Input, Space, Transfer, Upload, message } from 'antd';
import type { TransferProps } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { fileApi, roleApi, userApi } from '@/services/api';
import { DEFAULT_AVATAR, avatarUrl, isImageFile } from '@/utils/avatar';
import { closeWorkTab, setWorkTabLabel } from '@/utils/data';
import { runAfterUnsavedConfirm, useUnsavedChanges } from '@/utils/unsavedChanges';

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
  const [dirty, setDirty] = useState(false);
  const [avatarPath, setAvatarPath] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const clearUnsaved = useUnsavedChanges(location.pathname, dirty);

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
        roleApi.options(),
        isCreate ? Promise.resolve(null) : userApi.detail(id),
      ]);
      setRoles(roleRes?.content || []);
      setUser(userRes);
      if (userRes) {
        const loadedAvatar = userRes.userPicture || '';
        setAvatarPath(loadedAvatar);
        form.setFieldsValue({
          userAccount: userRes.userAccount,
          userNickname: userRes.userNickname,
          userEmail: userRes.userEmail,
          userPhoneNum: userRes.userPhoneNum,
          userSex: userRes.userSex,
          userPicture: loadedAvatar,
        });
        const loadedRoleIds = (userRes.roleIds?.length ? userRes.roleIds : userRes.roleId ? [userRes.roleId] : []).map(String);
        setRoleIds(loadedRoleIds);
        setInitialRoleIds(loadedRoleIds);
        setWorkTabLabel(location.pathname, `${userRes.userAccount}用户编辑`);
      } else {
        setAvatarPath('');
        form.resetFields();
        setRoleIds([]);
        setInitialRoleIds([]);
        setWorkTabLabel(location.pathname, '新增用户');
      }
      setDirty(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const avatarUploadProps: UploadProps = {
    accept: '.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg',
    showUploadList: false,
    beforeUpload: (file) => {
      if (!isImageFile(file as File)) {
        message.error('头像只能上传图片文件');
        return Upload.LIST_IGNORE;
      }
      if ((file as File).size / 1024 / 1024 > 5) {
        message.error('头像不能超过 5MB');
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: async ({ file, onError, onSuccess }) => {
      setUploadingAvatar(true);
      try {
        const uploaded = await fileApi.upload(file as File);
        const nextPath = uploaded?.filePath || uploaded?.file_path || '';
        setAvatarPath(nextPath);
        form.setFieldsValue({ userPicture: nextPath });
        setDirty(true);
        message.success('头像已上传');
        onSuccess?.(uploaded);
      } catch (error: any) {
        onError?.(error);
      } finally {
        setUploadingAvatar(false);
      }
    },
  };

  const resetAvatar = () => {
    setAvatarPath('');
    form.setFieldsValue({ userPicture: '' });
    setDirty(true);
  };

  const goBackToList = () => {
    closeWorkTab(location.pathname);
    history.push('/system/users');
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (!roleIds.length) {
      message.warning('请至少选择一个角色');
      return;
    }
    const payload = {
      ...values,
      userPicture: avatarPath || '',
      roleIds: roleIds.map(Number),
    };
    if (isCreate) {
      await userApi.add(payload);
      message.success('用户已创建');
    } else {
      await userApi.edit({ ...payload, userId: Number(id) });
      message.success('用户已保存');
    }
    clearUnsaved();
    goBackToList();
  };

  return (
    <PageHeader
      title={isCreate ? '新增用户' : '用户编辑'}
      hideTitle
      breadcrumb={`系统管理 / 用户管理 / ${isCreate ? '新增用户' : user?.userAccount || '用户编辑'}`}
      description="维护用户基本信息，并通过穿梭框为用户分配一个或多个角色。"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => runAfterUnsavedConfirm(location.pathname, goBackToList)}>
          返回
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={loading} onClick={submit}>
          保存
        </Button>,
      ]}
    >
      <div className="user-config-layout">
        <Card title="基础信息" className="user-config-card">
          <div className="user-avatar-editor">
            <Avatar
              src={
                <img
                  src={avatarUrl(avatarPath)}
                  alt={form.getFieldValue('userAccount') || 'avatar'}
                  onError={(event) => {
                    if (event.currentTarget.src.endsWith(DEFAULT_AVATAR)) return;
                    event.currentTarget.src = DEFAULT_AVATAR;
                  }}
                />
              }
              className="user-config-avatar"
            />
            <Space wrap>
              <Upload {...avatarUploadProps}>
                <Button icon={<CameraOutlined />} loading={uploadingAvatar}>
                  上传头像
                </Button>
              </Upload>
              <Button icon={<ReloadOutlined />} disabled={!avatarPath} onClick={resetAvatar}>
                重置默认
              </Button>
            </Space>
          </div>
          <Form form={form} layout="vertical" onValuesChange={() => setDirty(true)}>
            <Form.Item name="userPicture" hidden>
              <Input />
            </Form.Item>
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
            onChange={(nextKeys: TransferProps['targetKeys']) => {
              setDirty(true);
              setRoleIds((nextKeys || []).map(String));
            }}
          />
        </Card>
      </div>
    </PageHeader>
  );
}
