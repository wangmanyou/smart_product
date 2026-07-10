import {
    ProFormDateTimePicker,
    ProFormDateTimeRangePicker,
    ProForm,
    ProFormText,
    ProFormTextArea,
    ProFormDigit,
    ProFormCascader,
    ProFormList,
} from '@ant-design/pro-components';
import { Cascader } from 'antd';
import { useCallback, useMemo, useRef } from 'react';

import {
    SceneType, PictureType,
    VideoType, AudioType, FileType,
} from '@/constants/type';

import UploadComp from './Upload';

const uploadFileMap = [SceneType.audio, SceneType.video, SceneType.file, SceneType.picture];


type Props = {
    initialValues?: any;
    handleFinish: (values: any) => void;
    directoryData: any;
    [x: string]: any
}

const DetailForm: React.FC<Props> = ({
    initialValues,
    handleFinish,
    directoryData,
}) => {

    const formRef = useRef<any>(null);

    const formInfo = useMemo(() => {
        const result = directoryData?.map((item) => {
            const { type, id, dict, sceneItemName, multiValue,
                isHide, isRequired,
            } = item;
            if (isHide) {
                return null;
            }
            switch (type) {
                case SceneType.text: {
                    if (multiValue) {
                        return (
                            <ProFormTextArea
                                key={id}
                                name={id}
                                label={sceneItemName}
                                required={isRequired}
                                rules={[{
                                    required: isRequired,
                                    whitespace: true,
                                    message: `请输入${sceneItemName}`,
                                }]}
                                transform={(value) => ({ [id]: [value] })}
                            />
                        )
                    }
                    return <ProFormText
                        key={id}
                        name={id}
                        label={sceneItemName}
                        required={isRequired}
                        rules={[{
                            required: isRequired,
                            whitespace: true,
                            message: `请输入${sceneItemName}`,
                        }]}
                        transform={(value) => ({ [id]: [value] })} />
                }
                case SceneType.datetime: {
                    if (!multiValue) {
                        return (
                            <ProFormDateTimePicker
                                key={id}
                                name={id}
                                label={sceneItemName}
                                required={isRequired}
                                rules={[{
                                    required: isRequired,
                                    message: `请选择${sceneItemName}`,
                                }]}
                                transform={(value) => ({ [id]: [value] })} />
                        )
                    }
                    return (
                        <ProFormDateTimeRangePicker
                            key={id}
                            name={id}
                            label={sceneItemName}
                            required={isRequired}
                            rules={[{
                                required: isRequired,
                                message: `请选择${sceneItemName}`,
                            }]} />
                    )
                }

                case SceneType.integer:
                    if (!multiValue) {
                        return (
                            <ProFormDigit
                                key={id}
                                name={id}
                                label={sceneItemName}
                                fieldProps={{ precision: 0 }}
                                required={isRequired}
                                rules={[{
                                    required: isRequired,
                                    message: `请输入${sceneItemName}`,
                                }]}
                                transform={(value) => ({ [id]: [value] })}
                            />
                        )
                    }
                    return (
                        <ProFormList
                            key={id}
                            name={id}
                            label={sceneItemName}
                            min={isRequired ? 1 : 0}
                            rules={[{
                                required: isRequired,
                                validator: async (_, value) => {
                                    console.log(value);
                                    if (isRequired) {
                                        if (value && value.length > 0) {
                                            return;
                                        }
                                        throw new Error('至少要有一项！');
                                    }
                                    return
                                },
                            }]}
                        >
                            <ProFormDigit
                                key={id}
                                name={id}
                                // label={sceneItemName}
                                fieldProps={{ precision: 0 }}
                                required={isRequired}
                                rules={[{
                                    required: isRequired,
                                    message: `请输入${sceneItemName}`,
                                }]}
                            />
                        </ProFormList>
                    )

                case SceneType.decimal: {
                    if (!multiValue) {
                        return (
                            <ProFormDigit
                                key={id}
                                name={id}
                                label={sceneItemName}
                                required={isRequired}
                                rules={[{
                                    required: isRequired,
                                    message: `请输入${sceneItemName}`,
                                }]}
                                transform={(value) => ({ [id]: [value] })}
                            />
                        )
                    }
                    return (
                        <ProFormList
                            key={id}
                            name={id}
                            label={sceneItemName}
                            min={isRequired ? 1 : 0}
                            rules={[{
                                required: isRequired,
                                validator: async (_, value) => {
                                    console.log(value);
                                    if (isRequired) {
                                        if (value && value.length > 0) {
                                            return;
                                        }
                                        throw new Error('至少要有一项！');
                                    }
                                    return
                                },
                            }]}
                        >
                            <ProFormDigit
                                key={[id]}
                                name={[id]}
                                fieldProps={{ precision: 3 }}
                                required={isRequired}
                                rules={[{
                                    required: isRequired,
                                    message: `请输入${sceneItemName}`,
                                }]}
                            />
                        </ProFormList>
                    )
                }
                case SceneType.dict: {
                    return (
                        <ProFormCascader
                            key={id}
                            name={id}
                            label={sceneItemName}
                            fieldProps={{
                                options: dict,
                                changeOnSelect: false,
                                fieldNames: {
                                    label: 'name',
                                    value: 'id',
                                    children: 'children',
                                },
                                multiple: !!multiValue,
                                showCheckedStrategy: Cascader.SHOW_CHILD,
                            }}
                            rules={[{
                                required: isRequired,
                                message: `请选择${sceneItemName}`,
                            }]} />
                    )
                }

                case SceneType.picture: {
                    return (
                        <UploadComp
                            key={id}
                            name={id}
                            label={sceneItemName}
                            type={SceneType.picture}
                            formRef={formRef}
                            limit={{
                                size: 50,
                                type: PictureType,
                            }}
                            listType={'picture-card'}
                            maxCount={multiValue ? Number.MAX_SAFE_INTEGER : 1}
                            required={isRequired} />
                    )
                }

                case SceneType.audio: {
                    return (
                        <UploadComp
                            key={id}
                            name={id}
                            label={sceneItemName}
                            type={SceneType.audio}
                            formRef={formRef}
                            limit={{
                                size: 50,
                                type: AudioType,
                            }}
                            listType={'picture'}
                            maxCount={multiValue ? Number.MAX_SAFE_INTEGER : 1}
                            required={isRequired} />
                    )
                }
                case SceneType.video: {
                    return (
                        <UploadComp
                            key={id}
                            name={id}
                            label={sceneItemName}
                            type={SceneType.video}
                            formRef={formRef}
                            limit={{
                                size: 50,
                                type: VideoType,
                            }}
                            listType={'picture'}
                            maxCount={multiValue ? Number.MAX_SAFE_INTEGER : 1}
                            required={isRequired} />
                    )
                }
                case SceneType.file: {
                    return (
                        <UploadComp
                            name={id}
                            label={sceneItemName}
                            type={SceneType.file}
                            formRef={formRef}
                            listType={'picture'}
                            limit={{
                                size: 50,
                                type: FileType,
                            }}
                            maxCount={multiValue ? Number.MAX_SAFE_INTEGER : 1}
                            required={isRequired} />
                    )
                }

                default: {
                    return null;
                }
            }
        })
        return result?.filter(Boolean);
    }, [directoryData])

    const onFinish = useCallback((values) => {
        
        const result = [];
        directoryData.forEach(item => {
            const { type, id, multiValue, isHide } = item;
            if (!isHide && values[id]) {
                const knowledge: any = {
                    sceneItemId: Number(id),
                    sceneItemType: type,
                    sceneItemValue: values[id],
                    multiValue,
                }
                if (type === SceneType.dict) {
                    knowledge.sceneItemSelectDictTreeIds = JSON.stringify(values[id]);
                    delete knowledge.sceneItemValue;
                }

                if ((type === SceneType.decimal || type === SceneType.integer)) {
                    if (multiValue) {
                        knowledge.sceneItemValue = values[id].map(v => v[id] + '');
                    } else {
                        knowledge.sceneItemValue = [values[id] + ''];
                    }

                }
                if (uploadFileMap.includes(type)) {
                    const uploadDatas = values[id];
                    const filterUploadDatas = uploadDatas.filter(v => v?.response?.status === 'success');

                    knowledge.sceneItemValue = filterUploadDatas?.map(item => item?.response?.file_path);
                }
                result.push(knowledge);
            }
        })

        handleFinish(result);

    }, [directoryData])

    return (
        <ProForm
            layout="vertical"
            formRef={formRef}
            labelWrap={true}
            onFinish={onFinish}
            initialValues={initialValues || null}
        >
            {formInfo}
        </ProForm>

    )
}

export default DetailForm;
