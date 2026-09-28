import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, ProjectDetailData } from '../services/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { TrajectoryBadge } from '../components/common/TrajectoryBadge';
import { ConfidenceBadge, SeverityBadge } from '../components/common/ConfidenceBadge';
import { RiskTrajectoryChart } from '../components/charts/RiskTrajectoryChart';
import { DriversBarChart } from '../components/charts/DriversBarChart';
import { EarlyWarningHorizonChart } from '../components/charts/EarlyWarningHorizonChart';
import { BenchmarkRadarChart } from '../components/charts/BenchmarkRadarChart';

export const ProjectDetailPage: React.FC = () => {
  const { projectCode } = useParams<{ projectCode: string }>();
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const code = projectCode ? parseInt(projectCode, 10) : 612786;

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.getProjectDetail(code)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full font-mono text-xs text-[#858585]">
        [LOADING PROJECT #{code} MONITORING DOSSIER...]
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => navigate('/watchlist')}
          className="text-xs font-mono text-[#007acc] hover:underline"
        >
          &lt; BACK TO WATCHLIST
        </button>
        <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 font-mono text-xs rounded">
          PROJECT #{code} NOT FOUND IN REPOSITORY.
        </div>
      </div>
    );
  }

  const { project_info, risk, trajectory, early_warning, drivers, benchmarks, data_trust, administrative_attention, longitudinal_history, exit_status } = data;

  return (
    <div className="space-y-4">
      
      {/* 1. Header Banner */}
      <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-[#2d3139] pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/30 font-bold">
                PROJECT #{project_info.project_code}
              </span>
              <span className="text-xs font-mono text-[#858585]">[{project_info.table_section}]</span>
              {exit_status && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  exit_status.status === 'EXIT CANDIDATE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                  exit_status.status === 'REVIEW REQUIRED' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                  'bg-blue-950 text-blue-300 border-blue-800'
                }`}>
                  [{exit_status.status}]
                </span>
              )}
            </div>
            <h1 className="text-sm font-sans font-bold text-white mt-1 leading-snug">
              {project_info.project_name}
            </h1>
            <div className="text-[11px] font-mono text-[#858585] mt-0.5 flex flex-wrap items-center gap-2">
              <span>Agency: <span className="text-[#cccccc]">{project_info.agency_raw}</span></span>
              <span>|</span>
              <span>State: <span className="text-[#cccccc]">{project_info.state}</span></span>
              {project_info.legacy_ocms_code && (
                <>
                  <span>|</span>
                  <span>OCMS: <span className="text-[#cccccc]">{project_info.legacy_ocms_code}</span></span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <RiskBadge score={risk.overall_risk} size="md" />
            <TrajectoryBadge state={trajectory.trajectory_state} velocity={trajectory.current_velocity} size="md" />
            <ConfidenceBadge score={data_trust.confidence_score} />
          </div>
        </div>

        {/* Financial & Schedule Key Facts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-1 text-xs font-mono">
          <div>
            <div className="text-[10px] text-[#858585]">REVISED COST</div>
            <div className="text-sm font-bold text-white">INR {project_info.cost_revised_cr?.toLocaleString() || 'N/A'} Cr</div>
            <div className="text-[10px] text-[#858585]">Orig: INR {project_info.cost_original_cr?.toLocaleString() || 'N/A'} Cr</div>
          </div>
          <div>
            <div className="text-[10px] text-[#858585]">CUMULATIVE EXPENDITURE</div>
            <div className="text-sm font-bold text-white">INR {project_info.expenditure_cum_cr?.toLocaleString() || '0'} Cr</div>
            <div className="text-[10px] text-[#858585]">
              {project_info.cost_revised_cr ? `${((project_info.expenditure_cum_cr / project_info.cost_revised_cr) * 100).toFixed(1)}% of Budget` : ''}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-[#858585]">PHYSICAL PROGRESS</div>
            <div className="text-sm font-bold text-emerald-400">{project_info.physical_progress_pct?.toFixed(1)}%</div>
            <div className="text-[10px] text-[#858585]">Remaining: {(100 - (project_info.physical_progress_pct || 0)).toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-[10px] text-[#858585]">DOC (TARGET REVISED)</div>
            <div className="text-sm font-bold text-white">{project_info.doc_revised || project_info.doc_original || 'N/A'}</div>
            <div className="text-[10px] text-[#858585]">Start: {project_info.start_month || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* 2. Administrative Attention Banner */}
      <div className={`p-2.5 rounded border font-mono text-xs ${
        administrative_attention.priority === 'CRITICAL' ? 'bg-red-950/40 border-red-800 text-red-300' :
        administrative_attention.priority === 'HIGH' ? 'bg-orange-950/40 border-orange-800 text-orange-300' :
        'bg-[#252526] border-[#2d3139] text-[#cccccc]'
      }`}>
        <div className="font-bold uppercase tracking-wider mb-1">
          [ADMINISTRATIVE ATTENTION: {administrative_attention.priority}]
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90 pl-1 font-sans">
          {administrative_attention.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* 3. Middle Grid: Trajectory & Early Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Risk Trajectory Chart */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Longitudinal Risk Trajectory (Apr - Jul 2026)</span>
            <span className="text-[10px] text-[#858585]">
              Velocity: {trajectory.current_velocity > 0 ? `+${trajectory.current_velocity.toFixed(1)}` : trajectory.current_velocity.toFixed(1)}%/mo
            </span>
          </div>
          <RiskTrajectoryChart
            months={trajectory.months}
            overallRisks={trajectory.overall_risks}
            costRisks={trajectory.cost_risks}
            scheduleRisks={trajectory.schedule_risks}
            implementationRisks={trajectory.implementation_risks}
            height="220px"
          />
        </div>

        {/* Early Warning Forecast */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Forward Early Warning Horizons</span>
            <span className="text-[10px] text-[#858585]">DAMPENED FORECAST</span>
          </div>
          <EarlyWarningHorizonChart
            currentRisk={risk.overall_risk}
            h3m={early_warning.horizon_3m}
            h6m={early_warning.horizon_6m}
            h12m={early_warning.horizon_12m}
            height="220px"
          />
        </div>

      </div>

      {/* 4. Drivers & Benchmarks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Model Drivers Attribution */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-1">
            Empirical Risk Drivers (Tree Attribution)
          </div>
          <DriversBarChart drivers={drivers.drivers} height="200px" />
        </div>

        {/* Peer Benchmarking Radar */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Cohort Comparison ({benchmarks.peer_count} Peers)</span>
            <span className="text-[10px] text-[#858585]">SECTOR / AGENCY</span>
          </div>
          <BenchmarkRadarChart
            currentProject={benchmarks.current_project}
            cohortBenchmarks={benchmarks.cohort_benchmarks}
            height="200px"
          />
        </div>

      </div>

      {/* 5. Data Trust: Audits, Contradictions, and Anomalies */}
      <div className="bg-[#252526] border border-[#2d3139] rounded p-3 space-y-2">
        <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider flex items-center justify-between">
          <span>Data Trust & Verification Ledger</span>
          <span className="text-[11px] font-mono text-[#858585]">
            Confidence: <span className="text-white font-bold">{data_trust.confidence_score}%</span> | Anomaly Score: <span className="text-white font-bold">{data_trust.anomaly_score}/100</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* Active Contradictions */}
          <div className="bg-[#1e1e1e] p-2.5 rounded border border-[#2d3139]">
            <div className="text-xs font-mono font-bold text-red-400 mb-1.5">
              [LOGICAL CONTRADICTIONS: {data_trust.contradictions.length}]
            </div>
            {data_trust.contradictions.length === 0 ? (
              <div className="text-xs font-mono text-emerald-400">
                [ZERO LOGICAL CONTRADICTIONS DETECTED]
              </div>
            ) : (
              <div className="space-y-1.5 text-xs font-mono">
                {data_trust.contradictions.map((c) => (
                  <div key={c.id} className="p-1.5 bg-[#252526] rounded border border-red-900/60">
                    <div className="flex items-center justify-between text-[10px] text-red-300 font-bold">
                      <span>{c.rule_id}</span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <div className="text-xs text-[#cccccc] font-sans mt-0.5">{c.observed_value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Findings */}
          <div className="bg-[#1e1e1e] p-2.5 rounded border border-[#2d3139]">
            <div className="text-xs font-mono font-bold text-blue-400 mb-1.5">
              [FIELD AUDIT FINDINGS: {data_trust.audits.length}]
            </div>
            {data_trust.audits.length === 0 ? (
              <div className="text-xs font-mono text-emerald-400">
                [CLEAN SCHEMA VALIDATION - NO ERRORS]
              </div>
            ) : (
              <div className="space-y-1 text-xs font-mono max-h-40 overflow-y-auto">
                {data_trust.audits.map((a, idx) => (
                  <div key={idx} className="p-1 bg-[#252526] rounded border border-[#3e4451] flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-[#858585]">[{a.snapshot_month}]</span> <span className="text-[#cccccc]">{a.issue}</span>
                    </div>
                    <SeverityBadge severity={a.severity} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 6. Longitudinal Snapshot History Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
        <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-1">
          Monthly Longitudinal Flash Report Observations
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-[#2d3139] text-[#858585]">
              <tr>
                <th className="pb-1">Snapshot</th>
                <th className="pb-1 text-right">Revised Cost (Cr)</th>
                <th className="pb-1 text-right">Cum Exp (Cr)</th>
                <th className="pb-1 text-right">Exp Vel (Cr/Mo)</th>
                <th className="pb-1 text-right">Physical Progress</th>
                <th className="pb-1 text-right">Prog Vel (%/Mo)</th>
                <th className="pb-1 text-center">DOC (Revised)</th>
                <th className="pb-1 text-center">Overall Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3139]/60">
              {longitudinal_history.map((h) => (
                <tr key={h.snapshot_month} className="hover:bg-[#2a2d2e]/50">
                  <td className="py-1.5 font-bold text-white">{h.snapshot_month}</td>
                  <td className="py-1.5 text-right text-[#cccccc]">INR {h.cost_revised_cr?.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-[#cccccc]">INR {h.expenditure_cum_cr?.toLocaleString()}</td>
                  <td className="py-1.5 text-right text-[#858585]">{h.expenditure_velocity > 0 ? `+${h.expenditure_velocity}` : h.expenditure_velocity}</td>
                  <td className="py-1.5 text-right text-emerald-400">{h.physical_progress_pct?.toFixed(1)}%</td>
                  <td className="py-1.5 text-right text-[#858585]">{h.progress_velocity > 0 ? `+${h.progress_velocity}` : h.progress_velocity}</td>
                  <td className="py-1.5 text-center text-[#cccccc]">{h.doc_revised || 'N/A'}</td>
                  <td className="py-1.5 text-center">
                    <RiskBadge score={h.overall_risk} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
