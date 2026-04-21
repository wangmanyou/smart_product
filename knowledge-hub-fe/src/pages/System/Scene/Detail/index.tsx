import { history, useParams } from '@umijs/max';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Col, Result, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@ant-design/pro-layout';
import dayjs from 'dayjs';

import { getSceneDetailApi } from '@/services/system/scene';


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
      const res = await getSceneDetailApi(id);
      setDetail(res);
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

  const { sceneTemplateDetail, sceneItem } = detail || {};

  return (
    <PageContainer>
      <div className="h-full bg-white overflow-y-auto">
        <div className="px-48 m-auto pb-24 pt-48">
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
                    场景名称：
                  </Col>
                  <Col span={20} className="font-bold">
                    {sceneTemplateDetail?.sceneName}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    场景状态：
                  </Col>
                  <Col span={20} className="font-bold">
                    {sceneTemplateDetail?.sceneIsDisabled ? (
                      <Tag color="red">禁用</Tag>
                    ) : (
                      <Tag color="success">正常</Tag>
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    使用状态：
                  </Col>
                  <Col span={20} className="font-bold">
                    {sceneTemplateDetail?.sceneIsUsed ? (
                      <Tag color="success">使用中</Tag>
                    ) : (
                      <Tag>未使用</Tag>
                    )}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    创建人：
                  </Col>
                  <Col span={20} className="font-bold">
                    {sceneTemplateDetail?.creatorName}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    更新时间：
                  </Col>
                  <Col span={20} className="font-bold">
                    {dayjs(sceneTemplateDetail?.updateTime * 1000).format('YYYY-MM-DD HH:mm:ss')}
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={4} className="text-left text-text-3">
                    场景内容：
                  </Col>
                  <Col span={24} className="pt-16">
                    <DetailTable
                      data={sceneItem || []} />
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
