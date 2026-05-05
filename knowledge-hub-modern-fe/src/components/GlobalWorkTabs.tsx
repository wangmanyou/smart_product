import { CloseOutlined } from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Tabs } from 'antd';
import { useEffect, useMemo, useState } from 'react';

type TabItem = {
  key: string;
  path: string;
  label: string;
  group: 'knowledge' | 'system' | 'other';
  closable?: boolean;
};

const STORE_KEY = 'knowledge-work-tabs-v6';
const OLD_STORE_KEYS = ['knowledge-work-tabs-v5', 'knowledge-work-tabs-v4', 'knowledge-work-tabs-v3', 'knowledge-work-tabs'];

function shouldOpenTab(path: string) {
  if (path === '/login') return false;
  if (path === '/home') return false;
  if (path === '/statistics') return false;
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
  if (path === '/system/dicts') return '目录管理';
  if (path === '/system/scenes') return '场景管理';
  if (path === '/system/users') return '用户管理';
  if (path === '/statistics') return '数据展板';
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

  const sceneEdit = path.match(/^\/system\/scenes\/([^/]+)\/config/);
  if (sceneEdit) {
    paths.push(`/system/scenes/${sceneEdit[1]}/view`);
    paths.push(`/system/scenes/${sceneEdit[1]}`);
  }

  const knowledgeEdit = path.match(/^\/knowledge\/scene\/([^/]+)\/edit\/([^/]+)/);
  if (knowledgeEdit) paths.push(`/knowledge/scene/${knowledgeEdit[1]}/detail/${knowledgeEdit[2]}`);
  return paths;
}

export default function GlobalWorkTabs() {
  const location = useLocation();
  const [tabs, setTabs] = useState<TabItem[]>([]);
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
      const next = exists
        ? base.map((tab) => (tab.path === pathname ? { ...tab, label: nextTab.label } : tab))
        : [...base, nextTab];
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
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
    window.addEventListener('work-tab-label-change', handleLabelChange);
    return () => window.removeEventListener('work-tab-label-change', handleLabelChange);
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
                onClick={(event) => {
                  event.stopPropagation();
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
        onChange={(key) => history.push(key)}
      />
    </div>
  );
}
