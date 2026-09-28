import React, { useEffect, useState } from 'react';
import { api, WatchlistItem } from '../services/api';
import { RiskBadge } from '../components/common/RiskBadge';
import { TrajectoryBadge } from '../components/common/TrajectoryBadge';
import { ConfidenceBadge } from '../components/common/ConfidenceBadge';
import { ProjectLink } from '../components/common/ProjectLink';

export const WatchlistPage: React.FC = () => {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterTrajectory, setFilterTrajectory] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    api.getWatchlist({
      priority: filterPriority || undefined,
      trajectory: filterTrajectory || undefined
    })
      .then(setItems)
      .finally(() => setLoading(false));
  }, [filterPriority, filterTrajectory]);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.project_code.toString().includes(q) ||
      item.project_name.toLowerCase().includes(q) ||
      item.agency_raw.toLowerCase().includes(q) ||
      item.state.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#2d3139] pb-2">
        <div>
          <h1 className="text-sm font-mono font-bold text-white tracking-wide uppercase">
            Top 50 High-Risk Watchlist
          </h1>
          <p className="text-[11px] text-[#858585] font-mono mt-0.5">
            Composite prioritization ranking incorporating overall risk, velocity, acceleration, and quality uncertainty.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Filter code, name, agency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] placeholder-[#666666] font-mono focus:outline-none focus:border-[#007acc]"
          />
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
          </select>
          <select
            value={filterTrajectory}
            onChange={(e) => setFilterTrajectory(e.target.value)}
            className="bg-[#252526] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] font-mono focus:outline-none"
          >
            <option value="">All Trajectories</option>
            <option value="RAPIDLY DETERIORATING">Rapidly Deteriorating</option>
            <option value="DETERIORATING">Deteriorating</option>
            <option value="STABLE">Stable</option>
            <option value="IMPROVING">Improving</option>
          </select>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="bg-[#252526] border border-[#2d3139] rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [LOADING WATCHLIST PRIORITIZATION...]
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center font-mono text-xs text-[#858585]">
            [NO PROJECTS MATCH THE SELECTED FILTER CRITERIA]
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#1e1e1e] border-b border-[#2d3139] text-[#858585]">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">Rank</th>
                  <th className="py-2 px-3">Project Code & Name</th>
                  <th className="py-2 px-3">State / Agency</th>
                  <th className="py-2 px-3 text-right">Cost (Cr)</th>
                  <th className="py-2 px-3 text-right">Progress</th>
                  <th className="py-2 px-3 text-center">Overall Risk</th>
                  <th className="py-2 px-3 text-center">Trajectory</th>
                  <th className="py-2 px-3 text-center">Data Trust</th>
                  <th className="py-2 px-3 text-right">Priority Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3139]/60">
                {filtered.map((item) => (
                  <tr key={item.project_code} className="hover:bg-[#2a2d2e] transition-colors">
                    <td className="py-2 px-3 text-center font-bold text-[#e1e4e8]">
                      #{item.rank}
                    </td>
                    <td className="py-2 px-3">
                      <div>
                        <ProjectLink projectCode={item.project_code} />
                        <div className="text-[11px] font-sans text-[#aaaaaa] truncate max-w-[280px]" title={item.project_name}>
                          {item.project_name}
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[11px] font-sans">
                      <div className="text-[#cccccc]">{item.state}</div>
                      <div className="text-[#858585] truncate max-w-[140px]" title={item.agency_raw}>
                        {item.agency_raw}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#cccccc]">
                      INR {item.cost_revised_cr.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[#cccccc]">
                      {item.physical_progress_pct.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-center">
                      <RiskBadge score={item.overall_risk} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <TrajectoryBadge state={item.trajectory} velocity={item.risk_velocity} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <ConfidenceBadge score={item.data_confidence} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        item.priority === 'CRITICAL' ? 'bg-red-950 text-red-300 border border-red-800' :
                        item.priority === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                        'bg-yellow-950 text-yellow-300 border border-yellow-800'
                      }`}>
                        [{item.priority}] {item.priority_score.toFixed(1)}
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
