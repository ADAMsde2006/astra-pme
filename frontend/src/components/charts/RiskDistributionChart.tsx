import React from 'react';
import ReactECharts from 'echarts-for-react';

interface RiskDistributionChartProps {
  summary: {
    critical_risk_count: number;
    high_risk_count: number;
    moderate_risk_count: number;
    low_risk_count: number;
  };
  height?: string;
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ summary, height = '220px' }) => {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#252526',
      borderColor: '#3e4451',
      textStyle: { color: '#cccccc', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 },
      formatter: '{b}: <span style="font-weight:bold">{c} projects</span> ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'middle',
      textStyle: { color: '#cccccc', fontSize: 11, fontFamily: 'Inter, sans-serif' },
      icon: 'circle'
    },
    series: [
      {
        name: 'Risk Level',
        type: 'pie',
        radius: ['50%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            color: '#ffffff',
            formatter: '{d}%'
          }
        },
        data: [
          { value: summary.critical_risk_count, name: 'Critical Risk (>=80%)', itemStyle: { color: '#ef4444' } },
          { value: summary.high_risk_count, name: 'High Risk (60-79%)', itemStyle: { color: '#f97316' } },
          { value: summary.moderate_risk_count, name: 'Moderate Risk (35-59%)', itemStyle: { color: '#eab308' } },
          { value: summary.low_risk_count, name: 'Low Risk (<35%)', itemStyle: { color: '#22c55e' } }
        ]
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};
