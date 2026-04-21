import React, { useState } from 'react';
import { Image, Pagination } from 'antd';
import DownloadFile from '../DownloadFile';
import { getFilenameByPath } from '@/utils/business';


interface Props {
    data: string[];
    [x: string]: any
}
const DefaultImage: React.FC<Props> = ({
    data,
}) => {
    const [current, setCurrent] = useState(0);
    const nowPath = data[current];
    
    return (
        <section className='flex flex-col items-center justify-center gap-16'>
            <div className='p-24 h-[350px] flex flex-col justify-center items-center '>
                <DownloadFile filePath={nowPath}>
                    {getFilenameByPath(nowPath)}
                </DownloadFile>
                <Image
                    key={current}
                    src={nowPath}
                    height={300}
                    className='h-[300px]'
                />
            </div>

            <Pagination
                simple={{ readOnly: true }}
                current={current}
                pageSize={1}
                total={data.length}
                onChange={(page) => setCurrent(page-1)} />
        </section>
    );
};
export default DefaultImage;