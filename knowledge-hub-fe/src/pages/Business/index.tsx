import React, { useEffect, useCallback } from 'react';
import { useModel } from '@umijs/max';
import { PageContainer } from '@ant-design/pro-layout';

import SearchPanel from './components/SearchPanel';
import List from './components/List';

import { BusinessListParams } from './types';
import { getSceneListApi } from '@/services/system/scene';

interface Props {
    [x: string]: any
}

const BusinessList: React.FC<Props> = () => {
    const {
        searchParams,
        saveSearchParams,
        list,
        saveList,
        setLoading,
        total,
        loading,
    } = useModel('business');

    // 获取列表
    const getList = useCallback(
        async (params: BusinessListParams) => {
            console.log(3333, searchParams, params)
            saveSearchParams({
                ...searchParams,
                ...params,
            });
            setLoading(true);
            try {
                const reqParams = {
                    ...searchParams,
                    ...params,
                };
                const data = await getSceneListApi(reqParams);
                saveList(data?.content || null, data?.totalElements || 0, reqParams.pageNumber);
            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        },
        [searchParams],
    );

    // 加载更多
    const getListMore = useCallback(
        async (params: BusinessListParams) => {
            getList({
                ...searchParams,
                ...params,
            })
        },
        [searchParams],
    );

    // 初始化
    useEffect(() => {
        if(total && list?.length) {
            return;
        }
        getList({
            ...searchParams,
        });
    }, []);

    return (
        <PageContainer>
            <section className="flex flex-col gap-y-24 overflow-y-hidden h-full">
                <div>
                    <SearchPanel 
                        searchParams={searchParams}
                        saveSearchParams={saveSearchParams}
                        getList={getList} />
                </div>
                <div className='flex-1 overflow-y-auto'>
                    <List
                        pageSize={searchParams.pageSize || 20}
                        pageNumber={searchParams.pageNumber || 1}
                        total={total}
                        loading={loading}
                        list={list || []}
                        getListMore={getListMore} />
                </div>

            </section>
        </PageContainer>
    );
};
export default BusinessList;