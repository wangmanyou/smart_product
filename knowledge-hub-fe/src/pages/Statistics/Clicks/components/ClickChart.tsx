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
        color: colors[0],
        legend: {
            type: 'scroll',
            top: 'bottom',
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: { top: 0, right: '5%', bottom: 20, left: 0, containLabel: true },
        xAxis: {
            type: 'value',
            boundaryGap: [0, 0.01]
        },
        yAxis: {
            data: names
        },
        series: [
            {
                type: 'bar',
                name: '知识点击量',
                data: values,
                label: {
                    show: true,
                    position: 'right',
                    align: 'left',
                    formatter: '{c}次'
                }
            },
        ]
    };
    const height = values.length < 10 ? 500 : values.length * 40;
    return (
        <Spin spinning={loading}>
            <div style={{height: height}}>
                <ReactECharts option={options} lazyUpdate={true} className="h-full" />
            </div>
        </Spin>
    );
};
export default ClickChart;