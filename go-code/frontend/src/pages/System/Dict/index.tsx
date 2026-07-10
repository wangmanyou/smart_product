import { useModel } from '@umijs/max';
import React, { useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';

import ListTable from './components/ListTable';
import SearchPanel from './components/Search';

import './index.less';

import { getDictListApi, setActionDisabledApi } from '@/services/system/dict';

import { DictListParams } from './types';

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
  } = useModel('dict');

  // 获取列表
  const getDictList = useCallback(
    async (params: DictListParams) => {
      const { pageSize, pageNumber } = searchParams;
      const nowps = {
        pageSize,
        pageNumber,
        ...params,
      }
      saveSearchParams(nowps);
      setLoading(true);
      try {
        
        const nowps = {
          pageSize,
          pageNumber,
          ...params,
        }
        const data = await getDictListApi(nowps);
        saveList(data?.content || null, data?.totalElements || 0);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    },
    [searchParams],
  );

  // 停用|启用
  const handleActionDisabled = useCallback(
    async (id: number, status: any) => {
      try {
        await setActionDisabledApi({
          id,
          isDisabled: status,
        });
        getDictList({
          ...searchParams,
        });
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
    getDictList({
      ...searchParams,
    });
  }, []);

  return (
    <PageContainer>
      <section className="dict-page flex flex-col gap-y-24">
        <SearchPanel 
          getDictList={getDictList} />
        <ListTable
          list={list || []}
          total={total}
          loading={loading}
          page={searchParams.pageNumber || 1}
          pageSize={searchParams.pageSize || 10}
          getDictList={getDictList}
          handleActionDisabled={handleActionDisabled}
        />
      </section>
    </PageContainer>

  );
};
export default Page;
