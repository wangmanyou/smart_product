import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  LockOutlined,
  SaveOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { permissionApi, roleApi, sceneApi } from '@/services/api';
import { setWorkTabLabel } from '@/utils/data';

const approvalCandidateCodes = ['knowledge:create', 'knowledge:update', 'knowledge:delete'];
const systemPageCodes = [
  'page:system:dicts',
  'page:system:scenes',
  'page:system:users',
  'page:system:roles',
  'page:system:approvals',
];

export default function RoleConfig() {
  const { id = '' } = useParams();
  const location = useLocation();
  const isCreate = location.pathname.includes('/system/roles/new/config');
  const roleId = isCreate ? undefined : id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [scenes, setScenes] = useState<any[]>([]);
  const [role, setRole] = useState<any>(null);
  const selectedActions: string[] = Form.useWatch('operationPermissions', form) || [];
  const isAdmin = Form.useWatch('admin', form);

  const load = async () => {
    setLoading(true);
    try {
      const [permissionRes, sceneRes, roleRes] = await Promise.all([
        permissionApi.list(),
        sceneApi.list({ pageSize: 200 }),
        roleId ? roleApi.detail(roleId) : Promise.resolve(null),
      ]);
      setPermissions(permissionRes?.content || []);
      setScenes(sceneRes?.content || []);
      setRole(roleRes);

      const setting = roleRes?.setting || {};
      form.setFieldsValue({
        roleName: roleRes?.roleName || '',
        roleRemark: roleRes?.roleRemark || '',
        admin: Boolean(setting.admin),
        pagePermissions: setting.pagePermissions || [],
        operationPermissions: setting.operationPermissions || [],
        sceneTemplateIds: setting.sceneTemplateIds || [],
        approvalRequiredCodes: Object.entries(setting.approvalRequired || {})
          .filter(([, required]) => required)
          .map(([code]) => code),
      });

      setWorkTabLabel(location.pathname, roleRes?.roleName ? `${roleRes.roleName}角色配置` : '新增角色');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleId]);

  const pagePermissions = useMemo(
    () => permissions.filter((item) => item.type === 'PAGE' && !systemPageCodes.includes(item.code)),
    [permissions],
  );

  const operationPermissions = useMemo(
    () => permissions.filter((item) => item.type === 'ACTION'),
    [permissions],
  );

  const availableApprovalCodes = approvalCandidateCodes.filter((code) => selectedActions.includes(code));

  useEffect(() => {
    const current = form.getFieldValue('approvalRequiredCodes') || [];
    const next = current.filter((code: string) => availableApprovalCodes.includes(code));
    if (next.length !== current.length) {
      form.setFieldValue('approvalRequiredCodes', next);
    }
  }, [selectedActions.join('|')]);

  const submit = async () => {
    const values = await form.validateFields();
    const approvalRequired = Object.fromEntries(
      approvalCandidateCodes.map((code) => [code, (values.approvalRequiredCodes || []).includes(code)]),
    );
    const setting = {
      admin: Boolean(values.admin),
      pagePermissions: values.admin
        ? []
        : Array.from(new Set([
            ...(values.pagePermissions || []),
            ...((values.operationPermissions || []).includes('system:manage') ? systemPageCodes : []),
          ])),
      operationPermissions: values.admin ? [] : values.operationPermissions || [],
      sceneTemplateIds: values.admin ? [] : values.sceneTemplateIds || [],
      approvalRequired: values.admin ? {} : approvalRequired,
    };
    const payload = {
      roleName: values.roleName,
      roleRemark: values.roleRemark,
      setting,
    };

    if (isCreate) {
      await roleApi.add(payload);
      message.success('角色已创建');
    } else {
      await roleApi.edit({ ...payload, roleId: Number(roleId) });
      message.success('角色配置已保存');
    }
    history.push('/system/roles');
  };

  const optionCard = (item: any) => ({
    value: item.code,
    label: (
      <span className="role-permission-option">
        <span className="role-permission-name">{item.name}</span>
        {item.description ? <Typography.Text type="secondary">{item.description}</Typography.Text> : null}
      </span>
    ),
  });

  return (
    <PageHeader
      title={isCreate ? '新增角色' : '角色配置'}
      breadcrumb={`系统管理 / 角色管理 / ${isCreate ? '新增角色' : role?.roleName || '角色配置'}`}
      description="配置角色可访问的页面、可执行的操作、可访问的场景，以及知识变更是否需要审批。"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => history.push('/system/roles')}>
          返回
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={loading} onClick={submit}>
          保存配置
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="role-config-page">
        <div className="role-config-top">
          <Card
            title={<Space><SafetyCertificateOutlined />基础信息</Space>}
            className="role-config-section"
          >
            <Form.Item name="roleName" label="角色名称" rules={[{ required: true, message: '请输入角色名称' }]}>
              <Input placeholder="例如：知识编辑员" />
            </Form.Item>
            <Form.Item name="roleRemark" label="说明">
              <Input.TextArea rows={4} placeholder="描述这个角色的职责和适用范围" />
            </Form.Item>
            <Form.Item name="admin" label="管理员角色" valuePropName="checked">
              <Switch checkedChildren="全部权限" unCheckedChildren="自定义权限" disabled={role?.isBuiltin} />
            </Form.Item>
          </Card>

          <Card title="授权场景" className="role-config-section">
            {isAdmin ? (
              <Alert type="info" showIcon message="管理员角色默认可访问全部场景。" />
            ) : (
              <Form.Item name="sceneTemplateIds">
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="选择普通用户可以访问的场景"
                  options={scenes.map((scene) => ({ value: scene.sceneTemplateId, label: scene.sceneName }))}
                />
              </Form.Item>
            )}
          </Card>
        </div>

        {!isAdmin ? (
          <>
            <Card
              title={<Space><LockOutlined />页面权限</Space>}
              className="role-config-section"
              extra={<Tag>{(form.getFieldValue('pagePermissions') || []).length} 项</Tag>}
            >
              {selectedActions.includes('system:manage') ? (
                <Alert
                  type="info"
                  showIcon
                  className="role-config-note"
                  message="已拥有系统管理权限，系统管理相关页面会自动开放。"
                />
              ) : null}
              <Form.Item name="pagePermissions">
                <Checkbox.Group className="role-permission-grid" options={pagePermissions.map(optionCard)} />
              </Form.Item>
            </Card>

            <Card
              title={<Space><CheckCircleOutlined />操作权限</Space>}
              className="role-config-section"
              extra={<Tag>{selectedActions.length} 项</Tag>}
            >
              <Form.Item name="operationPermissions">
                <Checkbox.Group className="role-permission-grid" options={operationPermissions.map(optionCard)} />
              </Form.Item>
            </Card>

            <Card title="审批规则" className="role-config-section">
              {availableApprovalCodes.length ? (
                <Form.Item name="approvalRequiredCodes">
                  <Checkbox.Group
                    className="approval-rule-list"
                    options={availableApprovalCodes.map((code) => {
                      const permission = permissions.find((item) => item.code === code);
                      return { value: code, label: `${permission?.name || code} 需要管理员审批` };
                    })}
                  />
                </Form.Item>
              ) : (
                <Alert
                  type="warning"
                  showIcon
                  message="先在“操作权限”里勾选新增、编辑或删除知识后，这里才会出现对应审批规则。"
                />
              )}
            </Card>
          </>
        ) : (
          <Card className="role-config-section">
            <Alert
              type="info"
              showIcon
              message="管理员角色默认拥有全部页面、全部操作和全部场景，不需要继续配置细项。"
            />
          </Card>
        )}
      </Form>
    </PageHeader>
  );
}
