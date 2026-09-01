import React from 'react';
import { Card, Badge, ProgressBar } from '@heroui/react';

function riskColor(level: string): 'danger' | 'warning' | 'accent' | 'success' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH') return 'warning';
  if (level === 'MODERATE') return 'accent';
  return 'success';
}

export function PredictionBreakdownCard({
  title,
  emoji,
  avg,
  max,
  aboveThreshold,
  total,
  maxRiskLevel,
}: {
  title: string;
  emoji: string;
  avg: number;
  max: number;
  aboveThreshold: number;
  total: number;
  maxRiskLevel: string;
}) {
  const hasData = total > 0;
  const color = !hasData ? 'success' : avg > 40 ? 'danger' : avg > 25 ? 'warning' : avg > 15 ? 'accent' : 'success';

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
          <span>{emoji}</span> {title}
        </span>
        <Badge color={riskColor(maxRiskLevel)} variant="soft" className="text-[11px]">
          {hasData ? `max ${max.toFixed(1)}%` : '—'}
        </Badge>
      </div>
      <div className="mt-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-slate-800 tabular-nums">{hasData ? `${avg.toFixed(1)}%` : '—'}</span>
          <span className="text-xs text-slate-500">avg across {total} patients</span>
        </div>
        <ProgressBar value={hasData ? avg : 0} maxValue={100} color={color as any} className="mt-2" />
        <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
          <span>{aboveThreshold} above 30%</span>
          <span>Peak: {hasData ? `${max.toFixed(1)}%` : '—'}</span>
        </div>
      </div>
    </Card>
  );
}
