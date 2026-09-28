import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  borderAccent?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  badge,
  borderAccent
}) => {
  return (
    <div className={`bg-[#252526] border border-[#2d3139] p-3 rounded flex flex-col justify-between ${borderAccent ? `border-l-4 ${borderAccent}` : ''}`}>
      <div className="flex items-center justify-between text-[11px] text-[#858585] font-mono tracking-wider uppercase mb-1">
        <span className="truncate font-semibold">{title}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2 my-0.5">
        <div className="text-xl font-mono font-bold text-[#e1e4e8] tracking-tight truncate">
          {value}
        </div>
        {badge}
      </div>
      {subtitle && (
        <div className="text-[10px] text-[#858585] font-mono truncate mt-1">
          {subtitle}
        </div>
      )}
    </div>
  );
};
