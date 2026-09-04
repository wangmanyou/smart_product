import { Space, Typography } from 'antd';
import type { ReactNode } from 'react';

export default function PageHeader({
  title,
  breadcrumb,
  hideHeader = false,
  hideTitle = false,
  extra,
  className,
  children,
}: {
  title: string;
  breadcrumb: string;
  description?: string;
  hideHeader?: boolean;
  hideTitle?: boolean;
  extra?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const visibleBreadcrumb = breadcrumb && breadcrumb !== title;

  return (
    <div className={`page-shell ${className || ''}`.trim()}>
      {hideHeader ? null : (
        <header className="page-hero">
          <div className="page-hero-main">
            {visibleBreadcrumb ? <div className="page-breadcrumb">{breadcrumb}</div> : null}
            {hideTitle ? null : (
              <Typography.Title level={2} className="page-title">
                {title}
              </Typography.Title>
            )}
          </div>
          {extra ? <Space wrap className="page-actions">{extra}</Space> : null}
        </header>
      )}
      {children}
    </div>
  );
}
