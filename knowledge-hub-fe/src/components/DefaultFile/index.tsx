import { Divider } from 'antd';
import React from 'react';
import DownloadFile from '../DownloadFile';
import { getFilenameByPath } from '@/utils/business';


interface Props {
    data: string[];
    classnames?: string;
    [x: string]: any
}
const DefaultFile: React.FC<Props> = ({
    data,
    classnames=''
}) => {
    return (
        <div className={`py-16 flex flex-col flex-wrap gap-8 ${classnames}`}>
            {data.map((imginfo: string, index: number) => (
                <div>
                    <div className='w-full p-8 flex gap-16 justify-between items-center hover:bg-bg-blueBg hover:rounded-lg' key={index}>
                        <span className='flex-1 truncate'>{getFilenameByPath(imginfo)}</span>
                        <span className='shrink-0 text-primary'>
                            <DownloadFile filePath={imginfo}>下载</DownloadFile>
                        </span>
                    </div>
                    <Divider style={{ margin: 0 }} />
                </div>
            ))}
        </div>
    );
};
export default DefaultFile;