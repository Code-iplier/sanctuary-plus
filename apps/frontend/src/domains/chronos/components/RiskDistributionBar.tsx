import React from 'react';
import { Badge } from '@heroui/react';

type Counts = { CRITICAL: number; HIGH: number; MODERATE: number; LOW: number };

const ORDER: (keyof Counts)[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

const COLOR_MAP: Record<keyof Counts, string> = {
  CRITICAL: 'bg-red-600',
  HIGH: 'bg-orange-500',
  MODERATE: 'bg-amber-500',
  LOW: 'bg-emerald-500',
};

const BADGE_COLOR: Record<keyof Counts, 'danger' | 'warning' | 'accent' | 'success'> = {
  CRITICAL: 'danger',
  HIGH: 'warning',
  MODERATE: 'accent',
  LOW: 'success',
};

export function RiskDistributionBar({ counts, total }: { counts: Counts; total: number }) {
  const safeTotal = total || 1;
  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden border border-slate-200">
        {ORDER.map((level) => {
          const pct = (counts[level] / safeTotal) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={level}
              className={`${COLOR_MAP[level]} flex items-center justify-center text-[10px] font-bold text-white transition-all`}
              style={{ width: `${pct}%` }}
              title={`${level}: ${counts[level]} (${pct.toFixed(0)}%)`}
            >
              {pct > 8 ? `${pct.toFixed(0)}%` : ''}
            </div>
          );
        })}
        {total === 0 && <div className="flex-1 flex items-center justify-center text-xs text-slate-400">No patients</div>}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {ORDER.map((level) => (
          <span key={level} className="inline-flex items-center gap-1.5 text-xs">
            <span className={`h-2.5 w-2.5 rounded-sm ${COLOR_MAP[level]}`} />
            <span className="font-mono text-slate-600">
              {level}: <strong className="text-slate-800">{counts[level]}</strong>
              <span className="text-slate-400"> ({total ? ((counts[level] / total) * 100).toFixed(0) : 0}%)</span>
            </span>
            <Badge color={BADGE_COLOR[level]} variant="soft" className="text-[10px] ml-1">
              {counts[level]}
            </Badge>
          </span>
        ))}
      </div>
    </div>
  );
}
