import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchCode.trim().replace(/^#/, '');
    if (clean) {
      navigate(`/projects/${clean}`);
      setSearchCode('');
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const navSectionClass = "text-[10px] font-mono font-bold text-[#858585] uppercase tracking-wider px-3 mt-3.5 mb-1 select-none";
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between px-3 py-1.5 text-xs font-mono rounded transition-colors ${
      isActive
        ? 'bg-[#37373d] text-white font-semibold border-l-2 border-[#007acc] pl-[10px]'
        : 'text-[#cccccc] hover:bg-[#2a2d2e] hover:text-white'
    }`;

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDark ? 'bg-[#1e1e1e] text-[#cccccc]' : 'bg-[#f3f3f3] text-[#333333]'}`}>
      
      {/* 1. VS CODE ACTIVITY BAR (Minimalist Technical) */}
      <div className="w-10 bg-[#333333] flex flex-col items-center py-2.5 border-r border-[#252526] select-none justify-between z-20">
        <div className="flex flex-col items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#007acc] flex items-center justify-center text-white font-mono font-bold text-[10px] tracking-tighter">
            ASTRA
          </div>
          <button
            title="Overview"
            onClick={() => navigate('/overview')}
            className="w-7 h-7 flex items-center justify-center font-mono text-[10px] font-bold text-[#cccccc] hover:text-white hover:bg-[#3e3e42] rounded"
          >
            MON
          </button>
          <button
            title="Data Trust"
            onClick={() => navigate('/audit')}
            className="w-7 h-7 flex items-center justify-center font-mono text-[10px] font-bold text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded"
          >
            TRU
          </button>
          <button
            title="Risk Predictions"
            onClick={() => navigate('/predictions')}
            className="w-7 h-7 flex items-center justify-center font-mono text-[10px] font-bold text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded"
          >
            RSK
          </button>
          <button
            title="Assistant"
            onClick={() => navigate('/assistant')}
            className="w-7 h-7 flex items-center justify-center font-mono text-[10px] font-bold text-[#858585] hover:text-white hover:bg-[#3e3e42] rounded"
          >
            AST
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={toggleTheme}
            title="Toggle Dark/Light"
            className="w-7 h-7 flex items-center justify-center font-mono text-[9px] font-bold border border-[#444444] text-[#cccccc] hover:text-white rounded"
          >
            {isDark ? 'LGT' : 'DRK'}
          </button>
        </div>
      </div>

      {/* 2. PERSISTENT VS CODE LEFT SIDEBAR */}
      <div className="w-60 bg-[#252526] border-r border-[#2d3139] flex flex-col select-none overflow-y-auto">
        
        {/* Header */}
        <div className="p-3 border-b border-[#2d3139]">
          <div className="text-xs font-mono font-bold text-white tracking-widest uppercase flex items-center justify-between">
            <span>ASTRA PME</span>
            <span className="text-[9px] bg-[#007acc]/20 text-[#007acc] px-1.5 py-0.5 rounded border border-[#007acc]/30 font-mono">
              PROD
            </span>
          </div>
          <div className="text-[9px] font-mono text-[#858585] mt-0.5 tracking-tight">
            PROJECT MONITORING ENVIRONMENT
          </div>

          {/* Quick Jump Search */}
          <form onSubmit={handleSearchSubmit} className="mt-2.5 relative">
            <input
              type="text"
              placeholder="Jump to Project Code..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3e4451] rounded text-xs px-2 py-1 text-[#cccccc] placeholder-[#666666] focus:outline-none focus:border-[#007acc] font-mono text-[11px]"
            />
          </form>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-1.5 py-1 space-y-0.5 text-xs">
          
          {/* MONITOR */}
          <div className={navSectionClass}>Monitor</div>
          <NavLink to="/overview" className={navLinkClass}>
            <span>Overview</span>
            <span className="text-[10px] text-[#858585]">1775</span>
          </NavLink>
          <NavLink to="/watchlist" className={navLinkClass}>
            <span>Watchlist</span>
            <span className="text-[10px] text-amber-400 font-bold">TOP 50</span>
          </NavLink>
          <NavLink
            to={location.pathname.startsWith('/projects/') ? location.pathname : '/projects/612786'}
            className={navLinkClass}
          >
            <span>Project Detail</span>
            <span className="text-[10px] text-[#007acc]">ACTIVE</span>
          </NavLink>

          {/* DATA TRUST */}
          <div className={navSectionClass}>Data Trust</div>
          <NavLink to="/audit" className={navLinkClass}>
            <span>Field Audit</span>
            <span className="text-[10px] text-blue-400">SCHEMA</span>
          </NavLink>
          <NavLink to="/contradictions" className={navLinkClass}>
            <span>Contradiction Ledger</span>
            <span className="text-[10px] text-red-400">RULES</span>
          </NavLink>
          <NavLink to="/exits" className={navLinkClass}>
            <span>Exit Ledger</span>
            <span className="text-[10px] text-emerald-400">EXIT</span>
          </NavLink>

          {/* RISK INTELLIGENCE */}
          <div className={navSectionClass}>Risk Intelligence</div>
          <NavLink to="/early-warning" className={navLinkClass}>
            <span>Early Warning</span>
            <span className="text-[10px] text-orange-400">3M/6M/12M</span>
          </NavLink>
          <NavLink to="/predictions" className={navLinkClass}>
            <span>ML Prediction</span>
            <span className="text-[10px] text-purple-400">ENSEMBLE</span>
          </NavLink>
          <NavLink to="/drivers" className={navLinkClass}>
            <span>Drivers</span>
            <span className="text-[10px] text-cyan-400">SHAP/TREE</span>
          </NavLink>
          <NavLink to="/benchmarking" className={navLinkClass}>
            <span>Benchmarking</span>
            <span className="text-[10px] text-zinc-400">PEERS</span>
          </NavLink>

          {/* DECISION SUPPORT */}
          <div className={navSectionClass}>Decision Support</div>
          <NavLink to="/assistant" className={navLinkClass}>
            <span>Assistant</span>
            <span className="text-[10px] text-indigo-400">RULES</span>
          </NavLink>

          {/* MODELS */}
          <div className={navSectionClass}>Models</div>
          <NavLink to="/model-card" className={navLinkClass}>
            <span>Model Card</span>
            <span className="text-[10px] text-[#858585]">CARD</span>
          </NavLink>

        </div>

        {/* Snapshot Status */}
        <div className="p-2.5 border-t border-[#2d3139] text-[10px] font-mono text-[#858585]">
          <div className="flex items-center justify-between text-[#cccccc]">
            <span>SNAPSHOT</span>
            <span className="font-bold text-white">2026-07 (HOLDOUT)</span>
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[#858585]">
            <span>TRAIN CORPUS</span>
            <span>2026-04 to 2026-06</span>
          </div>
        </div>

      </div>

      {/* 3. MAIN EDITOR CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Breadcrumb & Status Bar */}
        <div className="h-8 bg-[#1e1e1e] border-b border-[#2d3139] flex items-center justify-between px-4 text-xs font-mono select-none">
          <div className="flex items-center gap-2 text-[#858585]">
            <span className="text-[#007acc] font-bold">ASTRA-PME</span>
            <span>/</span>
            <span className="text-[#cccccc] uppercase tracking-wider">{location.pathname.replace('/', '') || 'OVERVIEW'}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-emerald-400 font-bold">[ENGINE ONLINE]</span>
            <span className="text-[#858585]">PAIMANA / OCMS REPOSITORY (7,492 RECORDS)</span>
          </div>
        </div>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#181818]">
          <Outlet />
        </div>

        {/* Bottom Status Bar */}
        <div className="h-5 bg-[#007acc] text-white flex items-center justify-between px-3 text-[10px] font-mono select-none">
          <div className="flex items-center gap-3">
            <span>REPOSITORY: 4 MONTHS (APR-JUL 2026)</span>
            <span>|</span>
            <span>LONGITUDINAL CORE: 1,603 PROJECTS</span>
          </div>
          <div className="flex items-center gap-3">
            <span>MODELS: LOGISTIC + HIST-GB + XGBOOST + ISOLATION FOREST</span>
            <span>|</span>
            <span>DECISION SUPPORT: DETERMINISTIC RULES</span>
          </div>
        </div>

      </div>

    </div>
  );
};
