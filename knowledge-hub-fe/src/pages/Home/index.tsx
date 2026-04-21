import React, { useEffect, useState, useCallback } from 'react';
import { Row, Col, Card, DatePicker, Select } from 'antd';
import { PageContainer } from '@ant-design/pro-components';
import { Link } from '@umijs/max';

import type { GetProps } from 'antd';
import dayjs from 'dayjs';

import CountChart from '@/pages/Statistics/Count/components/CountChart';
// import ClickChart from '@/pages/Statistics/Clicks/components/ClickChart';
import HistoryCountChart from '@/pages/Statistics/HistoryClicks/components/HistoryClickChart';
import CreatorChart from '@/pages/Statistics/Creators/components/CreatorChart';

import { getSceneListApi, getCountApi, getCreatorApi } from '@/services/statistics';

type RangePickerProps = GetProps<typeof DatePicker.RangePicker>;

const { RangePicker } = DatePicker;

const HomePage: React.FC = () => {

  const [rangeTime, setRangeTime] = useState<RangePickerProps['value']>([dayjs(new Date()).startOf('month').startOf('day'), dayjs(new Date()).endOf('day')]);
  const [sceneList, setSceneList] = useState<any[]>([]);
  const [currentScene, setCurrentScene] = useState<string>('all');
  const onRangePickerChange = (value: RangePickerProps['value']) => {
    setRangeTime(value);
  };
  const [countData, setCountData] = useState<any>([]);
  const [countLoading, setCountLoading] = useState<boolean>(false);

  const [creatorData, setCreatorData] = useState<any>([]);
  const [creatorLoading, setCreatorLoading] = useState<boolean>(false);

  // 获取场景列表
  const getSceneList = useCallback(async () => {

    try {
      const data = await getSceneListApi({
        pageSize: 9999,
        pageNumber: 1,
      });
      setSceneList([
        { sceneName: '全部', sceneTemplateId: 'all' },
        ...(data?.content || [])
      ]);
    } catch (error) {
      console.log(error);
    }
  }, []);

  // 获取知识数据和历史点击量数据
  const getCountAndClick = useCallback(async () => {
    setCountLoading(true)
    try {
      // 获取知识数据
      const params: Record<string, any> = {}
      if(rangeTime && rangeTime.length) {
        params.searchCreateTime = [dayjs(rangeTime[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss'), dayjs(rangeTime[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss')];
      }
      const data = await getCountApi(params);
      if(data?.totalElements) {
        setCountData(data.content);
      } else {
        setCountData([]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setCountLoading(false)
    }
  }, [rangeTime]);

  // 获取知识创建人列表
  const getCreator = useCallback(async () => {
    setCreatorLoading(true)
    try {
      const params: Record<string, any> = {}
      if(rangeTime && rangeTime.length) {
        params.searchCreateTime = [dayjs(rangeTime[0]).startOf('day').format('YYYY-MM-DD HH:mm:ss'), dayjs(rangeTime[1]).endOf('day').format('YYYY-MM-DD HH:mm:ss')];
      }
      if(currentScene && currentScene !== 'all') {
        params.sceneTemplateId = currentScene;
      }
      const data = await getCreatorApi(params);
      if(data?.totalElements) {
        setCreatorData(data.content);
      } else {
        setCreatorData([]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setCreatorLoading(false)
    }
  }, [rangeTime, currentScene]);

  useEffect(() => {
    getSceneList();
  }, []);

  useEffect(() => {
    getCountAndClick();
    getCreator();
  }, [rangeTime]);


  useEffect(() => {
    getCreator();
  }, [currentScene]);


  return (
    <PageContainer header={{ title: false, breadcrumb: false }}>
      <div className={'w-full'}>
        <Row gutter={[16, 16]} align="stretch">
          <Col span={24}>
            <div className='flex justify-between'>
              <h1 className='text-2xl'>欢迎登录知识管理系统</h1>
              <RangePicker value={rangeTime} onChange={onRangePickerChange} />
            </div>
          </Col>
          <Col sm={24} xl={12} >
            <Card
              className='h-full'
              title={<Link to="/statistics/count">知识数量统计</Link>}
            >
              <CountChart loading={countLoading} data={countData} />
            </Card>
          </Col>
          {/* <Col sm={24} xl={12}>
            <Card
              className='h-full'
              title={<Link to="/statistics/count">知识点击量统计</Link>}
            >
              <ClickChart loading={countLoading} data={countData} />
            </Card>
          </Col> */}
          <Col sm={24} xl={12}>
            <Card
              className='h-full'
              title={<Link to="/statistics/count">知识历史点击量统计</Link>}
            >
              <HistoryCountChart loading={countLoading} data={countData} />
            </Card>
          </Col>
          <Col sm={24} xl={12}>
            <Card
              className='h-full'
              title={<Link to="/statistics/count">知识创建人统计</Link>}
              extra={<Select
                style={{ width: '200px' }}
                fieldNames={{ label: 'sceneName', value: 'sceneTemplateId' }}
                options={sceneList}
                value={currentScene}
                onChange={setCurrentScene} />}
            >
              <CreatorChart loading={creatorLoading} data={creatorData} />
            </Card>
          </Col>
        </Row>
      </div>
    </PageContainer>
  );
};

export default HomePage;
