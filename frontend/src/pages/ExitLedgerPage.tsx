import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ProjectLink } from '../components/common/ProjectLink';
import { MetricCard } from '../components/common/MetricCard';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';

export const ExitLedgerPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [exits, setExits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getExits({ status: statusFilter || undefined })
      .then((res) => {
        setStats(res.stats);
        setExits(res.exits);
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = exits.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.project_code.toString().includes(q) ||
      e.project_name.toLowerCase().includes(q) ||
      e.agency_raw.toLowerCase().includes(q) ||
      e.state.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Exit Ledger & Completion Verification
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Transparent rule verification identifying projects eligible to exit routine monitoring vs projects requiring administrative audit.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search projects, agencies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] placeholder-[#666666] font-mono focus:outline-none focus:border-[#007acc]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Exit Statuses</option>
            <option value="EXIT CANDIDATE">Exit Candidates (Clean Completion)</option>
            <option value="REVIEW REQUIRED">Review Required (Discrepancies)</option>
            <option value="ACTIVE">Active Projects</option>
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <MetricCard
            title="Exit Candidates"
            value={stats.exit_candidates.toLocaleString()}
            subtitle="100% Progress + Clean Financials + No Critical Issues"
            borderAccent="border-emerald-500"
          />
          <MetricCard
            title="Review Required"
            value={stats.review_required.toLocaleString()}
            subtitle="100% Progress but financial or audit conflicts present"
            borderAccent="border-amber-500"
          />
          <MetricCard
            title="Active In Execution"
            value={stats.active_projects.toLocaleString()}
            subtitle="Ongoing monitoring (<99.5% physical completion)"
            borderAccent="border-blue-500"
          />
          <MetricCard
            title="Total Evaluated"
            value={stats.total_evaluated.toLocaleString()}
            subtitle="July 2026 active holdout cohort"
            borderAccent="border-zinc-500"
          />
        </div>
      )}

      {/* Exit Ledger Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [EVALUATING EXIT CONDITIONS...]
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [NO EXIT LEDGER ENTRIES MATCH CRITERIA]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e1e1e] border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="py-2 px-3">Project Code & Name</th>
                  <th className="py-2 px-3">State / Agency</th>
                  <th className="py-2 px-3 text-right">Physical Progress</th>
                  <th className="py-2 px-3 text-right">Expenditure Ratio</th>
                  <th className="py-2 px-3">Exit Condition / Evidence</th>
                  <th className="py-2 px-3 text-center">Data Trust</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {filtered.map((e) => (
                  <tr key={e.project_code} className="hover:bg-[#2a2d2e] transition-colors">
                    <td className="py-2.5 px-3">
                      <ProjectLink projectCode={e.project_code} />
                      <div className="text-[11px] font-sans text-[#aaaaaa] truncate max-w-[220px]" title={e.project_name}>
                        {e.project_name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] font-sans">
                      <div className="text-[#cccccc]">{e.state}</div>
                      <div className="text-[#858585] truncate max-w-[140px]">{e.agency_raw}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {e.physical_progress_pct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-[#cccccc]">
                      {(e.expenditure_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 max-w-[280px]">
                      <div className="text-[#cccccc] font-sans font-medium text-[11px]">{e.exit_condition}</div>
                      {e.evidence && e.evidence.length > 0 && (
                        <div className="text-[10px] text-[#858585] font-sans truncate" title={e.evidence.join('; ')}>
                          {e.evidence[0]}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <ConfidenceBadge score={e.data_confidence_score} />
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        e.status === 'EXIT CANDIDATE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        e.status === 'REVIEW REQUIRED' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                        'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}>
                        [{e.status}]
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
