import React, { useState } from 'react';
import { Pagination } from 'antd';
import DownloadFile from '../DownloadFile';
import { getFilenameByPath } from '@/utils/business';

interface Props {
    data: string[];
    [x: string]: any
}
const DefaultAudio: React.FC<Props> = ({
    data,
}) => {
    const [current, setCurrent] = useState(0);
    const nowPath = data[current];

    return (
        <section className='flex flex-col items-center justify-center gap-16'>
            <div className='p-24 relative h-[300px] flex flex-col justify-center items-center'>
                <DownloadFile filePath={nowPath}>
                    {getFilenameByPath(nowPath)}
                </DownloadFile>
                <audio 
                    key={current}
                    className='h-[100px]'
                    controls
                    src={nowPath}>
                </audio>
            </div>
            <Pagination
                simple={{ readOnly: true }}
                current={current}
                pageSize={1}
                total={data.length}
                onChange={(page) => setCurrent(page - 1)} />
        </section>
    );
};
export default DefaultAudio;