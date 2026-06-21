import {
  CameraOutlined,
  MailOutlined,
  PhoneOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Form, Input, Modal, Select, Space, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { useEffect, useState } from 'react';
import { authApi, fileApi } from '@/services/api';
import { avatarUrl, isImageFile } from '@/utils/avatar';

export default function ProfileEditorModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (user: any) => void;
}) {
  const [form] = Form.useForm();
  const [avatarPath, setAvatarPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const accountValue = Form.useWatch('userAccount', form);
  const nicknameValue = Form.useWatch('userNickname', form);

  useEffect(() => {
    if (!open) return;
    const current = authApi.getCurrentUser();
    setAvatarPath(current?.userPicture || '');
    form.setFieldsValue({
      userAccount: current?.userAccount,
      userNickname: current?.userNickname,
      userEmail: current?.userEmail,
      userPhoneNum: current?.userPhoneNum,
      userSex: current?.userSex,
      userPicture: current?.userPicture,
    });
    setLoading(true);
    authApi
      .current()
      .then((latest) => {
        authApi.setCurrentUser(latest);
        onSaved(latest);
        setAvatarPath(latest?.userPicture || '');
        form.setFieldsValue({
          userAccount: latest?.userAccount,
          userNickname: latest?.userNickname,
          userEmail: latest?.userEmail,
          userPhoneNum: latest?.userPhoneNum,
          userSex: latest?.userSex,
          userPicture: latest?.userPicture,
        });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [open]);

  const uploadProps: UploadProps = {
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
      setUploading(true);
      try {
        const uploaded = await fileApi.upload(file as File);
        const nextPath = uploaded?.filePath || uploaded?.file_path || '';
        setAvatarPath(nextPath);
        form.setFieldsValue({ userPicture: nextPath });
        message.success('头像已上传');
        onSuccess?.(uploaded);
      } catch (error: any) {
        onError?.(error);
      } finally {
        setUploading(false);
      }
    },
  };

  const resetAvatar = () => {
    setAvatarPath('');
    form.setFieldsValue({ userPicture: '' });
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        userNickname: values.userNickname || '',
        userEmail: values.userEmail || '',
        userPhoneNum: values.userPhoneNum || '',
        userSex: values.userSex || '',
        userPicture: avatarPath || '',
      });
      authApi.setCurrentUser(updated);
      onSaved(updated);
      window.dispatchEvent(new Event('current-user-updated'));
      message.success('个人资料已保存');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="个人资料"
      open={open}
      width={720}
      centered
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={submit}>
          保存
        </Button>,
      ]}
      onCancel={onClose}
      destroyOnClose
      className="profile-editor-modal"
    >
      <div className="profile-editor-shell">
        <aside className="profile-editor-aside">
          <Avatar src={avatarUrl(avatarPath)} icon={<UserOutlined />} className="profile-modal-avatar" />
          <div className="profile-editor-identity">
            <strong>{nicknameValue || '未设置昵称'}</strong>
            <span>{accountValue || '--'}</span>
          </div>
          <Space className="profile-avatar-actions" direction="vertical">
            <Upload {...uploadProps} disabled={loading}>
              <Button block icon={<CameraOutlined />} loading={uploading} disabled={loading}>
                上传头像
              </Button>
            </Upload>
            <Button block icon={<ReloadOutlined />} disabled={loading || !avatarPath} onClick={resetAvatar}>
              重置默认
            </Button>
          </Space>
        </aside>

        <Form form={form} layout="vertical" disabled={loading} className="profile-editor-form">
          <Form.Item name="userPicture" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="userAccount" hidden>
            <Input />
          </Form.Item>
          <Form.Item name="userNickname" label="昵称" rules={[{ max: 50, message: '昵称不能超过 50 个字符' }]}>
            <Input prefix={<UserOutlined />} placeholder="未设置昵称" />
          </Form.Item>
          <div className="profile-field-grid">
            <Form.Item name="userEmail" label="邮箱" rules={[{ type: 'email', message: '请输入有效邮箱' }]}>
              <Input prefix={<MailOutlined />} placeholder="未填写" />
            </Form.Item>
            <Form.Item name="userPhoneNum" label="手机号">
              <Input prefix={<PhoneOutlined />} placeholder="未填写" />
            </Form.Item>
          </div>
          <Form.Item name="userSex" label="性别">
            <Select
              allowClear
              placeholder="请选择"
              options={[
                { value: '男', label: '男' },
                { value: '女', label: '女' },
                { value: '保密', label: '保密' },
              ]}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
