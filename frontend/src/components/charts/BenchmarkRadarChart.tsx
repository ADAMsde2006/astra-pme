import React from 'react';
import ReactECharts from 'echarts-for-react';

interface BenchmarkRadarChartProps {
  currentProject: {
    cost_escalation_pct: number;
    expenditure_ratio: number;
    physical_progress_pct: number;
    overall_risk: number;
  };
  cohortBenchmarks: {
    cost_escalation_pct: { median: number; p75: number };
    expenditure_ratio: { median: number; p75: number };
    physical_progress_pct: { median: number; p75: number };
    overall_risk: { median: number; p75: number };
  };
  height?: string;
}

export const BenchmarkRadarChart: React.FC<BenchmarkRadarChartProps> = ({
  currentProject,
  cohortBenchmarks,
  height = '280px'
}) => {
  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#252526',
      borderColor: '#3e4451',
      textStyle: { color: '#cccccc', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }
    },
    legend: {
      data: ['Current Project', 'Cohort Median', 'Cohort 75th Percentile'],
      textStyle: { color: '#858585', fontSize: 11 },
      bottom: 0,
      icon: 'circle'
    },
    radar: {
      indicator: [
        { name: 'Overall Risk (%)', max: 100 },
        { name: 'Physical Progress (%)', max: 100 },
        { name: 'Expenditure Ratio (%)', max: 150 },
        { name: 'Cost Escalation (%)', max: 100 }
      ],
      shape: 'polygon',
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(45, 49, 57, 0.2)', 'rgba(45, 49, 57, 0.4)']
        }
      },
      axisLine: { lineStyle: { color: '#3e4451' } },
      splitLine: { lineStyle: { color: '#2d3139' } },
      axisName: { color: '#cccccc', fontSize: 11 }
    },
    series: [
      {
        name: 'Benchmark Comparison',
        type: 'radar',
        data: [
          {
            value: [
              currentProject.overall_risk,
              currentProject.physical_progress_pct,
              Math.min(150, currentProject.expenditure_ratio * 100),
              Math.min(100, Math.max(0, currentProject.cost_escalation_pct))
            ],
            name: 'Current Project',
            itemStyle: { color: '#007acc' },
            areaStyle: { color: 'rgba(0, 122, 204, 0.3)' }
          },
          {
            value: [
              cohortBenchmarks.overall_risk.median,
              cohortBenchmarks.physical_progress_pct.median,
              Math.min(150, cohortBenchmarks.expenditure_ratio.median * 100),
              Math.min(100, Math.max(0, cohortBenchmarks.cost_escalation_pct.median))
            ],
            name: 'Cohort Median',
            itemStyle: { color: '#22c55e' },
            lineStyle: { type: 'dashed' }
          },
          {
            value: [
              cohortBenchmarks.overall_risk.p75,
              cohortBenchmarks.physical_progress_pct.p75,
              Math.min(150, cohortBenchmarks.expenditure_ratio.p75 * 100),
              Math.min(100, Math.max(0, cohortBenchmarks.cost_escalation_pct.p75))
            ],
            name: 'Cohort 75th Percentile',
            itemStyle: { color: '#f97316' },
            lineStyle: { type: 'dotted' }
          }
        ]
      }
    ]
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} />;
};
