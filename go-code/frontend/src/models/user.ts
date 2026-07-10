import { DictListParams } from '@/pages/System/Dict/types';
import { useCallback, useState } from 'react';

const useUser = () => {
  const [searchParams, setSearchParams] = useState<DictListParams>({
    pageSize: 10,
    pageNumber: 1,
  });
  const [list, setList] = useState(null);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const [openRole, setOpenRole] = useState<boolean>(false);
  const [openRoleInfo, setOpenRoleInfo] = useState<any>(null);

  const saveList = useCallback((data: any, total: number) => {
    setList(data);
    setTotal(total);
  }, []);

  const saveSearchParams = useCallback((data: DictListParams) => {
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

    openRole,
    setOpenRole,

    openRoleInfo,
    setOpenRoleInfo,
  };
};

export default useUser;
