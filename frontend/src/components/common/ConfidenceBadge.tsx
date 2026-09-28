import React from 'react';

interface ConfidenceBadgeProps {
  score: number;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ score }) => {
  const isHigh = score >= 85.0;
  const isMedium = score >= 60.0 && score < 85.0;

  const style = isHigh
    ? 'bg-blue-950/60 text-blue-400 border-blue-800/60'
    : isMedium
    ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
    : 'bg-red-950/60 text-red-400 border-red-800/60';

  const label = isHigh ? 'TRUSTED' : isMedium ? 'MODERATE' : 'AUDIT REQ';

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border ${style}`}>
      <span>[{label}]</span>
      <span>{score.toFixed(1)}%</span>
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const norm = severity?.toUpperCase() || 'INFO';
  const styles: Record<string, string> = {
    CRITICAL: 'bg-red-950/80 text-red-300 border-red-700',
    ERROR: 'bg-red-950/70 text-red-400 border-red-800',
    WARNING: 'bg-amber-950/70 text-amber-400 border-amber-800',
    INFO: 'bg-zinc-800 text-zinc-300 border-zinc-700'
  };

  return (
    <span className={`inline-block font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${styles[norm] || styles.INFO}`}>
      [{norm}]
    </span>
  );
};
