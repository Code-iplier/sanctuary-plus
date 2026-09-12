import React from 'react';
import { Badge, Card, ProgressBar } from '@heroui/react';
import {
  formatObservationFreshness,
  type News2Score,
  type Patient,
  TREND_COLOR,
  type VitalsReading,
} from '../model/types';

interface SelectedBedsideRecordProps {
  patient: Patient | undefined;
  latestScore: News2Score | undefined;
  latestVital?: VitalsReading | undefined;
  scoreTrail: string;
}

export default function SelectedBedsideRecord({
  patient,
  latestScore,
  latestVital,
  scoreTrail,
}: SelectedBedsideRecordProps) {
  const freshness = formatObservationFreshness(latestVital?.takenAt ?? latestScore?.createdAt);

  return (
    <Card className="p-4 bg-white border border-slate-200 relative overflow-hidden">
      {/* Top row: Patient Identity & Anchored Status Badge (strictly contained) */}
      <div className="flex items-start justify-between gap-3 relative">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Selected Bedside Record
          </span>
          <h3 className="text-xl font-bold text-slate-900 leading-tight truncate mt-0.5">
            {patient?.name ?? 'Loading...'}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">
            {patient?.id} · {patient?.ward} · Bed {patient?.bed}
            {patient?.age ? ` · ${patient.age}y${patient.sex ? ` ${patient.sex}` : ''}` : ''}
            {patient?.mrn ? ` · ${patient.mrn}` : ''}
          </p>
          {(patient?.resuscitationStatus || patient?.consultant || patient?.primaryDiagnosis) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px]">
              {patient.resuscitationStatus && (
                <span
                  className={`px-2 py-0.5 rounded font-medium ${
                    patient.resuscitationStatus.includes('DNACPR')
                      ? 'bg-purple-50 text-purple-800 border border-purple-200'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {patient.resuscitationStatus}
                </span>
              )}
              {patient.consultant && (
                <span className="text-slate-500">
                  Attending: <span className="font-medium text-slate-700">{patient.consultant}</span>
                </span>
              )}
              {patient.primaryDiagnosis && (
                <span className="text-slate-500 truncate max-w-xs" title={patient.primaryDiagnosis}>
                  · {patient.primaryDiagnosis}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-end">
          <Badge
            color={latestScore ? TREND_COLOR[latestScore.trend] : 'default'}
            variant="soft"
            className="!relative !top-auto !right-auto !bottom-auto !left-auto !transform-none text-sm px-3 py-1 font-semibold whitespace-nowrap"
          >
            NEWS2 {latestScore?.totalScore ?? 0} ·{' '}
            {latestScore?.trend ?? 'STABLE'}
          </Badge>
        </div>
      </div>

      {/* Bottom section: NEWS2 Score (0–20), Progress Bar, Trend & Last Checked */}
      {latestScore && latestVital ? (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>NEWS2 Score (0–20)</span>
            <span className="font-semibold text-slate-700">
              Score: {latestScore.totalScore} / 20
            </span>
          </div>

          <ProgressBar
            value={latestScore.totalScore * 5}
            maxValue={100}
            color={
              latestScore.totalScore >= 7
                ? 'danger'
                : latestScore.totalScore >= 5
                  ? 'warning'
                  : 'default'
            }
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 mt-2">
            <span>
              NEWS2 Trend:{' '}
              <span className="font-medium text-slate-700">
                {scoreTrail || 'No previous observations'}
              </span>
            </span>
            <span className="text-right">
              Last checked: {freshness.text}
              {freshness.isStale && (
                <span className="ml-1.5 text-amber-600 font-medium">
                  · Fresh observation recommended
                </span>
              )}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 p-3 text-center text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <p className="text-xs font-medium text-slate-600">
            No vitals recorded
          </p>
        </div>
      )}
    </Card>
  );
}
