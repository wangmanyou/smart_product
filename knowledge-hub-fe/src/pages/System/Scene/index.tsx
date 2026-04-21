import { useModel } from '@umijs/max';
import React, { useCallback, useEffect } from 'react';
import { PageContainer } from '@ant-design/pro-layout';

import ListTable from './components/ListTable';
import SearchPanel from './components/SearchPanel';

import { getSceneListApi, setActionDisabledApi } from '@/services/system/scene';

import { SceneListParams } from './types';

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
  } = useModel('scene');

  // 获取列表
  const getSceneList = useCallback(
    async (params: SceneListParams) => {
      saveSearchParams({
        ...searchParams,
        ...params,
      });
      setLoading(true);
      try {
        const data = await getSceneListApi({
          ...searchParams,
          ...params,
        });
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
        getSceneList({
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
    getSceneList({
      ...searchParams,
    });
  }, []);

  return (
    <PageContainer>
      <section className="dict-page flex flex-col gap-y-24">
        <SearchPanel getSceneList={getSceneList} />
        <ListTable
          list={list || []}
          total={total}
          loading={loading}
          page={searchParams.pageNumber || 1}
          pageSize={searchParams.pageSize || 10}
          getSceneList={getSceneList}
          handleActionDisabled={handleActionDisabled}
        />
      </section>
    </PageContainer>

  );
};
export default Page;
