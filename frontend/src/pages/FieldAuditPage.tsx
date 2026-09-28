import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { SeverityBadge } from '../components/common/ConfidenceBadge';
import { ProjectLink } from '../components/common/ProjectLink';
import { MetricCard } from '../components/common/MetricCard';

export const FieldAuditPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [snapshotFilter, setSnapshotFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getAudits({
      severity: severityFilter || undefined,
      snapshot_month: snapshotFilter || undefined
    })
      .then((res) => {
        setStats(res.stats);
        setAudits(res.audits);
      })
      .finally(() => setLoading(false));
  }, [severityFilter, snapshotFilter]);

  const filtered = audits.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.project_code.toString().includes(q) ||
      (a.field && a.field.toLowerCase().includes(q)) ||
      (a.issue && a.issue.toLowerCase().includes(q)) ||
      (a.project_name && a.project_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Field Audit & Data Trust Engine
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Schema-level data validation evaluating missing fields, numeric anomalies, parse flags, and project confidence scores.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search issues, fields, #code..."
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
            <option value="ERROR">Errors Only</option>
            <option value="WARNING">Warnings Only</option>
            <option value="INFO">Info Only</option>
          </select>
          <select
            value={snapshotFilter}
            onChange={(e) => setSnapshotFilter(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Snapshots</option>
            <option value="2026-07">2026-07 (Holdout)</option>
            <option value="2026-06">2026-06</option>
            <option value="2026-05">2026-05</option>
            <option value="2026-04">2026-04</option>
          </select>
        </div>
      </div>

      {/* Metric Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <MetricCard
            title="Average Confidence"
            value={`${stats.average_confidence}%`}
            subtitle={`${stats.high_confidence_projects} High (>=85%) | ${stats.low_confidence_projects} Low (<60%)`}
            borderAccent="border-blue-500"
          />
          <MetricCard
            title="Total Audit Issues"
            value={stats.total_audit_issues.toLocaleString()}
            subtitle={`${stats.errors} Errors | ${stats.warnings} Warnings`}
            borderAccent="border-amber-500"
          />
          <MetricCard
            title="Critical Errors"
            value={stats.errors.toLocaleString()}
            subtitle="Missing core fields, out-of-bounds metrics"
            borderAccent="border-red-500"
          />
          <MetricCard
            title="Projects Evaluated"
            value={stats.total_projects.toLocaleString()}
            subtitle="Longitudinal portfolio corpus"
            borderAccent="border-cyan-500"
          />
        </div>
      )}

      {/* Audit Findings Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [RUNNING FIELD AUDIT SCANS...]
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [NO FIELD AUDIT RECORDS MATCHING CRITERIA]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e1e1e] border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="py-2 px-3">Project</th>
                  <th className="py-2 px-3">Snapshot</th>
                  <th className="py-2 px-3">Field</th>
                  <th className="py-2 px-3">Issue Detected</th>
                  <th className="py-2 px-3">Observed Value</th>
                  <th className="py-2 px-3">Expected Condition</th>
                  <th className="py-2 px-3 text-center">Severity</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {filtered.map((a, idx) => (
                  <tr key={idx} className="hover:bg-[#2a2d2e] transition-colors">
                    <td className="py-2 px-3">
                      <ProjectLink projectCode={a.project_code} />
                      <div className="text-[11px] font-sans text-[#aaaaaa] truncate max-w-[200px]" title={a.project_name}>
                        {a.project_name}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-white font-bold">{a.snapshot_month}</td>
                    <td className="py-2 px-3 text-[#007acc]">{a.field}</td>
                    <td className="py-2 px-3 text-[#cccccc] font-sans">{a.issue}</td>
                    <td className="py-2 px-3 text-[#858585] max-w-[150px] truncate" title={a.observed_value}>{a.observed_value}</td>
                    <td className="py-2 px-3 text-[#858585] font-sans max-w-[180px] truncate" title={a.expected_condition}>{a.expected_condition}</td>
                    <td className="py-2 px-3 text-center">
                      <SeverityBadge severity={a.severity} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="text-[10px] text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/40 border border-amber-800">
                        [{a.status}]
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
