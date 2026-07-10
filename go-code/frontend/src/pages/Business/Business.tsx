import React, { useCallback, useEffect, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Divider, message, Spin } from 'antd';
import { useModel, useParams } from '@umijs/max';

import TreeComp from './components/Tree';
import BusinessSearchPanel from './components/BusinessSearchPanel';
import BusinessTable from './components/BusinessTable';
import BusinessSetting from './components/BusinessSetting';

import { getRouteScope } from '@/constants/route';


import { getBusinessDetailApi, getSearchListApi } from '@/services/business';

import { formatBusinessDetail, formatBusinessSearchData } from '@/utils/business';


import './Detail.less';
// import _ from 'lodash';

interface Props {
    [x: string]: any
}
const Detail: React.FC<Props> = () => {
    const params = useParams();
    const searchRef = useRef(null);

    const {
        selectedKey,
        setSelectedKey,
        treeData,
        setTreeData,
        sceneData,
        setSceneData,
        detail,
        setDetail,
        infoLoading,
        setInfoLoading,
        searchParams,
        saveSearchParams,
        list,
        saveList,
        loading,
        setLoading,
        total,
        settingOpen,
        setSettingOpen,
        settingInfo,
        clearFn,
    } = useModel('businessDetail');

    const prevScope = (window as any).__PREV_SCOPE__;
    const curScope = getRouteScope(location.pathname);

    console.log(444000, searchParams, prevScope, curScope)

    // console.log(444, searchParams)

    useEffect(() => {
        // 不是同一个 businessId → 清空
        if (
            prevScope?.type !== 'businessDetail' ||
            prevScope.businessId !== curScope.businessId
        ) {
            clearFn();
        }
    }, [curScope.businessId]);

    // 获取检索数据
    const getSearchList = useCallback(async (values) => {
        setLoading(true)
        try {
            const searchdata = {
                ...values,
                sceneTemplateId: Number(params.id),
            }
            const result = await getSearchListApi(searchdata);
            if (result.totalElements) {
                saveList(formatBusinessSearchData(result.content || []), result.totalElements);
            } else {
                saveList([], 0)
            }
        } catch (error) {
            message.error('获取数据失败');
        } finally {
            setLoading(false);
        }
    }, [searchParams]);

    // 点击查询后的检索
    const handleSearch = useCallback((values) => {
        saveSearchParams({
            ...values,
            pageNumber: 1,
            pageSize: searchParams.pageSize,
        });
        const { searchKnowledgeItem = [], ...valueOthers } = values;
        if (!!selectedKey) {
            const [sceneItemId, _, id] = selectedKey?.split('-');
            searchKnowledgeItem.push({
                sceneItemId: sceneItemId,
                sceneItemSelectDictIds: id,
            })
        }

        getSearchList({
            ...valueOthers,
            searchKnowledgeItem,
            pageNumber: 1,
            pageSize: searchParams.pageSize,
        })
    }, [searchParams, selectedKey])

    // 目录树修改后的检索
    const handleTreeChange = useCallback((value) => {
        const { searchKnowledgeItem = [] } = searchRef?.current?.getCurrentValues();
        const { pageNumber, ...other } = searchParams;

        if (!!value) {
            const [sceneItemId, _, id] = value?.split('-');
            searchKnowledgeItem.push({
                sceneItemId: sceneItemId,
                sceneItemSelectDictIds: id,
            })
        }

        saveSearchParams({
            ...searchParams,
            pageNumber: 1,
        });

        getSearchList({
            ...other,
            searchKnowledgeItem,
            pageNumber: 1,
            pageSize: searchParams.pageSize,
        })
    }, [searchParams, searchRef])

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
    }, [searchParams]);

    // 刷新
    const handleRefresh = useCallback((type?: string) => {
        const { searchKnowledgeItem = [] } = searchRef?.current?.getCurrentValues();
        const { pageNumber, ...other } = searchParams;

        if (!!selectedKey) {
            const [sceneItemId, _, id] = selectedKey?.split('-');
            searchKnowledgeItem.push({
                sceneItemId: sceneItemId,
                sceneItemSelectDictIds: id,
            })
        }

        getSearchList({
            searchKnowledgeItem,
            ...other,
            pageNumber: type === 'del' && list?.length === 1 ? 1 : searchParams.pageNumber,
        })
    }, [searchRef, searchParams, selectedKey, list]);

    // 分页
    const handlePageChange = useCallback(({ page, pageSize }: { page: number, pageSize: number }) => {
        const { searchKnowledgeItem = [] } = searchRef?.current?.getCurrentValues();
        const { pageNumber, ...other } = searchParams;

        saveSearchParams({
            ...searchParams,
            pageNumber: page,
            pageSize: pageSize,
        });
        if (!!selectedKey) {
            const [sceneItemId, _, id] = selectedKey?.split('-');
            searchKnowledgeItem.push({
                sceneItemId: sceneItemId,
                sceneItemSelectDictIds: id,
            })
        }

        getSearchList({
            searchKnowledgeItem,
            ...other,
            pageNumber: page,
            pageSize: pageSize,
        })
    }, [searchRef, searchParams, selectedKey]);

    useEffect(() => {
        getBusinessData();
        const pms = searchParams;
        if (!!selectedKey) {
            const [sceneItemId, _, id] = selectedKey?.split('-');
            const searchKnowledgeItem = pms.searchKnowledgeItem || [];
            searchKnowledgeItem.push({
                sceneItemId: sceneItemId,
                sceneItemSelectDictIds: id,
            })
            pms.searchKnowledgeItem = searchKnowledgeItem;
        }
        getSearchList(pms)
    }, []);

    return (
        <PageContainer className='budiness-detail'>
            <section className="h-full w-full flex gap-16 items-stretch">
                {
                    infoLoading ? (
                        <Spin className='w-full h-[200px] flex justify-center items-center' />
                    ) : (
                        <>
                            {treeData && treeData?.length > 0 && (
                                <>
                                    <div className='w-[200px] shrink-0 py-24 px-8'>
                                        <TreeComp
                                            selectedKey={selectedKey}
                                            setSelectedKey={setSelectedKey}
                                            treeData={treeData}
                                            handleTreeChange={handleTreeChange} />
                                    </div>
                                    <Divider type="vertical" style={{ marginInline: 0 }} className='h-full' />
                                </>
                            )}
                            <div className='flex-1 overflow-x-hidden pr-16'>
                                <BusinessSearchPanel
                                    sceneData={sceneData}
                                    handleSearch={handleSearch}
                                    ref={searchRef} />
                                <BusinessTable
                                    businessId={params.id}
                                    list={list}
                                    total={total}
                                    loading={loading}
                                    pageSize={searchParams.pageSize}
                                    pageNumber={searchParams.pageNumber}
                                    getSearchList={getSearchList}
                                    sceneData={sceneData}
                                    handleRefresh={handleRefresh}
                                    handlePageChange={handlePageChange}
                                    isDisabled={detail?.sceneIsDisabled || false} />
                            </div>
                        </>
                    )
                }

                <BusinessSetting
                    open={settingOpen}
                    info={settingInfo}
                    setOpen={setSettingOpen}
                    handleRefresh={handleRefresh} />
            </section>
        </PageContainer>
    );
};
export default Detail;