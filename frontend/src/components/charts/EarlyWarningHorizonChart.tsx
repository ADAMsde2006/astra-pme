import React from 'react';
import ReactECharts from 'echarts-for-react';

interface EarlyWarningHorizonChartProps {
  currentRisk: number;
  h3m: { forecast_score: number; uncertainty_band: [number, number] };
  h6m: { forecast_score: number; uncertainty_band: [number, number] };
  h12m: { forecast_score: number; uncertainty_band: [number, number] };
  height?: string;
}

export const EarlyWarningHorizonChart: React.FC<EarlyWarningHorizonChartProps> = ({
  currentRisk,
  h3m,
  h6m,
  h12m,
  height = '240px'
}) => {
  const horizons = ['Current (Jul 26)', '+3 Months', '+6 Months', '+12 Months'];
  const scores = [currentRisk, h3m.forecast_score, h6m.forecast_score, h12m.forecast_score];
  const lowerBounds = [currentRisk, h3m.uncertainty_band[0], h6m.uncertainty_band[0], h12m.uncertainty_band[0]];
  const upperBounds = [currentRisk, h3m.uncertainty_band[1], h6m.uncertainty_band[1], h12m.uncertainty_band[1]];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#252526',
      borderColor: '#3e4451',
      textStyle: { color: '#cccccc', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
      formatter: (params: any) => {
        const idx = params[0].dataIndex;
        return `<div>
          <div style="font-weight:bold">${horizons[idx]}</div>
          <div style="margin-top:4px">Projected Risk: <span style="font-weight:bold">${scores[idx].toFixed(1)}%</span></div>
          <div style="font-size:11px;color:#858585">Uncertainty Band: [${lowerBounds[idx]}% - ${upperBounds[idx]}%]</div>
        </div>`;
      }
    },
    grid: {
      top: '15%',
      left: '3%',
      right: '5%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: horizons,
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
        name: 'Forecast Risk',
        type: 'line',
        data: scores,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#f97316' },
        itemStyle: { color: '#f97316' }
      },
      {
        name: 'Upper Bound',
        type: 'line',
        data: upperBounds,
        lineStyle: { opacity: 0 },
        stack: 'uncertainty',
        symbol: 'none'
      },
      {
        name: 'Lower Bound',
        type: 'line',
        data: lowerBounds.map((low, i) => upperBounds[i] - low),
        lineStyle: { opacity: 0 },
        areaStyle: { color: 'rgba(249, 115, 22, 0.15)' },
        stack: 'uncertainty',
        symbol: 'none'
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};
