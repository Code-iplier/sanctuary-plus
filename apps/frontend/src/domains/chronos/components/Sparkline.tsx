import React from 'react';

/**
 * Sparkline — small SVG crash-probability trend.
 * Preserved from health-tech/frontend/src/components/PatientCard.jsx Sparkline.
 * Sanctuary adaptation: no global Chronos vars; uses Sanctuary cyan #0891b2 as fallback.
 */
export function Sparkline({ data, width = 80, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const maxVal = Math.max(...data, 50);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const points = data.map((val, i) => {
    const x = padding + (i / (data.length - 1)) * w;
    const y = padding + h - ((val - minVal) / range) * h;
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const areaPath = `M ${points[0]} L ${polyline} L ${padding + w},${padding + h} L ${padding},${padding + h} Z`;
  const latest = data[data.length - 1];
  const prev = data[Math.max(0, data.length - 4)];
  let strokeColor = '#0891b2';
  let gradId = 'sparkGrad-blue';
  if (latest > prev + 3) {
    strokeColor = '#dc2626';
    gradId = 'sparkGrad-red';
  } else if (latest < prev - 3) {
    strokeColor = '#16a34a';
    gradId = 'sparkGrad-green';
  }
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkGrad-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(220,38,38,0.22)" />
          <stop offset="100%" stopColor="rgba(220,38,38,0)" />
        </linearGradient>
        <linearGradient id="sparkGrad-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(22,163,74,0.22)" />
          <stop offset="100%" stopColor="rgba(22,163,74,0)" />
        </linearGradient>
        <linearGradient id="sparkGrad-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(8,145,178,0.22)" />
          <stop offset="100%" stopColor="rgba(8,145,178,0)" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={strokeColor} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
