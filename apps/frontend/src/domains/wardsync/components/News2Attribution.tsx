import React from 'react';
import { Badge, Card } from '@heroui/react';
import { type News2Score, type VitalsReading } from '../model/types';

interface News2AttributionProps {
  latestScore: News2Score | undefined;
  latestVital: VitalsReading | undefined;
}

export default function News2Attribution({
  latestScore,
  latestVital,
}: News2AttributionProps) {
  const contributingCount = latestScore?.perParameterScore
    ? Object.values(latestScore.perParameterScore).filter((pts) => pts > 0).length
    : 0;

  const getNews2BandLabel = (total: number) => {
    if (total >= 7) return 'NEWS2 ≥7';
    if (total >= 5) return 'NEWS2 5–6';
    if (total >= 1) return 'NEWS2 1–4';
    return 'NEWS2 0';
  };

  return (
    <Card className="p-4 bg-white border border-slate-200 relative overflow-hidden">
      {/* Header with strictly contained, side-by-side horizontal summary pills */}
      <div className="flex items-start justify-between gap-3 mb-3 relative">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800 leading-tight">
            NEWS2 Clinical Parameter Attribution
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Measured physiological inputs mapped to national early warning scores
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          <Badge
            color="default"
            variant="soft"
            className="!relative !top-auto !right-auto !bottom-auto !left-auto !transform-none text-xs font-semibold whitespace-nowrap px-2.5 py-0.5"
          >
            7 Parameters
          </Badge>
          <Badge
            color={contributingCount > 0 ? 'warning' : 'default'}
            variant="soft"
            className="!relative !top-auto !right-auto !bottom-auto !left-auto !transform-none text-xs font-semibold whitespace-nowrap px-2.5 py-0.5"
          >
            +{contributingCount}
          </Badge>
        </div>
      </div>

      {latestScore && latestVital ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {/* 1. Respiration Rate */}
          <AttributionTile
            label="Respiration Rate"
            measured={`${latestVital.respiratoryRate} /min`}
            points={latestScore.perParameterScore.respiratoryRate}
            range="0-point range: 12–20"
          />

          {/* 2. SpO2 Oxygen */}
          <AttributionTile
            label="SpO₂ Oxygen"
            measured={`${latestVital.spo2}% (Scale ${latestVital.spo2Scale})`}
            points={latestScore.perParameterScore.spo2}
            range={
              latestVital.spo2Scale === 2
                ? '0-point range: 88–92%'
                : '0-point range: ≥96%'
            }
          />

          {/* 3. Temperature */}
          <AttributionTile
            label="Temperature"
            measured={`${latestVital.temperature.toFixed(1)} °C`}
            points={latestScore.perParameterScore.temperature}
            range="0-point range: 36.1–38.0"
          />

          {/* 4. Systolic BP */}
          <AttributionTile
            label="Systolic BP"
            measured={`${latestVital.systolicBP} mmHg`}
            points={latestScore.perParameterScore.systolicBP}
            range="0-point range: 111–219"
          />

          {/* 5. Heart Rate */}
          <AttributionTile
            label="Heart Rate"
            measured={`${latestVital.heartRate} bpm`}
            points={latestScore.perParameterScore.heartRate}
            range="0-point range: 51–90"
          />

          {/* 6. Consciousness */}
          <AttributionTile
            label="Consciousness"
            measured={latestVital.consciousness}
            points={latestScore.perParameterScore.consciousness}
            range="0-point range: Alert"
          />

          {/* 7. Supplemental O2 */}
          <AttributionTile
            label="Supplemental O₂"
            measured={latestVital.supplementalOxygen ? 'Yes (Oxygen)' : 'No (Air)'}
            points={latestScore.perParameterScore.supplementalOxygen}
            range="0-point range: No (Air)"
          />

          {/* 8. Total Score Tile */}
          <div className="rounded-lg border border-slate-200 bg-slate-100/90 p-2.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                NEWS2 TOTAL
              </span>
            </div>
            <p className="text-2xl font-bold text-slate-900 my-0.5 leading-tight">
              {latestScore.totalScore}
            </p>
            <span className="text-[10px] text-slate-600 font-medium mt-1">
              {getNews2BandLabel(latestScore.totalScore)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-sm font-medium text-slate-600">
            No vitals recorded for this patient yet.
          </p>
        </div>
      )}
    </Card>
  );
}

function AttributionTile({
  label,
  measured,
  points,
  range,
}: {
  label: string;
  measured: string;
  points: number;
  range: string;
}) {
  const getBadgeColor = (pts: number): 'danger' | 'warning' | 'default' => {
    if (pts >= 3) return 'danger';
    if (pts >= 1) return 'warning';
    return 'default';
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 flex flex-col justify-between hover:bg-slate-50 transition-colors">
      <div className="flex items-center justify-between gap-1 mb-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
          {label}
        </span>
        <Badge
          color={getBadgeColor(points)}
          variant="soft"
          className="!relative !top-auto !right-auto !bottom-auto !left-auto !transform-none text-[11px] px-1.5 py-0.5 font-bold shrink-0"
        >
          +{points}
        </Badge>
      </div>
      <p className="text-base font-bold text-slate-900 my-0.5 leading-tight">
        {measured}
      </p>
      <span className="text-[10px] text-slate-500 mt-1 leading-normal">
        {range}
      </span>
    </div>
  );
}
