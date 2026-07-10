import { BusinessListParams } from '@/pages/Business/types';
import { useCallback, useState } from 'react';

const useBusiness = () => {
    const [searchParams, setSearchParams] = useState<BusinessListParams>({
        pageSize: 50,
        pageNumber: 1,
    });
    const [list, setList] = useState(null);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const saveList = useCallback((data: any, total: number, current: number) => {
        setList(pre => {
            if (current === 1) {
                return data;
            }
            return [...(pre || []), ...(data || [])]
        });
        setTotal(total);
    }, []);

    const saveSearchParams = useCallback((data: BusinessListParams) => {
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

export default useBusiness;
