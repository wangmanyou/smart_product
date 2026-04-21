import React, { useCallback } from 'react';
import { history } from '@umijs/max';
import { message } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';

import { DictType, ActionType } from '../types';

import DictForm from '../components/DictForm';

import { createDictApi } from '@/services/system/dict'

import { filterServerData } from '../dict';

import '../index.less';

const CreateForm: React.FC = ({ }) => {

    const handleSubmit = useCallback(async (values: any) => {
        console.log('create', values);
        // 提交
        try {
            const { dictName, dictType, plane, tree } = values;
            const params: any = {
                dictName,
                dictType,
            }
            if (dictType === DictType.plane && plane && plane.length) {
                const planeDict = plane.map(item => ({
                    name: item.name,
                }))
                params.planeDict = {
                    planeDict: planeDict,
                }
            }
            if (dictType === DictType.tree && tree && tree.length) {
                const treeDict = filterServerData(tree);
                if (treeDict && treeDict.length) {
                    params.treeDict = treeDict;
                }
            }
            await createDictApi(params);
            message.success('新增成功');
            history.push('/system/dict');
        } catch (error) {
            console.log(error);
            message.error('新增失败');
        }
    }, []);

    return (
        <PageContainer>
            <div className="h-full overflow-y-auto bg-white dict-action-page">
                <div className="w-[600px] m-auto pb-24 pt-48">
                    <DictForm
                        sourceType={ActionType.create}
                        initialValues={{
                            dictType: DictType.plane,
                        }}
                        handleSubmit={handleSubmit} />
                </div>
            </div>
        </PageContainer>

    );
};

export default CreateForm;