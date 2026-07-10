import React, { useCallback, useEffect, useState } from 'react';
import { Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import { colors } from '@/constants/config';

interface Props {
    loading: boolean;
    data: any;
    [x: string]: any
}
const CreatorChart: React.FC<Props> = ({
    loading,
    data,
}) => {
    const options = {
        color: colors,

        tooltip: {
            trigger: 'item'
        },
        grid: { top: 0, right: 20, bottom: 20, left: 20, containLabel: true },
        legend: {
            type: 'scroll',
            top: 'bottom',
        },
        series: [
            {
                name: '知识创建人',
                type: 'pie',
                radius: ['40%', '70%'],
                data: data.map(item => ({ value: item.knowledgeNum, name: item.creatorName })),
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowOffsetX: 0,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };

    return (
        <Spin spinning={loading}>
            <div className='h-[500px]'>
                <ReactECharts option={options} lazyUpdate={true} className="h-full" />
            </div>

        </Spin>
    );
};
export default CreatorChart;