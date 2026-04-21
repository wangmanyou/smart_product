import React from 'react';
import { Skeleton } from 'antd'

interface Props {
    topClassname?: string
    [x: string]: any
}
const SkeletonForm: React.FC<Props> = ({
    topClassname,
}) => {
    return (
        <div className={`w-full flex flex-col gap-16 ${topClassname}`}>
            <div className='flex items-center gap-8'>
                <Skeleton.Avatar active shape={'circle'} />
                <Skeleton.Input active block={true}/>
            </div>
            <div className='flex items-center gap-8'>
                <Skeleton.Avatar active shape={'circle'} />
                <Skeleton.Input active block={true}/>
            </div>
            <div className='flex items-center gap-8'>
                <Skeleton.Avatar active shape={'circle'} />
                <Skeleton.Input active block={true}/>
            </div>
        </div>
    );
};
export default SkeletonForm;