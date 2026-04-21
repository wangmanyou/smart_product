import React from 'react';
import { downloadFn, getFilenameByPath } from '@/utils/download';

interface Props {
    children: React.ReactNode;
    filePath: string;
   [x: string]: any
}
const DownloadFile: React.FC<Props> = ({
    children,
    filePath,
}) => {
    
    return (
        <span className='cursor-pointer hover:text-primary'
            onClick={() => downloadFn(filePath, getFilenameByPath(filePath))}>
            {children}
        </span>
    );
};
export default DownloadFile;