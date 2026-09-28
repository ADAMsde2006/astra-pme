import React, { useEffect, useState } from 'react';
import { api, OverviewData } from '../services/api';
import { MetricCard } from '../components/common/MetricCard';
import { RiskBadge } from '../components/common/RiskBadge';
import { RiskDistributionChart } from '../components/charts/RiskDistributionChart';

export const OverviewPage: React.FC = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getOverview()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-xs text-[#858585]">
        [LOADING PORTFOLIO INTELLIGENCE...]
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 font-mono text-xs rounded">
        ERROR LOADING PORTFOLIO DATA: {error}
      </div>
    );
  }

  const { risk_summary, trajectory_summary, audit_summary, contradiction_summary, exit_summary } = data;

  return (
    <div className="space-y-4">
      
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Portfolio Intelligence & Monitoring Overview
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Holdout Snapshot: <span className="text-[#007acc] font-bold">{data.snapshot_month}</span> | Longitudinal Pipeline: April 2026 to July 2026
          </p>
        </div>
        <div className="text-xs font-mono px-2 py-0.5 rounded bg-[#252526] border border-[#2d3139] text-[#cccccc]">
          [{data.total_projects_monitored.toLocaleString()} PROJECTS MONITORED]
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <MetricCard
          title="Monitored Projects"
          value={data.total_projects_monitored.toLocaleString()}
          subtitle={`Core longitudinal: ${data.longitudinal_core_projects.toLocaleString()} (4/4 Mo)`}
          borderAccent="border-blue-500"
        />
        <MetricCard
          title="Critical / High Risk"
          value={(risk_summary.critical_risk_count + risk_summary.high_risk_count).toLocaleString()}
          subtitle={`${risk_summary.critical_risk_count} Critical (>=80%) | ${risk_summary.high_risk_count} High (60-79%)`}
          badge={<RiskBadge band="CRITICAL" score={risk_summary.critical_risk_count} showScore={false} />}
          borderAccent="border-red-500"
        />
        <MetricCard
          title="Rapidly Deteriorating"
          value={trajectory_summary.rapidly_deteriorating}
          subtitle={`+ ${trajectory_summary.deteriorating} Deteriorating | ${trajectory_summary.improving} Improving`}
          borderAccent="border-orange-500"
        />
        <MetricCard
          title="Data Confidence Avg"
          value={`${audit_summary.average_confidence}%`}
          subtitle={`${contradiction_summary.total_contradictions} Contradictions (${contradiction_summary.critical_count} Crit)`}
          borderAccent="border-cyan-500"
        />
      </div>

      {/* Middle Section: Risk Distribution & Longitudinal Snapshots */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* Risk Distribution Chart */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Risk Tier Breakdown (July Holdout)</span>
            <span className="text-[10px] text-[#858585]">ENSEMBLE</span>
          </div>
          <RiskDistributionChart summary={risk_summary} height="190px" />
          <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-[#2d3139] text-[11px] font-mono text-[#858585]">
            <div>Avg Cost Risk: <span className="text-white font-semibold">{risk_summary.avg_cost_risk}%</span></div>
            <div>Avg Sched Risk: <span className="text-white font-semibold">{risk_summary.avg_schedule_risk}%</span></div>
            <div>Avg Impl Risk: <span className="text-white font-semibold">{risk_summary.avg_implementation_risk}%</span></div>
            <div>Avg Overall: <span className="text-[#007acc] font-semibold">{risk_summary.avg_overall_risk}%</span></div>
          </div>
        </div>

        {/* Longitudinal Cohort Progression */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
              Longitudinal Monthly Coverage
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {Object.entries(data.monthly_snapshots).map(([m, count]) => (
                <div key={m} className="flex items-center justify-between p-1.5 bg-[#1e1e1e] rounded border border-[#2d3139]">
                  <span className="font-semibold text-white">{m}</span>
                  <span className="text-[#858585]">{count.toLocaleString()} projects</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] font-mono">
                    {m === '2026-07' ? 'TEST HOLDOUT' : 'TRAIN / VAL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#858585] p-1.5 bg-[#1e1e1e] rounded border border-[#2d3139]">
            [1,603 projects observed across all 4 consecutive months]
          </div>
        </div>

        {/* Data Trust & Exit Summary */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
              Data Trust & Exit Status
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between p-1.5 bg-[#1e1e1e] rounded border border-[#2d3139]">
                <span className="text-[#cccccc]">Exit Candidates (100% Clean)</span>
                <span className="font-bold text-emerald-400">{exit_summary.exit_candidates}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#1e1e1e] rounded border border-[#2d3139]">
                <span className="text-[#cccccc]">Review Required (Discrepancies)</span>
                <span className="font-bold text-amber-400">{exit_summary.review_required}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#1e1e1e] rounded border border-[#2d3139]">
                <span className="text-[#cccccc]">Active Ongoing Monitoring</span>
                <span className="font-bold text-blue-400">{exit_summary.active_projects}</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#1e1e1e] rounded border border-[#2d3139]">
                <span className="text-[#cccccc]">Low Confidence (Audit Flags)</span>
                <span className="font-bold text-red-400">{audit_summary.low_confidence_projects}</span>
              </div>
            </div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-[#858585]">
            [Exit status evaluated via completion & financial consistency rules]
          </div>
        </div>

      </div>

      {/* Bottom Tables: State & Agency Risk Aggregations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Top States Risk */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
            State-Level Portfolio Risk Concentration
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#2d3139] text-[#858585]">
                  <th className="pb-1">State</th>
                  <th className="pb-1 text-right">Projects</th>
                  <th className="pb-1 text-right">Cost (Cr)</th>
                  <th className="pb-1 text-right">Avg Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {data.state_breakdown.slice(0, 7).map((s) => (
                  <tr key={s.state} className="hover:bg-[#2a2d2e]/50">
                    <td className="py-1 text-[#cccccc] font-sans truncate max-w-[140px]">{s.state}</td>
                    <td className="py-1 text-right text-white">{s.project_count}</td>
                    <td className="py-1 text-right text-[#858585]">INR {s.total_cost_cr.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="py-1 text-right">
                      <span className={s.avg_risk >= 60 ? 'text-red-400 font-bold' : s.avg_risk >= 45 ? 'text-amber-400' : 'text-emerald-400'}>
                        {s.avg_risk.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Agencies Risk */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
            Agency-Level Risk Concentration
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#2d3139] text-[#858585]">
                  <th className="pb-1">Executing Agency</th>
                  <th className="pb-1 text-right">Projects</th>
                  <th className="pb-1 text-right">Avg Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {data.agency_breakdown.slice(0, 7).map((a) => (
                  <tr key={a.agency_raw} className="hover:bg-[#2a2d2e]/50">
                    <td className="py-1 text-[#cccccc] font-sans truncate max-w-[200px]" title={a.agency_raw}>
                      {a.agency_raw}
                    </td>
                    <td className="py-1 text-right text-white">{a.project_count}</td>
                    <td className="py-1 text-right">
                      <span className={a.avg_risk >= 60 ? 'text-red-400 font-bold' : a.avg_risk >= 45 ? 'text-amber-400' : 'text-emerald-400'}>
                        {a.avg_risk.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
