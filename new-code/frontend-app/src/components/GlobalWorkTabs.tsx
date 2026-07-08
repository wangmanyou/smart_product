import { CloseOutlined } from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Tabs, message } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '@/services/api';
import { confirmUnsavedLeave, prepareUnsavedTabSwitch } from '@/utils/unsavedChanges';

type TabItem = {
  key: string;
  path: string;
  label: string;
  group: 'knowledge' | 'system' | 'other';
  closable?: boolean;
};

const STORE_KEY = 'knowledge-work-tabs-v6';
const OLD_STORE_KEYS = ['knowledge-work-tabs-v5', 'knowledge-work-tabs-v4', 'knowledge-work-tabs-v3', 'knowledge-work-tabs'];
const MAX_GROUP_TABS = 8;

function shouldOpenTab(path: string) {
  if (path === '/login') return false;
  if (path === '/home') return false;
  if (path === '/statistics') return false;
  if (path === '/notifications') return false;
  return true;
}

function groupOf(path: string): TabItem['group'] {
  if (path === '/knowledge') return 'knowledge';
  if (path.startsWith('/knowledge/scene')) return 'knowledge';
  if (path.startsWith('/system')) return 'system';
  return 'other';
}

function titleOf(path: string) {
  if (path === '/knowledge') return '场景列表';
  if (path === '/notifications') return '通知中心';
  if (path === '/system/dicts') return '目录管理';
  if (path === '/system/scenes') return '场景管理';
  if (path === '/system/users') return '用户管理';
  if (/^\/system\/users\/new\/config/.test(path)) return '新增用户';
  if (/^\/system\/users\/[^/]+\/config/.test(path)) return '用户编辑';
  if (path === '/system/roles') return '角色管理';
  if (path === '/system/approvals') return approvalTitle();
  if (path === '/statistics') return '数据展板';
  if (/^\/system\/roles\/new\/config/.test(path)) return '新增角色';
  if (/^\/system\/roles\/[^/]+\/config/.test(path)) return '角色配置';
  if (/^\/system\/dicts\/new\/edit/.test(path)) return '新增目录';
  if (/^\/system\/dicts\/[^/]+\/edit/.test(path)) return '目录编辑';
  if (/^\/system\/dicts\/[^/]+/.test(path)) return '目录详情';
  if (/^\/system\/scenes\/new\/config/.test(path)) return '创建场景';
  if (/^\/system\/scenes\/[^/]+\/config/.test(path)) return '场景编辑';
  if (/^\/system\/scenes\/[^/]+\/view/.test(path)) return '场景详情';
  if (/^\/system\/scenes\/[^/]+/.test(path)) return '场景详情';
  if (/^\/knowledge\/scene\/[^/]+\/detail\/([^/]+)/.test(path)) {
    const id = path.match(/^\/knowledge\/scene\/[^/]+\/detail\/([^/]+)/)?.[1];
    return `知识 ${id}`;
  }
  if (/^\/knowledge\/scene\/[^/]+\/edit\/([^/]+)/.test(path)) {
    const id = path.match(/^\/knowledge\/scene\/[^/]+\/edit\/([^/]+)/)?.[1];
    return `编辑知识 ${id}`;
  }
  if (/^\/knowledge\/scene\/[^/]+\/create/.test(path)) return '新增知识';
  if (/^\/knowledge\/scene\/[^/]+\/import/.test(path)) return '批量导入';
  if (/^\/knowledge\/scene\/[^/]+/.test(path)) return '知识列表';
  return '页面';
}

function approvalTitle() {
  const user = authApi.getCurrentUser();
  const actions = new Set(user?.setting?.operationPermissions || user?.operationPermissions || []);
  const canReview =
    Boolean(user?.isBuiltin || user?.setting?.admin || user?.roleIds?.includes?.(1)) ||
    actions.has('system:approval:manage') ||
    actions.has('knowledge:change-request:view-all') ||
    actions.has('knowledge:change-request:approve') ||
    actions.has('knowledge:change-request:reject');
  return canReview ? '审批管理' : '审批中心';
}

function readTabs(): TabItem[] {
  try {
    const tabs = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    return Array.isArray(tabs) ? tabs : [];
  } catch {
    return [];
  }
}

function ensureGroupEntryTabs(group: TabItem['group'], tabs: TabItem[]) {
  if (group !== 'knowledge') return tabs;
  if (tabs.some((tab) => tab.path === '/knowledge')) return tabs;
  return [
    {
      key: '/knowledge',
      path: '/knowledge',
      label: '场景列表',
      group: 'knowledge',
      closable: true,
    },
    ...tabs,
  ];
}

function inferredReplacePaths(path: string) {
  const paths: string[] = [];
  const dictEdit = path.match(/^\/system\/dicts\/([^/]+)\/edit/);
  if (dictEdit) paths.push(`/system/dicts/${dictEdit[1]}`);
  const dictDetail = path.match(/^\/system\/dicts\/([^/]+)$/);
  if (dictDetail) paths.push(`/system/dicts/${dictDetail[1]}/edit`);

  const sceneEdit = path.match(/^\/system\/scenes\/([^/]+)\/config/);
  if (sceneEdit) {
    paths.push(`/system/scenes/${sceneEdit[1]}/view`);
    paths.push(`/system/scenes/${sceneEdit[1]}`);
  }

  const knowledgeEdit = path.match(/^\/knowledge\/scene\/([^/]+)\/edit\/([^/]+)/);
  if (knowledgeEdit) paths.push(`/knowledge/scene/${knowledgeEdit[1]}/detail/${knowledgeEdit[2]}`);

  const knowledgeDetail = path.match(/^\/knowledge\/scene\/([^/]+)\/detail\/([^/]+)/);
  if (knowledgeDetail) paths.push(`/knowledge/scene/${knowledgeDetail[1]}/edit/${knowledgeDetail[2]}`);
  return paths;
}

export default function GlobalWorkTabs() {
  const location = useLocation();
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const lastPathRef = useRef('/knowledge');
  const pathname = location.pathname;
  const routeState = location.state as { tabLabel?: string; resetTabs?: boolean; replacePath?: string } | undefined;
  const routeLabel = routeState?.tabLabel;
  const resetTabs = routeState?.resetTabs;
  const replacePath = routeState?.replacePath;

  useEffect(() => {
    OLD_STORE_KEYS.forEach((key) => localStorage.removeItem(key));
    if (!shouldOpenTab(pathname)) {
      if (pathname === '/home' || pathname === '/statistics') {
        setTabs([]);
        localStorage.removeItem(STORE_KEY);
      }
      return;
    }
    setTabs((prev) => {
      const currentGroup = groupOf(pathname);
      const stored = prev.length ? prev : readTabs();
      const sameGroup = stored.every((tab) => tab.group === currentGroup);
      const rawBase = resetTabs || !sameGroup ? [] : stored;
      const replacePaths = [replacePath, ...inferredReplacePaths(pathname)].filter(Boolean) as string[];
      const base = ensureGroupEntryTabs(
        currentGroup,
        replacePaths.length ? rawBase.filter((tab) => !replacePaths.includes(tab.path)) : rawBase,
      );
      const nextTab: TabItem = {
        key: pathname,
        path: pathname,
        label: routeLabel || titleOf(pathname),
        group: currentGroup,
        closable: true,
      };
      const exists = base.some((tab) => tab.path === pathname);
      if (!exists && ['knowledge', 'system'].includes(currentGroup) && base.length >= MAX_GROUP_TABS) {
        message.warning(`最多只能打开 ${MAX_GROUP_TABS} 个页签，请先关闭不用的页签再打开新页面`);
        const fallback = base.find((tab) => tab.path === lastPathRef.current)?.path || base[base.length - 1]?.path || '/knowledge';
        setTimeout(() => {
          if (history.location.pathname === pathname) {
            history.replace(fallback);
          }
        });
        return base;
      }
      const next = exists
        ? base.map((tab) => (tab.path === pathname ? { ...tab, label: nextTab.label } : tab))
        : [...base, nextTab];
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
      lastPathRef.current = pathname;
      return next;
    });
  }, [pathname, routeLabel, resetTabs, replacePath]);

  useEffect(() => {
    const handleLabelChange = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string; label?: string }>).detail;
      if (!detail?.label) return;
      const targetPath = detail.path || pathname;
      setTabs((prev) => {
        const next = prev.map((tab) =>
          tab.path === targetPath ? { ...tab, label: detail.label || tab.label } : tab,
        );
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
        return next;
      });
    };
    const handleTabClose = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      if (!detail?.path) return;
      setTabs((prev) => {
        const source = prev.length ? prev : readTabs();
        const next = source.filter((tab) => tab.path !== detail.path);
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
        return next;
      });
    };
    window.addEventListener('work-tab-label-change', handleLabelChange);
    window.addEventListener('work-tab-close', handleTabClose);
    return () => {
      window.removeEventListener('work-tab-label-change', handleLabelChange);
      window.removeEventListener('work-tab-close', handleTabClose);
    };
  }, [pathname]);

  const items = useMemo(
    () =>
      tabs.map((tab) => ({
        key: tab.path,
        label: (
          <span className="global-tab-label">
            {tab.label}
            {tab.closable ? (
              <CloseOutlined
                className="global-tab-close"
                onClick={async (event) => {
                  event.stopPropagation();
                  const confirmed = await confirmUnsavedLeave(tab.path);
                  if (!confirmed) return;
                  const nextTabs = tabs.filter((item) => item.path !== tab.path);
                  setTabs(nextTabs);
                  localStorage.setItem(STORE_KEY, JSON.stringify(nextTabs));
                  if (pathname === tab.path) {
                    const fallback = nextTabs[nextTabs.length - 1]?.path;
                    history.push(fallback || '/knowledge');
                  }
                }}
              />
            ) : null}
          </span>
        ),
      })),
    [tabs, pathname],
  );

  if (!shouldOpenTab(pathname) || !tabs.length) return null;

  return (
    <div className="global-work-tabs">
      <Tabs
        type="card"
        activeKey={pathname}
        items={items}
        onChange={async (key) => {
          const confirmed = await prepareUnsavedTabSwitch(pathname);
          if (confirmed) history.push(key);
        }}
      />
    </div>
  );
}
