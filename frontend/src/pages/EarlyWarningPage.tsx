import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { ProjectLink } from '../components/common/ProjectLink';

export const EarlyWarningPage: React.FC = () => {
  const [warnings, setWarnings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [horizon, setHorizon] = useState<'3m' | '6m' | '12m'>('3m');
  const [bandFilter, setBandFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getEarlyWarning(horizon, bandFilter || undefined)
      .then(setWarnings)
      .finally(() => setLoading(false));
  }, [horizon, bandFilter]);

  const filtered = warnings.filter((w) => {
    if (!search) return true;
    return w.project_code.toString().includes(search);
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Multi-Horizon Early Warning Engine
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Dampened forward risk forecasting based on current risk level, velocity, acceleration, and project characteristics.
          </p>
        </div>

        {/* Horizon Tabs & Filters */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search #project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] placeholder-[#666666] font-mono focus:outline-none focus:border-[#007acc]"
          />
          <div className="flex rounded border border-[#3e4451] overflow-hidden">
            <button
              onClick={() => setHorizon('3m')}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${horizon === '3m' ? 'bg-[#007acc] text-white' : 'bg-[#252526] text-[#858585] hover:text-white'}`}
            >
              +3M
            </button>
            <button
              onClick={() => setHorizon('6m')}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${horizon === '6m' ? 'bg-[#007acc] text-white' : 'bg-[#252526] text-[#858585] hover:text-white'}`}
            >
              +6M
            </button>
            <button
              onClick={() => setHorizon('12m')}
              className={`px-2.5 py-1 text-xs font-mono font-bold transition-colors ${horizon === '12m' ? 'bg-[#007acc] text-white' : 'bg-[#252526] text-[#858585] hover:text-white'}`}
            >
              +12M
            </button>
          </div>
          <select
            value={bandFilter}
            onChange={(e) => setBandFilter(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Bands</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MODERATE">Moderate Only</option>
          </select>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="p-2.5 bg-[#252526] border border-[#2d3139] rounded text-[11px] font-mono text-[#858585] flex items-center justify-between">
        <div>
          <span className="text-[#007acc] font-bold">[METHODOLOGY NOTE]</span> Early warning scores represent forward risk projections estimated from empirical transition dynamics, not claims of 12-month ground truth.
        </div>
        <div className="text-[10px] text-white font-bold">
          ACTIVE HORIZON: +{horizon.toUpperCase()}
        </div>
      </div>

      {/* Warnings Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [COMPUTING FORWARD HORIZON PROJECTIONS...]
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [NO PROJECTS MATCH THE SELECTED HORIZON AND FILTER]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e1e1e] border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="py-2 px-3">Project Code</th>
                  <th className="py-2 px-3 text-center">Current Risk</th>
                  <th className="py-2 px-3 text-center">Current Band</th>
                  <th className="py-2 px-3 text-center">Projected ({horizon.toUpperCase()}) Risk</th>
                  <th className="py-2 px-3 text-center">Projected Band</th>
                  <th className="py-2 px-3 text-center">Uncertainty Interval</th>
                  <th className="py-2 px-3">Primary Trigger Factors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {filtered.map((w) => {
                  const hData = horizon === '3m' ? w.horizon_3m : horizon === '6m' ? w.horizon_6m : w.horizon_12m;
                  return (
                    <tr key={w.project_code} className="hover:bg-[#2a2d2e] transition-colors">
                      <td className="py-2.5 px-3">
                        <ProjectLink projectCode={w.project_code} />
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {w.current_risk.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RiskBadge band={w.current_band} showScore={false} />
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-bold text-sm ${
                          hData.forecast_score >= 80 ? 'text-red-400' :
                          hData.forecast_score >= 60 ? 'text-orange-400' : 'text-yellow-400'
                        }`}>
                          {hData.forecast_score.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <RiskBadge band={hData.forecast_band} showScore={false} />
                      </td>
                      <td className="py-2.5 px-3 text-center text-[#858585]">
                        [{hData.uncertainty_band[0]}% - {hData.uncertainty_band[1]}%]
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#cccccc] font-sans">
                        {w.risk_trigger_factors && w.risk_trigger_factors[0]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
