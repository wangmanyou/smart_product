import { ArrowLeftOutlined, SaveOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Button, Card, Checkbox, Form, Input, Space, Switch, Transfer, Tree, message } from 'antd';
import type { TransferProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { permissionApi, roleApi, sceneApi } from '@/services/api';
import { setWorkTabLabel } from '@/utils/data';

const approvalCodes = ['knowledge:create', 'knowledge:update', 'knowledge:delete'];
const systemPageCodes = [
  'page:system:dicts',
  'page:system:scenes',
  'page:system:users',
  'page:system:roles',
  'page:system:approvals',
];
const systemModulePageMap: Record<string, string[]> = {
  'system:dict:manage': ['page:system:dicts'],
  'system:scene:manage': ['page:system:scenes'],
  'system:user:manage': ['page:system:users'],
  'system:role:manage': ['page:system:roles'],
  'system:permission:manage': ['page:system:roles'],
  'system:approval:manage': ['page:system:approvals'],
  'system:manage': systemPageCodes,
};

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
  const [checkedPermissions, setCheckedPermissions] = useState<string[]>([]);
  const [approvalRequired, setApprovalRequired] = useState<string[]>([]);
  const [sceneKeys, setSceneKeys] = useState<string[]>([]);
  const isAdmin = Form.useWatch('admin', form);

  const load = async () => {
    setLoading(true);
    try {
      const [permissionRes, sceneRes, roleRes] = await Promise.all([
        permissionApi.list(),
        sceneApi.list({ pageSize: 500 }),
        roleId ? roleApi.detail(roleId) : Promise.resolve(null),
      ]);
      setPermissions(permissionRes?.content || []);
      setScenes(sceneRes?.content || []);
      setRole(roleRes);

      const setting = roleRes?.setting || {};
      const pagePermissions = setting.pagePermissions || [];
      const operationPermissions = setting.operationPermissions || [];
      form.setFieldsValue({
        roleName: roleRes?.roleName || '',
        roleRemark: roleRes?.roleRemark || '',
        admin: Boolean(setting.admin),
      });
      setCheckedPermissions([...pagePermissions, ...operationPermissions]);
      setApprovalRequired(
        Object.entries(setting.approvalRequired || {})
          .filter(([, required]) => required)
          .map(([code]) => code),
      );
      setSceneKeys((setting.sceneTemplateIds || []).map(String));
      setWorkTabLabel(location.pathname, roleRes?.roleName ? `${roleRes.roleName}角色配置` : '新增角色');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [roleId]);

  useEffect(() => {
    setApprovalRequired((prev) => prev.filter((code) => checkedPermissions.includes(code)));
  }, [checkedPermissions.join('|')]);

  const permissionMap = useMemo(
    () => new Map(permissions.map((item) => [item.code, item])),
    [permissions],
  );

  const treeData = useMemo(() => {
    const pageNodes = permissions
      .filter((item) => item.type === 'PAGE' && !systemPageCodes.includes(item.code))
      .map((item) => node(item));
    const knowledgeNodes = permissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('knowledge:') && !item.code.includes('change-request'))
      .map((item) => node(item));
    const approvalNodes = permissions
      .filter((item) => item.type === 'ACTION' && item.code.includes('change-request'))
      .map((item) => node(item));
    const systemNodes = permissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('system:'))
      .map((item) => node(item));
    return [
      { title: '页面权限', key: 'group:pages', selectable: false, children: pageNodes },
      { title: '知识操作', key: 'group:knowledge', selectable: false, children: knowledgeNodes },
      { title: '审批操作', key: 'group:approval', selectable: false, children: approvalNodes },
      { title: '系统管理', key: 'group:system', selectable: false, children: systemNodes },
    ];
  }, [permissions, checkedPermissions, approvalRequired]);

  const expandedKeys = ['group:pages', 'group:knowledge', 'group:approval', 'group:system'];

  const permissionGroups = useMemo(() => {
    const buildGroup = (key: string, title: string, items: any[]) => ({
      key,
      title,
      codes: items.map((item) => item.code),
      treeData: items.map((item) => node(item)),
    });

    const pageItems = permissions
      .filter((item) => item.type === 'PAGE' && !systemPageCodes.includes(item.code));
    const knowledgeItems = permissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('knowledge:') && !item.code.includes('change-request'));
    const approvalItems = permissions
      .filter((item) => item.type === 'ACTION' && item.code.includes('change-request'));
    const systemItems = permissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('system:'));

    return [
      buildGroup('pages', '页面权限', pageItems),
      buildGroup('knowledge', '知识操作', knowledgeItems),
      buildGroup('approval', '审批操作', approvalItems),
      buildGroup('system', '系统管理', systemItems),
    ];
  }, [permissions, checkedPermissions, approvalRequired]);

  const sceneItems = useMemo(
    () => scenes.map((scene) => ({
      key: String(scene.sceneTemplateId),
      title: scene.sceneName,
      description: `场景ID：${scene.sceneTemplateId}`,
      disabled: scene.sceneIsDisabled,
    })),
    [scenes],
  );

  function node(item: any) {
    return {
      key: item.code,
      title: (
        <span className="role-tree-node">
          <span>
            <strong>{item.name}</strong>
            {item.description ? <em>{item.description}</em> : null}
          </span>
          {approvalCodes.includes(item.code) && checkedPermissions.includes(item.code) ? (
            <Checkbox
              className="role-approval-checkbox"
              checked={approvalRequired.includes(item.code)}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                setApprovalRequired((prev) =>
                  event.target.checked
                    ? Array.from(new Set([...prev, item.code]))
                    : prev.filter((code) => code !== item.code),
                );
              }}
            >
              需要审批
            </Checkbox>
          ) : null}
        </span>
      ),
    };
  }

  const submit = async () => {
    const values = await form.validateFields();
    const selected = new Set(checkedPermissions);
    Object.entries(systemModulePageMap).forEach(([permissionCode, pageCodes]) => {
      if (selected.has(permissionCode)) {
        pageCodes.forEach((code) => selected.add(code));
      }
    });
    const pagePermissions = permissions
      .filter((item) => item.type === 'PAGE' && selected.has(item.code))
      .map((item) => item.code);
    const operationPermissions = permissions
      .filter((item) => item.type === 'ACTION' && selected.has(item.code))
      .map((item) => item.code);
    const approvalRequiredMap = Object.fromEntries(
      approvalCodes.map((code) => [code, approvalRequired.includes(code)]),
    );
    const setting = {
      admin: Boolean(values.admin),
      pagePermissions: values.admin ? [] : pagePermissions,
      operationPermissions: values.admin ? [] : operationPermissions,
      sceneTemplateIds: values.admin ? [] : sceneKeys.map(Number),
      approvalRequired: values.admin ? {} : approvalRequiredMap,
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

  return (
    <PageHeader
      title={isCreate ? '新增角色' : '角色配置'}
      breadcrumb={`系统管理 / 角色管理 / ${isCreate ? '新增角色' : role?.roleName || '角色配置'}`}
      description="用树状结构配置页面和操作权限；新增、编辑、删除知识被选中后，可直接在权限项后设置是否需要审批。"
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
          <Card title={<Space><SafetyCertificateOutlined />基础信息</Space>} className="role-config-section">
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
              <Transfer
                showSearch
                dataSource={sceneItems}
                targetKeys={sceneKeys}
                titles={['待选场景', '已授权场景']}
                listStyle={{ width: '45%', height: 300 }}
                render={(item) => item.title}
                filterOption={(input, item) =>
                  String(item.title).includes(input) || String(item.description || '').includes(input)
                }
                onChange={(nextKeys: TransferProps['targetKeys']) => setSceneKeys((nextKeys || []).map(String))}
              />
            )}
          </Card>
        </div>

        {!isAdmin ? (
          <Card title="权限配置" className="role-config-section">
            {Object.keys(systemModulePageMap).some((code) => checkedPermissions.includes(code)) ? (
              <Alert
                type="info"
                showIcon
                className="role-config-note"
                message="已拥有系统管理模块权限，对应的系统页面会自动开放。"
              />
            ) : null}
            <div className="role-permission-grid">
              {permissionGroups.map((group) => (
                <div
                  key={group.key}
                  className="role-permission-panel"
                >
                  <div className="role-permission-panel-title">{group.title}</div>
                  <Tree
                    checkable
                    selectable={false}
                    treeData={group.treeData}
                    checkedKeys={checkedPermissions.filter((code) => group.codes.includes(code))}
                    onCheck={(keys) => {
                      const next = Array.isArray(keys) ? keys : keys.checked;
                      const nextGroupKeys = next.map(String);
                      setCheckedPermissions((prev) => [
                        ...prev.filter((code) => !group.codes.includes(code)),
                        ...nextGroupKeys,
                      ]);
                    }}
                  />
                </div>
              ))}
            </div>
          </Card>
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
