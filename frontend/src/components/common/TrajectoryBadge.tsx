import React from 'react';

interface TrajectoryBadgeProps {
  state: string;
  velocity?: number;
  size?: 'sm' | 'md';
}

export const TrajectoryBadge: React.FC<TrajectoryBadgeProps> = ({ state, velocity }) => {
  const normState = state?.toUpperCase() || 'STABLE';

  const config: Record<string, { bg: string; text: string; border: string; label: string }> = {
    'RAPIDLY DETERIORATING': {
      bg: 'bg-red-950/80',
      text: 'text-red-300',
      border: 'border-red-700',
      label: 'RAPID DETERIORATION'
    },
    'DETERIORATING': {
      bg: 'bg-orange-950/70',
      text: 'text-orange-300',
      border: 'border-orange-700',
      label: 'DETERIORATING'
    },
    'IMPROVING': {
      bg: 'bg-emerald-950/70',
      text: 'text-emerald-300',
      border: 'border-emerald-700',
      label: 'IMPROVING'
    },
    'STABLE': {
      bg: 'bg-zinc-800/80',
      text: 'text-zinc-300',
      border: 'border-zinc-700',
      label: 'STABLE'
    }
  };

  const item = config[normState] || config.STABLE;

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border ${item.bg} ${item.text} ${item.border}`}>
      <span>[{item.label}]</span>
      {velocity !== undefined && velocity !== 0 && (
        <span className="opacity-80">{velocity > 0 ? `+${velocity.toFixed(1)}` : velocity.toFixed(1)}%/mo</span>
      )}
    </span>
  );
};
