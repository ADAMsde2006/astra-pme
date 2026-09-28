import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DriversBarChart } from '../components/charts/DriversBarChart';
import { ProjectLink } from '../components/common/ProjectLink';
import { RiskBadge } from '../components/common/RiskBadge';

export const DriversPage: React.FC = () => {
  const [projectCodeInput, setProjectCodeInput] = useState('612786');
  const [activeCode, setActiveCode] = useState(612786);
  const [driverData, setDriverData] = useState<any>(null);
  const [target, setTarget] = useState('overall');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getDrivers(activeCode, target)
      .then(setDriverData)
      .finally(() => setLoading(false));
  }, [activeCode, target]);

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
            Model Explainability & Feature Attribution
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Empirical feature importance and local instance contribution direction. (Explanations derive strictly from models, zero LLM hallucination).
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
            EXPLAIN
          </button>
        </form>
      </div>

      {/* Target Selector Tabs */}
      <div className="flex items-center justify-between bg-[#252526] border border-[#2d3139] p-2 rounded text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#858585]">Failure Mode Target:</span>
          {['overall', 'schedule', 'implementation', 'cost'].map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={`px-2 py-0.5 rounded font-bold uppercase transition-colors ${
                target === t ? 'bg-[#007acc] text-white' : 'bg-[#1e1e1e] text-[#858585] hover:text-white'
              }`}
            >
              {t} Risk
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#858585]">Project:</span>
          <ProjectLink projectCode={activeCode} />
          {driverData && <RiskBadge score={driverData.risk_score} />}
        </div>
      </div>

      {/* Main Attribution View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        
        {/* Drivers Bar Chart */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Feature Contribution Weights</span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="text-red-400">[INCREASES RISK]</span>
              <span className="text-emerald-400">[DECREASES RISK]</span>
            </div>
          </div>
          {loading ? (
            <div className="p-16 text-center font-mono text-xs text-[#858585]">
              [EXTRACTING MODEL ATTRIBUTION VECTORS...]
            </div>
          ) : (
            <DriversBarChart drivers={driverData?.drivers || []} height="280px" />
          )}
        </div>

        {/* Detailed Factor Breakdown Table */}
        <div className="bg-[#252526] border border-[#2d3139] rounded p-3">
          <div className="text-[11px] font-mono font-bold text-[#e1e4e8] uppercase tracking-wider mb-2">
            Top Model-Derived Decision Factors
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="pb-1.5">Driver Feature</th>
                  <th className="pb-1.5 text-right">Value</th>
                  <th className="pb-1.5 text-right">Weight</th>
                  <th className="pb-1.5 text-center">Direction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {(driverData?.drivers || []).map((d: any, idx: number) => (
                  <tr key={idx} className="hover:bg-[#2a2d2e]/50">
                    <td className="py-2 text-[#cccccc] font-sans">
                      <div className="font-semibold text-white">{d.display_name}</div>
                      <div className="text-[10px] text-[#858585] font-mono">{d.feature}</div>
                    </td>
                    <td className="py-2 text-right text-white font-bold">{d.feature_value}</td>
                    <td className="py-2 text-right text-[#007acc]">{d.importance_weight.toFixed(4)}</td>
                    <td className="py-2 text-center">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        d.direction === 'INCREASES_RISK'
                          ? 'bg-red-950/80 text-red-300 border border-red-800'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      }`}>
                        [{d.direction.replace('_', ' ')}]
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
