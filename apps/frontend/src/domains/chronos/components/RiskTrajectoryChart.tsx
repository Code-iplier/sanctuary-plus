import React, { useState, useMemo, useRef } from 'react';
import type { ChronosRiskPoint } from '../model/chronos.types';

type RiskTrajectoryChartProps = {
  points: ChronosRiskPoint[];
  className?: string;
};

function formatClockTime(isoString?: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFullTime(isoString?: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function RiskTrajectoryChart({ points, className = '' }: RiskTrajectoryChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG Coordinates setup
  const width = 640;
  const height = 220;
  const padLeft = 46;
  const padRight = 30;
  const padTop = 22;
  const padBottom = 34;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Filter valid points and clamp probabilities to 0-100%
  const validPoints = useMemo(() => {
    return points
      .filter((p) => p && typeof p.crashProbability === 'number' && Number.isFinite(p.crashProbability))
      .map((p) => ({
        timestamp: p.timestamp,
        crashProbability: Math.min(Math.max(p.crashProbability, 0), 100),
      }));
  }, [points]);

  const n = validPoints.length;

  const coords = useMemo(() => {
    if (n === 0) return [];
    if (n === 1) {
      return [{
        x: padLeft + chartW / 2,
        y: padTop + chartH - (validPoints[0].crashProbability / 100) * chartH,
        point: validPoints[0],
      }];
    }
    return validPoints.map((p, i) => {
      const x = padLeft + (i / (n - 1)) * chartW;
      const y = padTop + chartH - (p.crashProbability / 100) * chartH;
      return { x, y, point: p };
    });
  }, [validPoints, n, chartW, chartH, padLeft, padTop]);

  const linePath = useMemo(() => {
    if (coords.length < 2) return '';
    return coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  }, [coords]);

  const areaPath = useMemo(() => {
    if (coords.length < 2) return '';
    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const bottomY = (padTop + chartH).toFixed(1);
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, coords, padTop, chartH]);

  if (n === 0) {
    return (
      <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
        No historical risk trajectory points retained yet. Live trajectory accumulates as streaming events arrive.
      </div>
    );
  }

  const yTicks = [0, 25, 50, 75, 100];
  const latestCoord = coords[coords.length - 1];
  const hoveredCoord = hoveredIndex !== null ? coords[hoveredIndex] : null;

  // Selected or latest info
  const displayCoord = hoveredCoord || latestCoord;
  const isHovered = hoveredCoord !== null;

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Dynamic Summary Bar */}
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Crash Risk Trajectory
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
            {n} {n === 1 ? 'observation' : 'observations'}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-slate-500">
            {isHovered ? 'Observed:' : 'Latest:'}{' '}
            <strong className="font-semibold text-slate-800">
              {displayCoord.point.crashProbability.toFixed(1)}%
            </strong>
          </span>
          <span className="text-slate-400 text-[11px]">
            {formatFullTime(displayCoord.point.timestamp)}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full overflow-visible"
          role="img"
          aria-label="Patient crash risk trajectory chart"
        >
          <defs>
            <linearGradient id="chronosTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y-axis labels */}
          {yTicks.map((tick) => {
            const y = padTop + chartH - (tick / 100) * chartH;
            return (
              <g key={tick}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + chartW}
                  y2={y}
                  stroke={tick === 0 ? '#cbd5e1' : '#e2e8f0'}
                  strokeWidth={tick === 0 ? 1 : 0.75}
                  strokeDasharray={tick === 0 ? undefined : '2,3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && <path d={areaPath} fill="url(#chronosTrendGrad)" />}

          {/* Line trend */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0d9488"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Hover highlight column */}
          {hoveredCoord && (
            <line
              x1={hoveredCoord.x}
              y1={padTop}
              x2={hoveredCoord.x}
              y2={padTop + chartH}
              stroke="#64748b"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {/* Observation Points */}
          {coords.map((c, i) => {
            const isLatest = i === coords.length - 1;
            const isPointHovered = i === hoveredIndex;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Larger transparent target for easy hovering */}
                <circle cx={c.x} cy={c.y} r="8" fill="transparent" />

                {/* Base point circle */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={isPointHovered ? 4.5 : isLatest ? 3.5 : 2.5}
                  fill={isPointHovered ? '#0f766e' : isLatest ? '#0d9488' : '#ffffff'}
                  stroke="#0d9488"
                  strokeWidth={isPointHovered ? 2.5 : 1.5}
                />

                {/* Outer halo for latest point */}
                {isLatest && !isPointHovered && (
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={6.5}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                )}
              </g>
            );
          })}

          {/* X-axis baseline */}
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={padLeft + chartW}
            y2={padTop + chartH}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* X-axis time labels */}
          {coords.length > 1 && (
            <>
              {/* First point time */}
              <text
                x={coords[0].x}
                y={padTop + chartH + 16}
                textAnchor="start"
                className="fill-slate-500 font-mono text-[10px]"
              >
                {formatClockTime(coords[0].point.timestamp)}
              </text>

              {/* Mid point time (if enough points) */}
              {coords.length >= 6 && (
                <text
                  x={coords[Math.floor(coords.length / 2)].x}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  className="fill-slate-400 font-mono text-[10px]"
                >
                  {formatClockTime(coords[Math.floor(coords.length / 2)].point.timestamp)}
                </text>
              )}

              {/* Latest point time */}
              <text
                x={coords[coords.length - 1].x}
                y={padTop + chartH + 16}
                textAnchor="end"
                className="fill-slate-700 font-mono text-[10px] font-semibold"
              >
                {formatClockTime(coords[coords.length - 1].point.timestamp)} (Latest)
              </text>
            </>
          )}

          {coords.length === 1 && (
            <text
              x={coords[0].x}
              y={padTop + chartH + 16}
              textAnchor="middle"
              className="fill-slate-600 font-mono text-[10px]"
            >
              {formatClockTime(coords[0].point.timestamp)}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}
