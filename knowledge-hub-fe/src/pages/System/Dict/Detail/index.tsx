import { history, useParams } from '@umijs/max';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Col, Result, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';
import dayjs from 'dayjs';

import { getDictDetailApi } from '@/services/system/dict';

import { DictTypeMap } from '../constants';
import { DictType } from '../types';
import { removeEmptyChildren } from '../dict';

import DetailTable from './Table';

interface Props {
  [x: string]: any;
}
const DictDetail: React.FC<Props> = () => {
  const params = useParams();
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);

  // 获取详情
  const getDictDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await getDictDetailApi(id);
      const { dictTemplate, planeDict, treeDict } = res || {};
      setDetail({
        dictTemplate,
        planeDict: planeDict?.planeDict || [],
        treeDict: treeDict?.treeDict ? removeEmptyChildren(treeDict?.treeDict) : [],
      });
      setIsEmpty(false);
    } catch (error) {
      console.log(error);
      setIsEmpty(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (params?.id) {
      getDictDetail(params!.id);
    }
  }, [params.id]);

  const { dictTemplate, planeDict, treeDict } = detail || {};

  return (
    <PageContainer>
      <div className="h-full bg-white overflow-y-auto">
        <div className="w-[600px] m-auto pb-24 pt-48">
          <Spin spinning={loading}>
            {isEmpty ? (
              <div>
                <Result
                  status="404"
                  title="未找到相应数据"
                  extra={
                    <Button
                      type="primary"
                      onClick={() => history.push('/system/dict')}
                    >
                      返回列表页
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-16">
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    目录名称：
                  </Col>
                  <Col span={20} className="font-bold">
                    {dictTemplate?.dictName}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    目录类型：
                  </Col>
                  <Col span={20} className="font-bold">
                    {DictTypeMap[dictTemplate?.dictType]}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    目录状态：
                  </Col>
                  <Col span={20} className="font-bold">
                    {dictTemplate?.dictDisabled ? (
                      <Tag color="red">禁用</Tag>
                    ) : (
                      <Tag color="success">正常</Tag>
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    创建人：
                  </Col>
                  <Col span={20} className="font-bold">
                    {dictTemplate?.creatorName}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    更新时间：
                  </Col>
                  <Col span={20} className="font-bold">
                    {dayjs(dictTemplate?.updateTime * 1000).format('YYYY-MM-DD HH:mm:ss')}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    目录内容：
                  </Col>
                  <Col span={24} className="pt-16">
                    <DetailTable
                      data={dictTemplate?.dictType === DictType.plane ? planeDict : dictTemplate?.dictType === DictType.tree ? treeDict : []} />
                  </Col>
                </Row>
              </div>
            )}
          </Spin>
        </div>
      </div>
    </PageContainer>


  );
};
export default DictDetail;
