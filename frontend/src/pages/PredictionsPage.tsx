import React, { useEffect, useState } from 'react';
import { api, ProjectListItem } from '../services/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { TrajectoryBadge } from '../components/common/TrajectoryBadge';
import { ProjectLink } from '../components/common/ProjectLink';

export const PredictionsPage: React.FC = () => {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskBand, setRiskBand] = useState('');

  const limit = 35;

  useEffect(() => {
    setLoading(true);
    api.getProjects({
      search: search || undefined,
      risk_band: riskBand || undefined,
      page,
      limit
    })
      .then((res) => {
        setProjects(res.projects);
        setTotalCount(res.total_count);
      })
      .finally(() => setLoading(false));
  }, [page, search, riskBand]);

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Supervised ML Risk Predictions
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Multi-model risk probabilities across Cost, Schedule, and Implementation failure modes for all July holdout projects.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search code, name, agency..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] placeholder-[#666666] font-mono focus:outline-none focus:border-[#007acc]"
          />
          <select
            value={riskBand}
            onChange={(e) => { setRiskBand(e.target.value); setPage(1); }}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Risk Tiers</option>
            <option value="CRITICAL">Critical (&gt;=80%)</option>
            <option value="HIGH">High (60-79%)</option>
            <option value="MODERATE">Moderate (35-59%)</option>
            <option value="LOW">Low (&lt;35%)</option>
          </select>
        </div>
      </div>

      {/* Predictions Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [RUNNING MULTI-MODEL INFERENCE PIPELINE...]
          </div>
        ) : projects.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [NO PROJECT PREDICTIONS FOUND]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e1e1e] border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="py-2 px-3">Project Code & Name</th>
                  <th className="py-2 px-3">State / Sector</th>
                  <th className="py-2 px-3 text-right">Cost (Cr)</th>
                  <th className="py-2 px-3 text-right">Progress</th>
                  <th className="py-2 px-3 text-center">Cost (Logistic)</th>
                  <th className="py-2 px-3 text-center">Schedule (Hist-GB)</th>
                  <th className="py-2 px-3 text-center">Impl (XGBoost)</th>
                  <th className="py-2 px-3 text-center">Overall (XGBoost)</th>
                  <th className="py-2 px-3 text-center">Trajectory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {projects.map((p) => (
                  <tr key={p.project_code} className="hover:bg-[#2a2d2e] transition-colors">
                    <td className="py-2.5 px-3">
                      <ProjectLink projectCode={p.project_code} />
                      <div className="text-[11px] font-sans text-[#aaaaaa] truncate max-w-[220px]" title={p.project_name}>
                        {p.project_name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans">
                      <div className="text-[#cccccc]">{p.state}</div>
                      <div className="text-[#858585] truncate max-w-[140px]">{p.table_section}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#cccccc]">
                      INR {p.cost_revised_cr?.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-[#cccccc]">
                      {p.physical_progress_pct?.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={p.cost_risk >= 60 ? 'text-red-400 font-bold' : p.cost_risk >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                        {p.cost_risk.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={p.schedule_risk >= 60 ? 'text-red-400 font-bold' : p.schedule_risk >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                        {p.schedule_risk.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={p.implementation_risk >= 60 ? 'text-red-400 font-bold' : p.implementation_risk >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                        {p.implementation_risk.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <RiskBadge score={p.overall_risk} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <TrajectoryBadge state={p.trajectory} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-2.5 bg-[#1e1e1e] border-t border-[#2d3139] flex items-center justify-between text-xs font-mono text-[#858585]">
          <div>
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} projects
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-0.5 rounded bg-[#252526] border border-[#3e4451] disabled:opacity-40 hover:text-white"
            >
              [PREV]
            </button>
            <span className="text-white font-bold">{page} / {totalPages || 1}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-2 py-0.5 rounded bg-[#252526] border border-[#3e4451] disabled:opacity-40 hover:text-white"
            >
              [NEXT]
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
