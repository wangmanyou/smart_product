import React from 'react';
import {
    ProFormUploadButton,
} from '@ant-design/pro-components';
import { UploadListType } from 'antd/es/upload/interface';
import { message } from 'antd';

import { SceneType, SceneTypeConfigEnum } from '@/constants/type';

import { isSupportFileType } from '@/utils/judge';

import type { UploadProps } from 'antd';


type Limit = {
    size: number,
    type: string[],
}
interface Props {
    type: SceneType.picture | SceneType.file | SceneType.video | SceneType.audio;
    name: string;
    label: string,
    listType?: UploadListType,
    maxCount: number,
    required: boolean,
    limit?: Limit,
    formRef: any,
    [x: string]: any
}
const UploadComp: React.FC<Props> = ({
    type,
    name,
    label,
    listType,
    maxCount,
    required,
    limit,
    formRef,
}) => {

    const [successFile, setSuccessFile] = React.useState<any>([]);

    const handleBeforeUpload = (file: File) => {

        if (file.size / 1024 / 1024 > limit?.size) {
            message.error(`文件大小不能超过${limit?.size}MB`);
            return false;
        }

        if (!isSupportFileType(file, limit?.type)) {
            message.error(`文件格式不正确, 请上传${limit?.type.join(',')}格式的文件`);
            return false;
        }
        return true;
    }

    const handleChange: UploadProps['onChange'] = (info) => {
        const { file, fileList } = info;
        if (file.status === 'done') {
            const { status, message: msg} = file.response;
            if(status === "success") {
                setSuccessFile((pre) => [...pre, file.response]);
                message.success(`${file.name}上传成功`);
            } else {
                file.status = 'error';
                message.error(`${file.name} 上传失败，请删除后重新上传`);
            }

        } else if (file.status === 'error') {
            message.error(`${file.name} 上传失败，请删除后重新上传`);
        }

        const filteredList = fileList.filter((f) => {
            return f.status;
        });
        formRef?.current?.setFieldValue(name, filteredList)
    };

    const extra = `文件大小不能超过${limit?.size}MB, 只支持${limit?.type.join(',')}格式的文件`;
    const text = SceneTypeConfigEnum[type].text;

    return (
        <ProFormUploadButton
            accept={limit?.type.join(',')}
            name={name}
            label={label}
            fieldProps={{
                listType,
                maxCount,
                withCredentials: true,
                action: '/api/v1/data/business/upload/file',
                beforeUpload: handleBeforeUpload,
                onChange: handleChange,
                data: (file) => ({
                    filename: file.name,
                }),
            }}
            extra={extra}
            required={required}
            rules={[
                ({ }) => ({
                    validator(_, value) {
                        if(required && !value?.length) {
                            return Promise.reject(new Error(`请上传${text}`));

                        }
                        const isUploading = value?.some((item: any) => item.status === 'uploading');
                        if (isUploading) {
                            return Promise.reject(new Error(`请等待${text}上传完成`));
                        }
                        const isError = value?.some((item: any) => item.status === 'error');
                        const hasSuccess = value?.some((item: any) => item.status === 'done');
                        if (required && !hasSuccess && isError) {
                            return Promise.reject(new Error(`请删除上传失败的${text},并重新上传`));
                        }
                        if(required && !successFile.length && value.length) {
                            return Promise.reject(new Error(`请删除上传失败的${text},并重新上传`));
                        }
                        return Promise.resolve(true);
                    },
                }),
            ]} />
    );
};
export default UploadComp;