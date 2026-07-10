import { SceneListParams } from '@/pages/System/Scene/types';
import { useCallback, useState } from 'react';

const useScene = () => {
  const [searchParams, setSearchParams] = useState<SceneListParams>({
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

  const saveSearchParams = useCallback((data: SceneListParams) => {
    setSearchParams(data);
  }, []);

  return {
    searchParams,
    saveSearchParams,
    saveList,
    list,
    total,
    loading,
    setLoading,
  };
};

export default useScene;
