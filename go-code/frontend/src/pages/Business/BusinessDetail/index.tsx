import {
    PageContainer,
} from '@ant-design/pro-components';
import { useEffect, useState } from 'react';
import { useModel, useParams, history } from '@umijs/max';

import { message, Spin, Result, Button } from 'antd';

import { getKnowledgeDetailApi, getBusinessDetailApi } from '@/services/business';
import { SceneType } from '@/constants/type';

import { formatBusinessDetail } from '@/utils/business';

import Detail from './Detail';


type Props = {
    [x: string]: any
}

const BusinessDetail: React.FC<Props> = () => {

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
    const [knowdetail, setKnowDetail] = useState<any>(null);



    // 获取知识详情
    const getKnowledgeDetail = async () => {
        setLoading(true)
        try {
            const { knowledgeShow, ...other } = await getKnowledgeDetailApi(Number(params.knowledgeId));
          
            const formdata: any = {};
            knowledgeShow?.forEach(item => {
                const { sceneItemId, sceneItemType, sceneItemValue, sceneItemSelectDictTreeIds } = item;
                if (sceneItemType === SceneType.dict) {
                    formdata[sceneItemId] = sceneItemSelectDictTreeIds;
                } else {
                    formdata[sceneItemId] = sceneItemValue;
                }
            })
            setKnowDetail({
                knowledgeShow: formdata,
                ...other,
            })
        } catch (error) {
            message.error(error?.msg || '获取详情失败');
        } finally {
            setLoading(false)
        }
    }

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
                                <div>
                                    {
                                        !knowdetail ? (
                                            <Result
                                                status="404"
                                                title="未找到相应数据"
                                                extra={
                                                    <Button
                                                        type="primary"
                                                        onClick={() => history.push(`/business/:${params.id}`)}
                                                    >
                                                        返回列表页
                                                    </Button>
                                                }
                                            />
                                        ) : (
                                            <Detail detail={knowdetail} sceneData={sceneData} />
                                        )
                                    }
                                </div>
                        }
                    </section>
                )
            }

        </PageContainer>
    )
}


export default BusinessDetail;
