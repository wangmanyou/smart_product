import React from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import { history } from '@umijs/max';
import { ActionType, SceneType } from '@/constants/type';

import SceneForm from '../components/SceneForm';

import { createSceneApi } from '@/services/system/scene';
import { message } from 'antd';


interface Props {
    [x: string]: any
}
const CreatePage: React.FC<Props> = () => {

    const handleSubmit = async (values: any) => {
        try {
            await createSceneApi(values);
            history.push('/system/scene');
        } catch (error) {
            message.error('创建失败');
        }
    }
    return (
        <PageContainer>
            <div className="h-full overflow-y-auto bg-white dict-action-page">
                <div className="px-48 m-auto pb-24 pt-48">
                    <SceneForm
                        sourceType={ActionType.create}
                        initialValues={{
                            sceneItem: [{
                                localId: Date.now(),
                                sceneItemName: null,
                                type: SceneType.dict,
                                multiValue: false,
                                isHide: false,
                                isRequired: false,
                                isSupportSearch: true,
                            }]
                        }}
                        handleSubmit={handleSubmit} />
                </div>
            </div>
        </PageContainer>
    );
};
export default CreatePage;