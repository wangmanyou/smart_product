import React from 'react';
import { Button, Row, Col, Card, Tag } from 'antd';
import InfiniteScroll from 'react-infinite-scroll-component';
import { history } from '@umijs/max';
import dayjs from 'dayjs';


interface Props {
    pageSize: number;
    total: number;
    pageNumber: number;
    list: any[];
    getList: (data: any) => void;
    [x: string]: any
}


const ListComp: React.FC<Props> = ({
    pageNumber,
    list,
    total,
    loading,
    getListMore,
}) => {
    const loadMoreData = () => {
        getListMore({
            pageNumber: pageNumber + 1,
        });
    };
    return (
        <div
            id="scrollableDiv"
            style={{
                height: '100%',
                overflowY: 'auto',
                overflowX: 'hidden',
            }}
        >
            <Row gutter={[16, 16]} align="stretch" className='p-4'>
                {
                    list.map((item, index) => (
                        <Col key={index} xs={24} sm={12} lg={6} xxl={4}
                            onClick={() => history.push(`/business/${item.sceneTemplateId}`)}>
                            <Card
                                title={
                                    <div className='w-full flex justify-between gap-8'>
                                        <span className='flex-1 whitespace-break-spaces'>{item.sceneName}</span>
                                        <span className='shrink-0'>{item.sceneIsDisabled ? <Tag color="red">已禁用</Tag> : <Tag color="success">正常</Tag>}</span>
                                    </div>
                                }
                                hoverable={true}>
                                <div className='w-full flex justify-between items-center gap-8'>
                                    <div className='whitespace-break-spaces'>
                                        {item.creatorName}
                                    </div>
                                    <div className='shrink-0'>
                                        {dayjs(item.updateTime * 1000).format('YYYY-MM-DD HH:mm:ss')}
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    ))
                }
            </Row>
            <div className='py-24 flex justify-center items-center'>
                {
                    !!list.length && list.length < total && (
                        <Button size="large" type='primary'
                            disabled={loading}
                            onClick={loadMoreData}
                            loading={loading}>
                            加载更多
                        </Button>
                    )
                }
            </div>
        </div>
    );
};
export default ListComp;