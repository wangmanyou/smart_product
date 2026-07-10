import React from 'react';
import { Divider } from 'antd';

interface Props {
    type?: 'default' | 'divider';
    children: React.ReactNode;
    [x: string]: any
}
const Title: React.FC<Props> = ({
    type = 'divider',
    children,
}) => {
    return (
        type === 'default' ? (
            <div className='text-text-1 font-bold pb-4'>{children}</div>
        ) : (
            <div>
                <div className='text-text-1 font-bold pb-4 flex items-center pl-24 h-32 bg-bg-4 rounded-lg'>{children}</div>
                <Divider style={{ margin: 0 }} />
            </div>
        )

    );
};
export default Title;