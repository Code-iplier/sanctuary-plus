import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge, Button, Card } from '@heroui/react';
import { ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { type News2Score, TREND_COLOR } from '../model/types';

interface News2TrendChartProps {
  scores: News2Score[];
}

const POINT_SPACING = 70; // Fixed horizontal distance (px) between sequential observations
const PAD_LEFT = 24;
const PAD_RIGHT = 36;

export default function News2TrendChart({ scores }: News2TrendChartProps) {
  // Sort chronologically (earliest to latest from left to right)
  const sortedScores = useMemo(
    () =>
      [...scores].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [scores],
  );

  const totalCount = sortedScores.length;
  const latestScore = sortedScores.at(-1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtOldest, setIsAtOldest] = useState(true);
  const [isAtNewest, setIsAtNewest] = useState(true);
  const isAtNewestRef = useRef(true);
  const prevTotalRef = useRef(totalCount);

  // Update navigation button disabled states based on current scroll position
  const updateScrollState = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 5) {
      setIsAtOldest(true);
      setIsAtNewest(true);
      isAtNewestRef.current = true;
    } else {
      const atOldest = el.scrollLeft <= 5;
      const atNewest = el.scrollLeft >= maxScroll - 5;
      setIsAtOldest(atOldest);
      setIsAtNewest(atNewest);
      isAtNewestRef.current = atNewest;
    }
  }, []);

  // Handle auto-following new observations or preserving historical view
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const prevTotal = prevTotalRef.current;
    prevTotalRef.current = totalCount;

    // On initial mount or if user was already at newest position, follow latest
    const frameId = requestAnimationFrame(() => {
      if (isAtNewestRef.current || (totalCount !== prevTotal && isAtNewestRef.current)) {
        el.scrollLeft = el.scrollWidth;
      }
      updateScrollState();
    });

    return () => cancelAnimationFrame(frameId);
  }, [totalCount, updateScrollState]);

  // Attach non-passive wheel listener for smooth horizontal trackpad/mousewheel scrolling
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (delta !== 0) {
        const maxScroll = el.scrollWidth - el.clientWidth;
        if ((delta > 0 && el.scrollLeft < maxScroll) || (delta < 0 && el.scrollLeft > 0)) {
          e.preventDefault();
          el.scrollLeft += delta;
          updateScrollState();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [updateScrollState]);

  const scrollOneStep = (direction: -1 | 1) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * POINT_SPACING, behavior: 'smooth' });
    setTimeout(updateScrollState, 200);
  };

  const jumpToLatest = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    setTimeout(updateScrollState, 200);
  };

  if (totalCount === 0) {
    return (
      <Card className="p-4 bg-white border border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">
              NEWS2 Longitudinal Trend
            </h3>
            <p className="text-xs text-slate-500">
              Chronological score trajectory across sequential bedside checks
            </p>
          </div>
        </div>
        <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm font-medium text-slate-600">
            No vitals recorded for this patient yet.
          </p>
        </div>
      </Card>
    );
  }

  // Vertical chart dimensions (substantially taller for clear clinical separation)
  const svgHeight = 300;
  const chartTop = 30;
  const chartBottom = 240;
  const chartHeight = chartBottom - chartTop; // 210px of vertical score space
  const maxScore = 20;

  const getY = (score: number) =>
    chartBottom - (Math.min(maxScore, Math.max(0, score)) / maxScore) * chartHeight;

  // Calculate coordinates for all historical points along continuous timeline
  const points = sortedScores.map((score, index) => {
    const x =
      totalCount === 1
        ? 350
        : PAD_LEFT + index * POINT_SPACING + POINT_SPACING / 2;
    const y = getY(score.totalScore);
    return { x, y, score };
  });

  const rawCanvasWidth = totalCount === 1 ? 700 : PAD_LEFT + totalCount * POINT_SPACING + PAD_RIGHT;
  const canvasWidth = Math.max(rawCanvasWidth, 700);

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPolygonPoints =
    totalCount > 1
      ? `${points[0].x},${chartBottom} ${polylinePoints} ${points[points.length - 1].x},${chartBottom}`
      : '';

  // Multi-day detector for formatting dates
  const isMultiDay =
    sortedScores.length > 1 &&
    new Date(sortedScores[0].createdAt).toDateString() !==
      new Date(sortedScores[sortedScores.length - 1].createdAt).toDateString();

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return '#dc2626'; // danger red
    if (score >= 5) return '#d97706'; // warning amber
    if (score > 0) return '#2563eb'; // clinical blue
    return '#10b981'; // green / normal
  };

  return (
    <Card className="p-4 bg-white border border-slate-200">
      {/* Header: Title and Current Acuity status */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm leading-tight">
            NEWS2 Longitudinal Trend
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological score trajectory across sequential bedside checks
          </p>
        </div>

        {latestScore && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-600 font-medium">
              Current:{' '}
              <span className="font-bold text-slate-900">
                Score {latestScore.totalScore}
              </span>
            </span>
            <Badge
              color={TREND_COLOR[latestScore.trend]}
              variant="soft"
              className="!relative !top-auto !right-auto !bottom-auto !left-auto !transform-none text-xs font-semibold px-2 py-0.5"
            >
              {latestScore.trend}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Chart Area: [← Older] | Fixed Y-Axis Scale | Scrollable Timeline Canvas | [Newer →] */}
      <div className="w-full min-w-0 flex items-center gap-1.5">
        {/* Left Arrow: Older */}
        <Button
          isIconOnly
          size="sm"
          variant="outline"
          isDisabled={isAtOldest || totalCount <= 1}
          onPress={() => scrollOneStep(-1)}
          aria-label="Older observations"
          className="h-12 w-8 shrink-0 rounded-md border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-25 self-center"
        >
          <ChevronLeft size={20} />
        </Button>

        {/* Fixed Y-Axis Scale Pillar (Always visible on left side of timeline) */}
        <div className="shrink-0 w-8 h-[300px] select-none">
          <svg viewBox="0 0 32 300" className="w-full h-full">
            {/* Score 20 */}
            <text
              x={26}
              y={getY(20) + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px] font-semibold"
            >
              20
            </text>

            {/* Score 15 */}
            <text
              x={26}
              y={getY(15) + 4}
              textAnchor="end"
              className="fill-slate-300 text-[9px] font-medium"
            >
              15
            </text>

            {/* Score 10 */}
            <text
              x={26}
              y={getY(10) + 4}
              textAnchor="end"
              className="fill-slate-300 text-[9px] font-medium"
            >
              10
            </text>

            {/* Score 7 (High Clinical Risk) */}
            <text
              x={26}
              y={getY(7) + 4}
              textAnchor="end"
              className="fill-red-600 text-[11px] font-bold"
            >
              7
            </text>

            {/* Score 5 (Medium Clinical Risk) */}
            <text
              x={26}
              y={getY(5) + 4}
              textAnchor="end"
              className="fill-amber-600 text-[11px] font-bold"
            >
              5
            </text>

            {/* Score 0 Baseline */}
            <text
              x={26}
              y={chartBottom + 4}
              textAnchor="end"
              className="fill-slate-600 text-[11px] font-bold"
            >
              0
            </text>
          </svg>
        </div>

        {/* Horizontally Scrollable Timeline Viewport */}
        <div
          ref={scrollContainerRef}
          onScroll={updateScrollState}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden select-none relative scroll-smooth rounded border border-slate-100 bg-slate-50/40"
          style={{ scrollbarWidth: 'thin' }}
        >
          <svg
            viewBox={`0 0 ${canvasWidth} ${svgHeight}`}
            style={{ width: `${canvasWidth}px`, height: `${svgHeight}px`, minWidth: `${canvasWidth}px` }}
            className="select-none block"
          >
            <defs>
              <linearGradient id="news2TrendGradientV4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {/* Horizontal Guideline: Score 20 (Max) */}
            <line
              x1={0}
              y1={getY(20)}
              x2={canvasWidth}
              y2={getY(20)}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="3,3"
            />

            {/* Horizontal Guideline: Score 15 */}
            <line
              x1={0}
              y1={getY(15)}
              x2={canvasWidth}
              y2={getY(15)}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Horizontal Guideline: Score 10 */}
            <line
              x1={0}
              y1={getY(10)}
              x2={canvasWidth}
              y2={getY(10)}
              stroke="#f1f5f9"
              strokeWidth="1"
              strokeDasharray="2,2"
            />

            {/* Horizontal Guideline: Score 7 (High Clinical Risk) */}
            <line
              x1={0}
              y1={getY(7)}
              x2={canvasWidth}
              y2={getY(7)}
              stroke="#fca5a5"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />

            {/* Horizontal Guideline: Score 5 (Medium Clinical Risk) */}
            <line
              x1={0}
              y1={getY(5)}
              x2={canvasWidth}
              y2={getY(5)}
              stroke="#fcd34d"
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />

            {/* Baseline Guideline: Score 0 */}
            <line
              x1={0}
              y1={chartBottom}
              x2={canvasWidth}
              y2={chartBottom}
              stroke="#cbd5e1"
              strokeWidth="1.5"
            />

            {/* Gradient Area Fill (when >= 2 points) */}
            {totalCount > 1 && (
              <polygon points={areaPolygonPoints} fill="url(#news2TrendGradientV4)" />
            )}

            {/* Longitudinal Polyline connecting all points (when >= 2 points) */}
            {totalCount > 1 && (
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Render Every Point, Score Value, and Time strictly at x_i */}
            {points.map((pt, idx) => {
              const color = getScoreColor(pt.score.totalScore);
              return (
                <g key={pt.score.id || idx}>
                  {/* Vertical Guide Tick linking point to X-axis */}
                  <line
                    x1={pt.x}
                    y1={pt.y}
                    x2={pt.x}
                    y2={chartBottom}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />

                  {/* Halo Indicator */}
                  <circle cx={pt.x} cy={pt.y} r="8" fill={color} fillOpacity="0.16" />

                  {/* Core Point Circle */}
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4.5"
                    fill={color}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />

                  {/* Score Number above point */}
                  <text
                    x={pt.x}
                    y={pt.y - 10}
                    textAnchor="middle"
                    className="fill-slate-900 text-[12px] font-bold"
                  >
                    {pt.score.totalScore}
                  </text>

                  {/* Time Label on X Axis */}
                  <text
                    x={pt.x}
                    y={chartBottom + 20}
                    textAnchor="middle"
                    className="fill-slate-700 text-[11px] font-semibold"
                  >
                    {formatTime(pt.score.createdAt)}
                  </text>

                  {/* Date Label on Multi-day Timelines */}
                  {isMultiDay && (
                    <text
                      x={pt.x}
                      y={chartBottom + 34}
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px] font-medium"
                    >
                      {formatDate(pt.score.createdAt)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Arrow: Newer */}
        <Button
          isIconOnly
          size="sm"
          variant="outline"
          isDisabled={isAtNewest || totalCount <= 1}
          onPress={() => scrollOneStep(1)}
          aria-label="Newer observations"
          className="h-12 w-8 shrink-0 rounded-md border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-25 self-center"
        >
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Footer / Jump to Latest Control */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 text-xs">
        <span className="text-slate-400 font-medium">
          {totalCount > 1
            ? `${totalCount} observations in longitudinal flowsheet history · Scroll or use arrows to navigate`
            : 'Single observation recorded'}
        </span>

        {!isAtNewest && totalCount > 1 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 font-semibold inline-flex items-center gap-1"
            onPress={jumpToLatest}
            aria-label="Jump to latest observations"
          >
            Jump to latest <ChevronsRight size={14} />
          </Button>
        )}
      </div>
    </Card>
  );
}
