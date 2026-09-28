import React from 'react';

interface RiskBadgeProps {
  score?: number;
  band?: string;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ score, band, size = 'sm', showScore = true }) => {
  const normalizedBand = band?.toUpperCase() || (score !== undefined ? (score >= 80 ? 'CRITICAL' : score >= 60 ? 'HIGH' : score >= 35 ? 'MODERATE' : 'LOW') : 'LOW');

  const colorStyles: Record<string, string> = {
    CRITICAL: 'bg-red-950/60 text-red-400 border-red-800/60',
    HIGH: 'bg-orange-950/60 text-orange-400 border-orange-800/60',
    MODERATE: 'bg-yellow-950/60 text-yellow-400 border-yellow-800/60',
    LOW: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
  };

  const sizeStyles = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1 font-semibold'
  };

  const style = colorStyles[normalizedBand] || colorStyles.LOW;

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold border rounded ${style} ${sizeStyles[size]}`}>
      <span>[{normalizedBand}]</span>
      {showScore && score !== undefined && (
        <span className="opacity-80">{score.toFixed(1)}%</span>
      )}
    </span>
  );
};
