import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { BenchmarkRadarChart } from '../components/charts/BenchmarkRadarChart';
import { ProjectLink } from '../components/common/ProjectLink';

export const BenchmarkingPage: React.FC = () => {
  const [projectCodeInput, setProjectCodeInput] = useState('612786');
  const [activeCode, setActiveCode] = useState(612786);
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getBenchmark(activeCode)
      .then(setBenchmarkData)
      .finally(() => setLoading(false));
  }, [activeCode]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = parseInt(projectCodeInput.trim().replace(/^#/, ''), 10);
    if (!isNaN(clean)) {
      setActiveCode(clean);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Historical & Peer Benchmarking
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Empirical cohort statistics (median, mean, percentiles) comparing project metrics against similar sector, agency, and state peers.
          </p>
        </div>

        {/* Project Selector */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter Project # (e.g. 612786)..."
            value={projectCodeInput}
            onChange={(e) => setProjectCodeInput(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2.5 py-1 text-[#cccccc] placeholder-[#666666] font-mono focus:outline-none focus:border-[#007acc]"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-[#007acc] text-white rounded text-xs font-mono font-bold hover:bg-[#0062a3]"
          >
            BENCHMARK
          </button>
        </form>
      </div>

      {loading ? (
        <div className="p-16 text-center font-mono text-xs text-[#858585]">
          [CALCULATING PEER GROUP COHORT DISTRIBUTIONS...]
        </div>
      ) : benchmarkData?.error ? (
        <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 font-mono text-xs rounded">
          {benchmarkData.error}
        </div>
      ) : (
        <div className="space-y-3">
          
          {/* Peer Cohort Meta Banner */}
          <div className="bg-[#252526] border border-[#2d3139] rounded p-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#858585]">Benchmarked Project:</span>
              <ProjectLink projectCode={benchmarkData.project_code} projectName={benchmarkData.project_name} showName />
            </div>
            <div className="flex items-center gap-3 text-[#858585]">
              <span>Cohort: <span className="text-white font-semibold">{benchmarkData.table_section}</span></span>
              <span>|</span>
              <span>Peers Sampled: <span className="text-[#007acc] font-bold">{benchmarkData.peer_count}</span></span>
            </div>
          </div>

          {/* Radar Chart & Metric Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            
            {/* Radar Comparison */}
            <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
              <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
                Multi-Dimensional Cohort Position
              </div>
              <BenchmarkRadarChart
                currentProject={benchmarkData.current_project}
                cohortBenchmarks={benchmarkData.cohort_benchmarks}
                height="260px"
              />
            </div>

            {/* Statistics Table */}
            <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
              <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
                Empirical Peer Benchmark Statistics
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-[#2d3139] text-[#858585]">
                    <tr>
                      <th className="pb-1.5">Metric</th>
                      <th className="pb-1.5 text-right">Project Value</th>
                      <th className="pb-1.5 text-right">Cohort Median</th>
                      <th className="pb-1.5 text-right">Cohort 75th %ile</th>
                      <th className="pb-1.5 text-right">Relative Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2d3139]/60">
                    <tr className="hover:bg-[#2a2d2e]/50">
                      <td className="py-2 text-[#cccccc] font-sans">Overall Risk Score</td>
                      <td className="py-2 text-right font-bold text-white">{benchmarkData.current_project.overall_risk}%</td>
                      <td className="py-2 text-right text-[#858585]">{benchmarkData.cohort_benchmarks.overall_risk.median}%</td>
                      <td className="py-2 text-right text-[#858585]">{benchmarkData.cohort_benchmarks.overall_risk.p75}%</td>
                      <td className="py-2 text-right text-[#007acc] font-bold">
                        {benchmarkData.relative_position.risk_percentile}th %ile
                      </td>
                    </tr>
                    <tr className="hover:bg-[#2a2d2e]/50">
                      <td className="py-2 text-[#cccccc] font-sans">Physical Progress</td>
                      <td className="py-2 text-right font-bold text-emerald-400">{benchmarkData.current_project.physical_progress_pct}%</td>
                      <td className="py-2 text-right text-[#858585]">{benchmarkData.cohort_benchmarks.physical_progress_pct.median}%</td>
                      <td className="py-2 text-right text-[#858585]">{benchmarkData.cohort_benchmarks.physical_progress_pct.p75}%</td>
                      <td className="py-2 text-right text-[#007acc] font-bold">
                        {benchmarkData.relative_position.progress_percentile}th %ile
                      </td>
                    </tr>
                    <tr className="hover:bg-[#2a2d2e]/50">
                      <td className="py-2 text-[#cccccc] font-sans">Cost Escalation</td>
                      <td className="py-2 text-right font-bold text-white">{benchmarkData.current_project.cost_escalation_pct}%</td>
                      <td className="py-2 text-right text-[#858585]">{benchmarkData.cohort_benchmarks.cost_escalation_pct.median}%</td>
                      <td className="py-2 text-right text-[#858585]">{benchmarkData.cohort_benchmarks.cost_escalation_pct.p75}%</td>
                      <td className="py-2 text-right text-[#007acc] font-bold">
                        {benchmarkData.relative_position.cost_escalation_percentile}th %ile
                      </td>
                    </tr>
                    <tr className="hover:bg-[#2a2d2e]/50">
                      <td className="py-2 text-[#cccccc] font-sans">Expenditure Ratio</td>
                      <td className="py-2 text-right font-bold text-white">{(benchmarkData.current_project.expenditure_ratio * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-[#858585]">{(benchmarkData.cohort_benchmarks.expenditure_ratio.median * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-[#858585]">{(benchmarkData.cohort_benchmarks.expenditure_ratio.p75 * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right text-[#858585]">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
