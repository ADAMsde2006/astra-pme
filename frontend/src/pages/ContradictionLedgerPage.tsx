import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/ConfidenceBadge';
import { ProjectLink } from '../components/common/ProjectLink';
import { MetricCard } from '../components/common/MetricCard';

export const ContradictionLedgerPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [snapshotFilter, setSnapshotFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getContradictions({
      severity: severityFilter || undefined,
      snapshot_month: snapshotFilter || undefined
    })
      .then((res) => {
        setStats(res.stats);
        setContradictions(res.contradictions);
      })
      .finally(() => setLoading(false));
  }, [severityFilter, snapshotFilter]);

  const filtered = contradictions.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.project_code.toString().includes(q) ||
      c.rule_id.toLowerCase().includes(q) ||
      c.observed_value.toLowerCase().includes(q) ||
      (c.project_name && c.project_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Contradiction Ledger
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Empirical logical conflicts across single snapshots and cross-month non-monotonic regressions.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search rules, project #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] placeholder-[#666666] font-mono focus:outline-none focus:border-[#007acc]"
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Contradictions</option>
            <option value="WARNING">Warnings</option>
            <option value="INFO">Info</option>
          </select>
          <select
            value={snapshotFilter}
            onChange={(e) => setSnapshotFilter(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Snapshots</option>
            <option value="2026-07">2026-07</option>
            <option value="2026-06">2026-06</option>
            <option value="2026-05">2026-05</option>
            <option value="2026-04">2026-04</option>
          </select>
        </div>
      </div>

      {/* Metric Summary */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <MetricCard
            title="Total Contradictions"
            value={stats.total_contradictions.toLocaleString()}
            subtitle={`Affecting ${stats.affected_projects_count} distinct projects`}
            borderAccent="border-red-500"
          />
          <MetricCard
            title="Critical Severity"
            value={stats.critical_count}
            subtitle="Severe budget overruns, inverted progress"
            borderAccent="border-red-600"
          />
          <MetricCard
            title="Warning Severity"
            value={stats.warning_count}
            subtitle="Cross-month regressions, date retrogressions"
            borderAccent="border-amber-500"
          />
          <MetricCard
            title="Rule Violations Active"
            value={Object.keys(stats.by_rule || {}).length}
            subtitle="Deterministic verification checks"
            borderAccent="border-blue-500"
          />
        </div>
      )}

      {/* Contradictions Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [SCANNING LOGICAL CONTRADICTION LEDGER...]
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [NO CONTRADICTION RECORDS MATCHING CRITERIA]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e1e1e] border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="py-2 px-3">Project</th>
                  <th className="py-2 px-3">Snapshot</th>
                  <th className="py-2 px-3">Rule ID</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Observed Discrepancy</th>
                  <th className="py-2 px-3">Expected Logical State</th>
                  <th className="py-2 px-3 text-center">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-[#2a2d2e] transition-colors">
                    <td className="py-2 px-3">
                      <ProjectLink projectCode={c.project_code} />
                      <div className="text-[11px] font-sans text-[#aaaaaa] truncate max-w-[200px]" title={c.project_name}>
                        {c.project_name}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-bold text-white">{c.snapshot_month}</td>
                    <td className="py-2 px-3 font-bold text-red-400">{c.rule_id}</td>
                    <td className="py-2 px-3 text-[#858585]">{c.category}</td>
                    <td className="py-2 px-3 text-[#cccccc] font-sans max-w-[260px] truncate" title={c.observed_value}>
                      {c.observed_value}
                    </td>
                    <td className="py-2 px-3 text-[#858585] font-sans max-w-[200px] truncate" title={c.expected_condition}>
                      {c.expected_condition}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <SeverityBadge severity={c.severity} />
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
