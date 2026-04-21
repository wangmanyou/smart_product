import { useModel } from '@umijs/max';
import React, { useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';

import dayjs from 'dayjs';

import ListTable from './components/ListTable';
import SearchPanel from './components/Search';


import { getCountApi } from '@/services/statistics';


interface Props {
  [x: string]: any;
}
const Page: React.FC<Props> = () => {
  const {
    searchParams,
    saveSearchParams,
    list,
    saveList,
    setLoading,
    total,
    loading,
    clearFn,
  } = useModel('statistics');

  // 获取列表
  const getList = useCallback(
    async (params: any) => {
      const nowps = {
        ...params,
      }
      saveSearchParams(nowps);
      setLoading(true);
      try {
        
        const nowps = {
          ...params,
        }
        const data = await getCountApi(nowps);
        saveList(data?.content || null, data?.totalElements || 0);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [searchParams],
  );

  // 初始化
  useEffect(() => {
    getList({
      ...searchParams,
      searchCreateTime: [dayjs(new Date()).startOf('month').startOf('day').format('YYYY-MM-DD HH:mm:ss'), dayjs(new Date()).endOf('day').format('YYYY-MM-DD HH:mm:ss')],
    });
    return () => {
        clearFn()
    }
  }, []);

  return (
    <PageContainer>
      <section className="dict-page flex flex-col gap-y-24">
        <SearchPanel 
          getList={getList} />
        <ListTable
          list={list || []}
          total={total}
          loading={loading}
          page={searchParams?.pageNumber || 1}
          pageSize={searchParams?.pageSize || 10}
          getList={getList}
        />
      </section>
    </PageContainer>

  );
};
export default Page;
