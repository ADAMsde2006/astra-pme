import React from 'react';
import ReactECharts from 'echarts-for-react';

interface DriverItem {
  feature: string;
  display_name: string;
  importance_weight: number;
  feature_value: number;
  direction: string;
  impact: string;
}

interface DriversBarChartProps {
  drivers: DriverItem[];
  height?: string;
}

export const DriversBarChart: React.FC<DriversBarChartProps> = ({ drivers, height = '260px' }) => {
  const sorted = [...drivers].reverse();
  const names = sorted.map(d => d.display_name);
  const weights = sorted.map(d => d.importance_weight);
  const colors = sorted.map(d => d.direction === 'INCREASES_RISK' ? '#ef4444' : '#22c55e');

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#252526',
      borderColor: '#3e4451',
      textStyle: { color: '#cccccc', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 },
      formatter: (params: any) => {
        const item = params[0];
        const driver = sorted[item.dataIndex];
        return `<div>
          <div style="font-weight:bold">${driver.display_name}</div>
          <div style="margin-top:4px;font-size:11px">Weight: <span style="font-weight:bold">${driver.importance_weight.toFixed(4)}</span></div>
          <div style="font-size:11px">Value: <span style="font-weight:bold">${driver.feature_value}</span></div>
          <div style="font-size:11px;color:${driver.direction === 'INCREASES_RISK' ? '#ef4444' : '#22c55e'}">
            [${driver.direction.replace('_', ' ')}]
          </div>
        </div>`;
      }
    },
    grid: {
      top: '5%',
      left: '3%',
      right: '8%',
      bottom: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#2d3139', type: 'dashed' } },
      axisLabel: { color: '#858585', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: '#3e4451' } },
      axisLabel: { color: '#cccccc', fontSize: 11, width: 160, overflow: 'truncate' }
    },
    series: [
      {
        name: 'Attribution Weight',
        type: 'bar',
        data: weights.map((w, idx) => ({
          value: w,
          itemStyle: { color: colors[idx], borderRadius: [0, 2, 2, 0] }
        })),
        barWidth: '55%'
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};
