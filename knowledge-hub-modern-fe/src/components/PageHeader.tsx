import { Space } from 'antd';
import type { ReactNode } from 'react';

export default function PageHeader({
  extra,
  children,
}: {
  title: string;
  breadcrumb: string;
  description?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page-shell">
      {extra ? (
        <div className="page-shell-toolbar">
          <Space wrap className="page-actions">{extra}</Space>
        </div>
      ) : null}
      {children}
    </div>
  );
}
