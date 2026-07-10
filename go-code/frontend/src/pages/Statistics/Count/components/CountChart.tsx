import React from 'react';
import { Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import { colors } from '@/constants/config';

interface Props {
    loading: boolean;
    data: any;
    [x: string]: any
}
const CountChart: React.FC<Props> = ({
    loading,
    data,
}) => {
    const options = {
        color: colors,
        legend: {
            type: 'scroll',
            top: 'bottom',
        },
        grid: { top: 0, right: 20, bottom: 20, left: 20, containLabel: true },
        toolbox: {
            show: true,
            feature: {
                mark: { show: true },
            }
        },
        tooltip: {
            trigger: 'item'
        },
        series: [
            {
                name: '知识数量',
                type: 'pie',
                radius: [20, 150],
                center: ['50%', '50%'],
                roseType: 'area',
                itemStyle: {
                    borderRadius: 8
                },
                data: data.map(item => ({ value: item.knowledgeNum, name: item.sceneName }))
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
export default CountChart;