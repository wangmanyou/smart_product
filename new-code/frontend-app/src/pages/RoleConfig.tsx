import { ArrowLeftOutlined, SaveOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Button, Card, Checkbox, Form, Input, Space, Switch, Transfer, Tree, message } from 'antd';
import type { TransferProps } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import { permissionApi, roleApi, sceneApi } from '@/services/api';
import { buildWorkTabLabel, closeWorkTab, setWorkTabLabel } from '@/utils/data';
import { runAfterUnsavedConfirm, useUnsavedChanges } from '@/utils/unsavedChanges';

const approvalCodes = ['knowledge:create', 'knowledge:update', 'knowledge:delete'];
const approvalViewOwnCode = 'knowledge:change-request:view-own';
const approvalReviewCodes = ['knowledge:change-request:view-all', 'knowledge:change-request:approve', 'knowledge:change-request:reject'];
const approvalManageCode = 'system:approval:manage';
const permissionManageCode = 'system:permission:manage';
const logViewCode = 'system:log:view';
const knowledgeLogViewAllCode = 'knowledge:log:view-all';
const knowledgeViewCode = 'knowledge:view';
const knowledgePageCode = 'page:knowledge';
const statisticsPageCode = 'page:statistics';
const defaultCreatePermissionCodes = [knowledgePageCode, statisticsPageCode];
const approvalPageCode = 'page:system:approvals';
const logPageCode = 'page:system:logs';
const hiddenPermissionCodes = [
  approvalManageCode,
  permissionManageCode,
  approvalViewOwnCode,
  logViewCode,
  logPageCode,
];
const permissionDisplayMap: Record<string, { name: string; description: string }> = {
  [approvalViewOwnCode]: {
    name: '查看我的申请',
    description: '查看自己提交的知识变更申请',
  },
  'knowledge:change-request:view-all': {
    name: '查看全部申请',
    description: '查看授权场景下全部待审和历史审批；未选时审批人仅看待处理及自己处理过的申请',
  },
  'knowledge:change-request:approve': {
    name: '审批通过',
    description: '通过知识变更申请',
  },
  'knowledge:change-request:reject': {
    name: '审批驳回',
    description: '驳回知识变更申请',
  },
  [knowledgeLogViewAllCode]: {
    name: '查看全部操作记录',
    description: '查看授权场景下所有用户的知识操作记录',
  },
};
const systemPageCodes = [
  'page:system:dicts',
  'page:system:scenes',
  'page:system:users',
  'page:system:roles',
  'page:system:approvals',
  logPageCode,
];
const systemModulePageMap: Record<string, string[]> = {
  'system:dict:manage': ['page:system:dicts'],
  'system:scene:manage': ['page:system:scenes'],
  'system:user:manage': ['page:system:users'],
  'system:role:manage': ['page:system:roles'],
  [approvalManageCode]: ['page:system:approvals'],
  [approvalViewOwnCode]: [approvalPageCode],
  [logViewCode]: [logPageCode],
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
  const [selectedSceneKeys, setSelectedSceneKeys] = useState<string[]>([]);
  const [initialSceneKeys, setInitialSceneKeys] = useState<string[]>([]);
  const [initialPermissionKeys, setInitialPermissionKeys] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const isAdmin = Form.useWatch('admin', form);
  const clearUnsaved = useUnsavedChanges(location.pathname, dirty);

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
      const loadedPermissions = roleRes
        ? [...pagePermissions, ...operationPermissions].map(String)
        : defaultCreatePermissionCodes;
      const loadedSceneKeys = (setting.sceneTemplateIds || []).map(String);
      setCheckedPermissions(loadedPermissions);
      setInitialPermissionKeys(loadedPermissions);
      setApprovalRequired(
        Object.entries(setting.approvalRequired || {})
          .filter(([, required]) => required)
          .map(([code]) => code),
      );
      setSceneKeys(loadedSceneKeys);
      setInitialSceneKeys(loadedSceneKeys);
      setWorkTabLabel(
        location.pathname,
        roleRes?.roleName
          ? buildWorkTabLabel('role-config', roleRes.roleName)
          : buildWorkTabLabel('role-create'),
      );
      setDirty(false);
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

  useEffect(() => {
    if (approvalRequired.length && !checkedPermissions.includes(approvalViewOwnCode)) {
      setCheckedPermissions((prev) => Array.from(new Set([...prev, approvalViewOwnCode])));
    }
  }, [approvalRequired.join('|'), checkedPermissions.join('|')]);

  const permissionMap = useMemo(
    () => new Map(permissions.map((item) => [item.code, item])),
    [permissions],
  );
  const unsavedSceneKeys = useMemo(
    () => sceneKeys.filter((key) => !initialSceneKeys.includes(key)),
    [sceneKeys, initialSceneKeys],
  );
  const removedSceneKeys = useMemo(
    () => initialSceneKeys.filter((key) => !sceneKeys.includes(key)),
    [sceneKeys, initialSceneKeys],
  );
  const unsavedPermissionKeys = useMemo(
    () => checkedPermissions.filter((code) => !initialPermissionKeys.includes(code)),
    [checkedPermissions, initialPermissionKeys],
  );
  const removedPermissionKeys = useMemo(
    () => initialPermissionKeys.filter((code) => !checkedPermissions.includes(code)),
    [checkedPermissions, initialPermissionKeys],
  );

  const treeData = useMemo(() => {
    const visiblePermissions = permissions.filter((item) => !hiddenPermissionCodes.includes(item.code));
    const pageNodes = visiblePermissions
      .filter((item) => item.type === 'PAGE' && !systemPageCodes.includes(item.code))
      .map((item) => node(item));
    const knowledgeNodes = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('knowledge:') && !item.code.includes('change-request'))
      .map((item) => node(item));
    const approvalNodes = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.includes('change-request'))
      .map((item) => node(item));
    const aiNodes = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('ai:'))
      .map((item) => node(item));
    const systemNodes = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('system:'))
      .map((item) => node(item));
    return [
      { title: '页面权限', key: 'group:pages', selectable: false, children: pageNodes },
      { title: '知识操作', key: 'group:knowledge', selectable: false, children: knowledgeNodes },
      { title: '智能知识库', key: 'group:ai', selectable: false, children: aiNodes },
      { title: '审批操作', key: 'group:approval', selectable: false, children: approvalNodes },
      { title: '系统管理', key: 'group:system', selectable: false, children: systemNodes },
    ];
  }, [permissions, checkedPermissions, approvalRequired, unsavedPermissionKeys, removedPermissionKeys]);

  const expandedKeys = ['group:pages', 'group:knowledge', 'group:ai', 'group:approval', 'group:system'];

  const permissionGroups = useMemo(() => {
    const buildGroup = (key: string, title: string, items: any[]) => ({
      key,
      title,
      codes: items.map((item) => item.code),
      treeData: items.map((item) => node(item)),
    });

    const visiblePermissions = permissions.filter((item) => !hiddenPermissionCodes.includes(item.code));
    const pageItems = visiblePermissions
      .filter((item) => item.type === 'PAGE' && !systemPageCodes.includes(item.code));
    const knowledgeItems = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('knowledge:') && !item.code.includes('change-request'));
    const approvalItems = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.includes('change-request'));
    const aiItems = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('ai:'));
    const systemItems = visiblePermissions
      .filter((item) => item.type === 'ACTION' && item.code.startsWith('system:'));

    return [
      buildGroup('pages', '页面权限', pageItems),
      buildGroup('knowledge', '知识操作', knowledgeItems),
      buildGroup('ai', '智能知识库', aiItems),
      buildGroup('approval', '审批操作', approvalItems),
      buildGroup('system', '系统管理', systemItems),
    ];
  }, [permissions, checkedPermissions, approvalRequired, unsavedPermissionKeys, removedPermissionKeys]);

  const sceneItems = useMemo(
    () => scenes.map((scene) => ({
      key: String(scene.sceneTemplateId),
      title: scene.sceneName,
      description: `场景ID：${scene.sceneTemplateId}`,
      disabled: scene.sceneIsDisabled,
    })),
    [scenes],
  );
  const handleSceneChange = (nextKeys: TransferProps['targetKeys']) => {
    const next = (nextKeys || []).map(String);
    setDirty(true);
    setSceneKeys(next);
    if (next.length) {
      setCheckedPermissions((prev) => Array.from(new Set([...prev, knowledgePageCode])));
    }
    setSelectedSceneKeys((prev) => prev.filter((key) => next.includes(key)));
  };

  const handleSceneSelectChange: TransferProps['onSelectChange'] = (sourceSelectedKeys, targetSelectedKeys) => {
    const selected = sourceSelectedKeys.map(String).filter((key) => !sceneKeys.includes(key));
    if (selected.length) {
      setDirty(true);
      setSceneKeys((prev) => Array.from(new Set([...prev, ...selected])));
      setCheckedPermissions((prev) => Array.from(new Set([...prev, knowledgePageCode])));
    }
    setSelectedSceneKeys(targetSelectedKeys.map(String));
  };

  const setGroupPermissions = (groupCodes: string[], nextGroupKeys: string[]) => {
    setDirty(true);
    setCheckedPermissions((prev) => [
      ...prev.filter((code) => !groupCodes.includes(code)),
      ...nextGroupKeys,
    ]);
  };

  const setApprovalRequiredChecked = (code: string, checked: boolean) => {
    setDirty(true);
    setApprovalRequired((prev) => {
      const next = checked
        ? Array.from(new Set([...prev, code]))
        : prev.filter((item) => item !== code);
      if (next.length) {
        setCheckedPermissions((permissionsPrev) => Array.from(new Set([...permissionsPrev, approvalViewOwnCode])));
      }
      return next;
    });
  };

  const goBackToList = () => {
    closeWorkTab(location.pathname);
    history.push('/system/roles');
  };

  function node(item: any) {
    const checked = checkedPermissions.includes(item.code);
    const unsaved = unsavedPermissionKeys.includes(item.code);
    const removed = removedPermissionKeys.includes(item.code);
    const display = permissionDisplayMap[item.code] || item;
    return {
      key: item.code,
      title: (
        <span className={`role-tree-node ${checked ? 'is-checked' : ''} ${unsaved ? 'is-unsaved' : ''} ${removed ? 'is-removed' : ''}`}>
          <span>
            <strong>{display.name}</strong>
            {display.description ? <em>{display.description}</em> : null}
          </span>
          {approvalCodes.includes(item.code) && checked ? (
            <Checkbox
              className="role-approval-checkbox"
              checked={approvalRequired.includes(item.code)}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                setApprovalRequiredChecked(item.code, event.target.checked);
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
    if (approvalRequired.length) {
      selected.add(approvalViewOwnCode);
    }
    if (sceneKeys.length) {
      selected.add(knowledgePageCode);
    }
    if (selected.has(knowledgeLogViewAllCode)) {
      selected.add(knowledgePageCode);
      selected.add(knowledgeViewCode);
    }
    const canReviewApproval = [approvalManageCode, ...approvalReviewCodes].some((code) => selected.has(code));
    if (canReviewApproval) {
      selected.add(approvalPageCode);
    }
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
    clearUnsaved();
    goBackToList();
  };

  return (
    <PageHeader
      title={isCreate ? '新增角色' : '角色配置'}
      breadcrumb={`系统管理 / 角色管理 / ${isCreate ? '新增角色' : role?.roleName || '角色配置'}`}
      description="用树状结构配置页面和操作权限；新增、编辑、删除知识被选中后，可直接在权限项后设置是否需要审批。"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => runAfterUnsavedConfirm(location.pathname, goBackToList)}>
          返回
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={loading} onClick={submit}>
          保存配置
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" className="role-config-page" onValuesChange={() => setDirty(true)}>
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
              <>
                <Alert
                  type="success"
                  showIcon
                  className="role-config-note"
                  message="左侧选择后会自动加入右侧，浅绿色标识表示本次新增但尚未保存的配置。"
                />
                <Transfer
                  showSearch
                  dataSource={sceneItems}
                  targetKeys={sceneKeys}
                  selectedKeys={selectedSceneKeys}
                  titles={['待选场景', '已授权场景']}
                  listStyle={{ width: '45%', height: 300 }}
                  render={(item) => (
                    <span className={`role-transfer-option ${sceneKeys.includes(String(item.key)) ? 'is-authorized' : ''} ${unsavedSceneKeys.includes(String(item.key)) ? 'is-unsaved' : ''} ${removedSceneKeys.includes(String(item.key)) ? 'is-removed' : ''}`}>
                      {item.title}
                    </span>
                  )}
                  filterOption={(input, item) =>
                    String(item.title).includes(input) || String(item.description || '').includes(input)
                  }
                  onSelectChange={handleSceneSelectChange}
                  onChange={handleSceneChange}
                />
              </>
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
                      setGroupPermissions(group.codes, nextGroupKeys);
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
