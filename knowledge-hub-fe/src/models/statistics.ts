import { DictListParams } from '@/pages/System/Dict/types';
import { useCallback, useState } from 'react';

const useStatistics = () => {
  const [searchParams, setSearchParams] = useState<DictListParams>({
    pageSize: 10,
    pageNumber: 1,
  });
  const [list, setList] = useState(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const saveList = useCallback((data: any, total: number) => {
    setList(data);
    setTotal(total);
  }, []);

  const saveSearchParams = useCallback((data: DictListParams) => {
    setSearchParams(data);
  }, []);

  const clearFn = useCallback(() => {
    setSearchParams({
      pageSize: 10,
      pageNumber: 1,
    });
    setList(null);
    setTotal(0);
    setLoading(false);
  }, []);

  return {
    searchParams,
    saveSearchParams,
    saveList,
    list,
    total,
    loading,
    setLoading,
    clearFn,
  };
};

export default useStatistics;
