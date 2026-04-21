import {
    PageContainer,
} from '@ant-design/pro-components';
import { useCallback, useEffect } from 'react';
import { useModel, useParams, history } from '@umijs/max';
import { message, Spin } from 'antd';

import DetailForm from './components/BusinessForm';

import { addKnowledgeApi, getBusinessDetailApi } from '@/services/business';

import { formatBusinessDetail, formatBusinessSearchData } from '@/utils/business';


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

    // 获取业务配置数据
    const getBusinessData = useCallback(async () => {
        setInfoLoading(true);
        try {
            const result = await getBusinessDetailApi(Number(params.id));
            const { tree, sceneItem, sceneTemplateDetail } = formatBusinessDetail(result);
            setTreeData(tree || []);
            setSceneData(sceneItem);
            setDetail(sceneTemplateDetail);

        } catch (error) {
            console.log(error);
        } finally {
            setInfoLoading(false);
        }
    }, []);

    const handleFinish = useCallback(async (values) => {
        try {
            await addKnowledgeApi({
                sceneTemplateId: Number(params.id),
                knowledge: values,
            });
            message.success('编辑成功');
            history.push(`/business/${params.id}`);
        } catch (error) {
            message.error(error?.msg || '编辑失败');
        }
    }, [sceneData])


    useEffect(() => {
        if (!sceneData) {
            getBusinessData();
        }
    }, [sceneData])

    return (
        <PageContainer >
            <section className="w-[600px] m-auto pb-24">
                {
                    infoLoading ? <div className='w-full h-[200px] flex flex-col justify-center'><Spin/></div> : (
                        <DetailForm
                            handleFinish={handleFinish}
                            directoryData={sceneData} />
                    )
                }
            </section>
        </PageContainer>

    )
}


export default DetailSearchPanel;
