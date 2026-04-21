import React from 'react';
import { Breadcrumb } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';

import './index.less';

type BreadcrumbType = {
    title: string;
    path?: string;
    disabled?: boolean;
}
interface Props {
    breadcrumb: BreadcrumbType[];
    title: string;
    goback?: string;
    children: React.ReactNode;
    [x: string]: any
}
const BreadcrumbComp: React.FC<Props> = ({
    breadcrumb,
    title,
    children,
}) => {
    const items = breadcrumb.map((item) => ({
        key: item.title,
        title: item.disabled ? item.title : <a href={item.path}>{item.title}</a>
    }))
    return (
        <section className='w-full h-full flex-1 flex flex-col'>
            <div className='shink-0 flex justify-between items-center h-48 right-header'>
                <Breadcrumb items={items} className='self-breadcrumb' />
                <span className='cursor-pointer hover:text-primary'
                    onClick={() => history.back()}>
                    <ArrowLeftOutlined /> 返回
                </span>
            </div>
            <div className='flex-1 overflow-hidden'>
                <div className='h-full overflow-auto'>
                    {children}
                </div>

            </div>

        </section>
    );
};
export default BreadcrumbComp;