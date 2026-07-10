import React, { useCallback, useEffect, useState } from 'react';
import { history, useParams } from '@umijs/max';
import { message, Spin } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';

import { ActionType, SceneItem } from '../types';

import DictForm from '../components/SceneForm';

import { getSceneDetailApi, editSceneApi } from '@/services/system/scene';


type FieldType = {
    sceneName: string;
    sceneItem?: SceneItem[];
};

const EditForm: React.FC = ({ }) => {
    const params = useParams();

    const [detail, setDetail] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // 提交
    const handleSubmit = useCallback(async (values: FieldType) => {
        try {
            const nowparams: any = {
                ...values,
                sceneTemplateId: params?.id,
            }
            console.log(params, 'params');

            await editSceneApi(nowparams);
            message.success('编辑成功');
            history.push('/system/scene');
        } catch (error) {
            message.error('编辑失败');
        }
    }, [params.id]);

    // 获取详情
    const getSceneDetail = useCallback(async (id: number) => {
        setLoading(true);
        try {
            const res = await getSceneDetailApi(id);
            const { sceneItem, sceneTemplateDetail } = res;
            const now = Date.now();
            setDetail({
                sceneTemplateId: sceneTemplateDetail.sceneTemplateId,
                sceneName: sceneTemplateDetail.sceneName,
                sceneItem: sceneItem?.map((item: SceneItem, index: number) => ({
                    ...item,
                    dictTemplateId: item.dictTemplateId,
                    localId: `${now}${index}`,
                })),
            });
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (params?.id) {
            getSceneDetail(params!.id);
        }
    }, [params.id]);

    return (
        <PageContainer>
            <div className="h-full overflow-y-auto bg-white dict-action-page">
                <div className="px-48 m-auto pb-24 pt-48">
                    {
                        loading ? (
                            <Spin spinning={true} className='w-full' />
                        ) : (
                            <DictForm
                                sourceType={ActionType.edit}
                                initialValues={detail}
                                handleSubmit={handleSubmit} />
                        )
                    }
                </div>
            </div>
        </PageContainer>

    );
};

export default EditForm;