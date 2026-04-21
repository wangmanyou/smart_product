import React from 'react';
import { Spin } from 'antd';
import ReactECharts from 'echarts-for-react';
import { colors } from '@/constants/config';

const formatData = (data: any) => {
    const names: string[] = [];
    const values: number[] = [];
    data.forEach(item => {
        names.push(item.sceneName);
        values.push(item.knowledgeViewTimeCount);
    })
    return { names, values };
}
interface Props {
    loading: any;
    data: any;
    [x: string]: any
}
const ClickChart: React.FC<Props> = ({
    loading,
    data,
}) => {

    const {names, values} = formatData(data);

    const options = {
        color: colors[1],
        legend: {
            type: 'scroll',
            top: 'bottom',
        },
        toolbox: {
            show: true,
            feature: {
                mark: { show: true },
            }
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: { top: 20, right: 20, bottom: 20, left: 0, containLabel: true },
        xAxis: {
            type: 'category',
            data: names,
            axisTick: {
                alignWithLabel: true
            }
        },
        yAxis: {
            type: 'value'
        },
        series: [
            {
                type: 'bar',
                name: '历史点击量',
                data: values,
                label: {
                    show: true,
                    position: 'top',
                    align: 'center',
                    formatter: '{c}次'
                }
            },
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
export default ClickChart;