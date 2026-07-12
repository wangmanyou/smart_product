import { CloseOutlined } from '@ant-design/icons';
import { history, useLocation } from '@umijs/max';
import { Tabs, Tooltip } from 'antd';

type WorkTab = {
  key: string;
  label: string;
  path: string;
  closable?: boolean;
};

export default function WorkTabs({ tabs }: { tabs: WorkTab[] }) {
  const location = useLocation();
  const active = tabs.find((tab) => location.pathname === tab.path)?.key || tabs[tabs.length - 1]?.key;
  const fallbackPath = tabs.find((tab) => !tab.closable)?.path || tabs[0]?.path;

  const closeTab = (key: string) => {
    const target = tabs.find((tab) => tab.key === key);
    if (!target?.closable) return;
    history.push(fallbackPath || '/knowledge');
  };

  return (
    <Tabs
      className="page-tabs"
      type="card"
      activeKey={active}
      items={tabs.map((tab) => ({
        key: tab.key,
        label: (
          <span className="work-tab-label">
            <Tooltip title={tab.label} placement="bottom">
              <span className="work-tab-label-text">{tab.label}</span>
            </Tooltip>
            {tab.closable ? (
              <CloseOutlined
                className="work-tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.key);
                }}
              />
            ) : null}
          </span>
        ),
      }))}
      onChange={(key) => {
        const target = tabs.find((tab) => tab.key === key);
        if (target) history.push(target.path);
      }}
    />
  );
}
