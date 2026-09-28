import React from 'react';
import ReactECharts from 'echarts-for-react';

interface RiskTrajectoryChartProps {
  months: string[];
  overallRisks: number[];
  costRisks?: number[];
  scheduleRisks?: number[];
  implementationRisks?: number[];
  height?: string;
}

export const RiskTrajectoryChart: React.FC<RiskTrajectoryChartProps> = ({
  months,
  overallRisks,
  costRisks,
  scheduleRisks,
  implementationRisks,
  height = '280px'
}) => {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#252526',
      borderColor: '#3e4451',
      textStyle: { color: '#cccccc', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
      formatter: (params: any) => {
        let res = `<div style="font-weight:bold;margin-bottom:4px">${params[0].axisValue}</div>`;
        params.forEach((item: any) => {
          res += `<div style="display:flex;justify-content:space-between;gap:12px">
            <span>${item.marker} ${item.seriesName}:</span>
            <span style="font-family:monospace;font-weight:bold">${Number(item.value).toFixed(1)}%</span>
          </div>`;
        });
        return res;
      }
    },
    legend: {
      data: ['Overall Risk', 'Cost Risk', 'Schedule Risk', 'Implementation Risk'],
      textStyle: { color: '#858585', fontSize: 11, fontFamily: 'Inter, sans-serif' },
      bottom: 0,
      icon: 'circle'
    },
    grid: {
      top: '12%',
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: months,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#3e4451' } },
      axisLabel: { color: '#858585', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      splitLine: { lineStyle: { color: '#2d3139', type: 'dashed' } },
      axisLabel: {
        color: '#858585',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: 'Overall Risk',
        type: 'line',
        data: overallRisks,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3, color: '#007acc' },
        itemStyle: { color: '#007acc' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 122, 204, 0.25)' },
              { offset: 1, color: 'rgba(0, 122, 204, 0.0)' }
            ]
          }
        }
      },
      ...(costRisks ? [{
        name: 'Cost Risk',
        type: 'line',
        data: costRisks,
        smooth: true,
        symbol: 'emptyCircle',
        symbolSize: 5,
        lineStyle: { width: 1.5, color: '#f97316', type: 'dashed' },
        itemStyle: { color: '#f97316' }
      }] : []),
      ...(scheduleRisks ? [{
        name: 'Schedule Risk',
        type: 'line',
        data: scheduleRisks,
        smooth: true,
        symbol: 'emptyCircle',
        symbolSize: 5,
        lineStyle: { width: 1.5, color: '#eab308', type: 'dashed' },
        itemStyle: { color: '#eab308' }
      }] : []),
      ...(implementationRisks ? [{
        name: 'Implementation Risk',
        type: 'line',
        data: implementationRisks,
        smooth: true,
        symbol: 'emptyCircle',
        symbolSize: 5,
        lineStyle: { width: 1.5, color: '#a855f7', type: 'dashed' },
        itemStyle: { color: '#a855f7' }
      }] : [])
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};
