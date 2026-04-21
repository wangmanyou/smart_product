import {
    PageContainer,
} from '@ant-design/pro-components';
import { useCallback, useEffect, useState } from 'react';
import { useModel, useParams, history } from '@umijs/max';

import { message, Spin } from 'antd';

import DetailForm from './components/BusinessForm';

import { editKnowledgeApi, getKnowledgeDetailApi, getBusinessDetailApi } from '@/services/business';
import { SceneType } from '@/constants/type';

import { formatBusinessDetail, getFilenameByPath } from '@/utils/business';

const files = [SceneType.picture, SceneType.video, SceneType.audio, SceneType.file];

type Props = {
    [x: string]: any
}

const DetailSearchPanel: React.FC<Props> = () => {

    const params = useParams();


    const {
        sceneData,
        setTreeData,
        setSceneData,
        setDetail,
        infoLoading,
        setInfoLoading,
    } = useModel('businessDetail');

    const [loading, setLoading] = useState(false);
    const [initial, setInitial] = useState<any>(null);

    const handleFinish = useCallback(async (values) => {
        
        try {
            await editKnowledgeApi({
                knowledgeItem: values,
                knowledgeId: params.knowledgeId,
            });
            message.success('编辑成功');
            history.push(`/business/${params.id}`);
        } catch (error) {
            message.error(error?.msg || '编辑失败');
        }
    }, [])

    // 获取知识详情
    const getKnowledgeDetail = useCallback(async () => {
        setLoading(true)
        try {
            const { knowledgeShow } = await getKnowledgeDetailApi(Number(params.knowledgeId));
            const formdata: any = {};
            knowledgeShow.forEach(item => {
                const { sceneItemId, sceneItemType, sceneItemValue, sceneItemSelectDictTreeIds } = item;
                const currentSceneItem = sceneData?.find(item => item.id === sceneItemId);
                if (sceneItemType === SceneType.dict) {
                    formdata[sceneItemId] = JSON.parse(sceneItemSelectDictTreeIds || '[]');
                } else if (sceneItemType === SceneType.text) {
                    formdata[sceneItemId] = sceneItemValue[0];
                } else if (sceneItemType === SceneType.decimal || sceneItemType === SceneType.integer) {
                    
                    if (!!currentSceneItem?.multiValue) {
                        formdata[sceneItemId] = sceneItemValue.map(val => ({ [sceneItemId]: val }));
                    } else {
                        formdata[sceneItemId] = sceneItemValue[0] || null;
                    }

                } else if (sceneItemType === SceneType.datetime) {
                    if (!!currentSceneItem?.multiValue) {
                        formdata[sceneItemId] = sceneItemValue;
                    } else {
                        formdata[sceneItemId] = sceneItemValue[0];
                    }

                } else if (files.includes(sceneItemType)) {
                    formdata[sceneItemId] = sceneItemValue.map((file: string, fileIndex: number) => ({
                        uid: fileIndex,
                        name: getFilenameByPath(file),
                        status: 'success',
                        url: file,
                        response: {
                            status: 'success',
                            file_path: file,
                        },
                    }));

                } else {
                    formdata[sceneItemId] = sceneItemValue;
                }

            })
            setInitial(formdata)
        } catch (error) {
            message.error(error?.msg || '获取详情失败');
        } finally {
            setLoading(false)
        }
    }, [sceneData])

    // 获取业务配置数据
    const getBusinessData = async () => {
        setInfoLoading(true);
        try {
            const result = await getBusinessDetailApi(Number(params.id));
            const { tree, sceneItem, sceneTemplateDetail } = formatBusinessDetail(result);
            setTreeData(tree || []);
            setSceneData(sceneItem);
            setDetail(sceneTemplateDetail);

            getKnowledgeDetail();
        } catch (error) {
            console.log(error);
        } finally {
            setInfoLoading(false);
        }
    }

    useEffect(() => {
        getBusinessData();
    }, [])

    return (
        <PageContainer >
            {
                infoLoading ? <div className='w-full h-[200px] flex flex-col justify-center items-center'><Spin /></div> : (
                    <section className="w-full m-auto">
                        {
                            loading ? <Spin className='w-full h-[200px] flex justify-center items-center' /> :
                                <div className='pb-24'>
                                    <DetailForm
                                        handleFinish={handleFinish}
                                        directoryData={sceneData}
                                        initialValues={initial} />
                                </div>
                        }
                    </section>
                )
            }

        </PageContainer>
    )
}


export default DetailSearchPanel;
