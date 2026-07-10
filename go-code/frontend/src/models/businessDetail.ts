
import { useState, useCallback } from 'react';

const useBusiness = () => {
    const [selectedKey, setSelectedKey] = useState<string>();

    // 目录数据
    const [treeData, setTreeData] = useState(null);

    // 场景item数据
    const [sceneData, setSceneData] = useState(null);

    // 业务数据(也就是场景的数据)
    const [detail, setDetail] = useState(null);

    const [infoLoading, setInfoLoading] = useState(false);

    const [searchParams, setSearchParams] = useState<any>({
        pageSize: 10,
        pageNumber: 1,
    });
    const [list, setList] = useState(null);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);

    const [settingOpen, setSettingOpen] = useState(false);
    const [settingInfo, setSettingInfo] = useState<any>(null);

    const saveList = useCallback((data: any, total: number) => {
        
        setList(data);
        setTotal(total);
    }, []);

    const saveSearchParams = useCallback((data: any) => {
        setSearchParams(data);
    }, []);


    const clearFn = useCallback(() => {
        setSelectedKey('');
        setTreeData(null);
        setSceneData(null);
        setDetail(null);
        setInfoLoading(false);
        setSearchParams({
            pageSize: 10,
            pageNumber: 1,
        });
        setList(null);
        setTotal(0);
        setLoading(false);
        setSettingOpen(false);
        setSettingInfo(null);
    }, []);



    return {
        selectedKey,
        setSelectedKey,

        searchParams,
        saveSearchParams,
        saveList,
        list,
        total,
        loading,
        setLoading,

        treeData,
        setTreeData,

        sceneData,
        setSceneData,

        detail,
        setDetail,

        infoLoading,
        setInfoLoading,

        settingOpen,
        setSettingOpen,
        settingInfo,
        setSettingInfo,

        clearFn,
    };
};

export default useBusiness;
