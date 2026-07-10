import React, { useCallback, useEffect, useState } from 'react';
import { history, useParams } from '@umijs/max';
import { message, Spin } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';


import { DictType, ActionType } from '../types';

import DictForm from '../components/DictForm';

import { editDictApi, getDictDetailApi } from '@/services/system/dict'

import { formatTreeData, filterServerData } from '../dict';

import '../index.less';


type FieldType = {
  dictName: string;
  dictType: DictType;
  plane?: any;
};

const CreateForm: React.FC = ({ }) => {
  const params = useParams();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = useCallback(async (values: FieldType) => {
    const { dictName, dictType, plane, tree } = values;
    // 提交
    try {
      const nowparams: any = {
        dictName,
        // dictType,
        dictTemplateId: params?.id,
      }
      if (dictType === DictType.plane && plane && plane.length) {
        const planeDict = plane.map(item => {
          if (item.type !== 'server') {
            return {
              name: item.name,
            }
          }
          return null
        }).filter(item => !!item)
        if (planeDict && planeDict.length) {
          nowparams.planeDict = {
            planeDict,
          };
        }
      }
      if (dictType === DictType.tree && tree && tree.length) {
        const treeDict = filterServerData(tree);
        if (treeDict && treeDict.length) {
          nowparams.treeDict = treeDict;
        }
      }
      await editDictApi(nowparams);
      message.success('编辑成功');
      history.push('/system/dict');
    } catch (error) {
      message.error('编辑失败');
    }
  }, [params.id]);


  // 获取详情
  const getDictDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await getDictDetailApi(id);
      const { dictTemplate, planeDict, treeDict} = res || {};
      const formdata = {
        dictName: dictTemplate.dictName,
        dictType: dictTemplate.dictType,
      }
      if (formdata.dictType === DictType.plane) {
        formdata.plane = planeDict?.planeDict.map((item: any, index: number) => ({
          ...item,
          contentId: item.id,
          id: Number(`${Date.now()}${index}`),
          originName: item.name,
          hasSaved: true,
          type: 'server',
        }))
      } else if (formdata.dictType === DictType.tree) {
        formdata.tree = formatTreeData(treeDict?.treeDict || []);
      }
      setDetail(formdata);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params?.id) {
      getDictDetail(params!.id);
    }
  }, [params.id]);


  return (
    <PageContainer>
      <div className="h-full overflow-y-auto bg-white dict-action-page">
        <div className="w-[600px] m-auto pb-24 pt-48">
          {
            loading || !detail ? (
              <Spin spinning={true} className='w-full'/>
            ) : (
              <DictForm
                sourceType={ActionType.edit}
                initialValues={detail}
                handleSubmit={handleSubmit}
                dictTemplateId={params.id} />
            )
          }
        </div>
      </div>
    </PageContainer>

  );
};

export default CreateForm;