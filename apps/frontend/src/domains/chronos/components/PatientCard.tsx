import React from 'react';
import { Card, Badge } from '@heroui/react';
import type { ChronosPatient } from '../model/chronos.types';
import { Sparkline } from './Sparkline';

function riskColor(level: string): 'danger' | 'warning' | 'accent' | 'success' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH') return 'warning';
  if (level === 'MODERATE') return 'accent';
  return 'success';
}

function riskBg(level: string): string {
  if (level === 'CRITICAL') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (level === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (level === 'MODERATE') return 'bg-cyan-50 text-cyan-800 border-cyan-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function formatPhysio(val: number | null | undefined, digits = 0): string {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  return Number(val).toFixed(digits);
}

function formatFreshness(ts?: string): string {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function PatientCard({
  patient,
  isSelected,
  onClick,
}: {
  patient: ChronosPatient;
  isSelected: boolean;
  onClick: () => void;
}) {
  const {
    patient_id,
    crash_probability_score,
    crash_risk_level,
    predictions,
    clinical_scores,
    current_vitals,
    _crashHistory = [],
    last_updated,
    timestamp,
    inference_errors,
  } = patient;

  const sepsis = predictions?.septic_shock?.risk_probability_percentage ?? 0;
  const bp = predictions?.blood_pressure_collapse?.risk_probability_percentage ?? 0;
  const ca = predictions?.cardiac_arrest?.risk_probability_percentage ?? 0;

  const sofa = clinical_scores?.sofa_score;
  const news2 = clinical_scores?.news2_score;
  const shock = clinical_scores?.shock_index;

  const vitals = current_vitals || {};

  return (
    <Card
      className={`relative flex flex-col justify-between p-3.5 border transition-all cursor-pointer rounded-xl bg-white hover:border-slate-300 hover:shadow-md ${
        isSelected
          ? 'ring-2 ring-teal-600 border-teal-600 shadow-md'
          : 'border-slate-200 shadow-sm'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Open clinical workspace for Patient ${patient_id}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div>
        {/* Primary Row: Patient reference + canonical severity badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              Patient {patient_id}
            </span>
          </div>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${riskBg(
              crash_risk_level
            )}`}
          >
            {crash_risk_level} · {crash_probability_score.toFixed(1)}%
          </span>
        </div>

        {/* Secondary: Current Physiology Grid */}
        <div className="mt-2.5 rounded-lg border border-slate-100 bg-slate-50/80 p-2">
          <div className="flex items-center justify-between mb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            <span>Current Physiology</span>
            <span className="font-normal lowercase text-[9px] text-slate-400">
              {formatFreshness(last_updated || timestamp)}
            </span>
          </div>
          <div className="grid grid-cols-6 gap-1 text-center font-mono">
            <div>
              <span className="block text-[9px] font-sans font-medium text-slate-500">HR</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatPhysio(vitals.heart_rate, 0)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-sans font-medium text-slate-500">MAP</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatPhysio(vitals.mean_arterial_pressure, 0)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-sans font-medium text-slate-500">SpO₂</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatPhysio(vitals.spo2, 0)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-sans font-medium text-slate-500">RR</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatPhysio(vitals.respiratory_rate, 0)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-sans font-medium text-slate-500">Temp</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatPhysio(vitals.temperature, 1)}
              </span>
            </div>
            <div>
              <span className="block text-[9px] font-sans font-medium text-slate-500">Lactate</span>
              <span className="text-xs font-semibold text-slate-800">
                {formatPhysio(vitals.lactate, 1)}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Scores: SOFA, NEWS2, Shock */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="flex flex-col items-center rounded-md border border-slate-200/80 bg-white px-1.5 py-1">
            <span className="text-[9px] font-bold tracking-wider text-slate-400">SOFA</span>
            <span className="text-xs font-bold font-mono text-slate-800">
              {sofa !== null && sofa !== undefined ? Number(sofa).toFixed(0) : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center rounded-md border border-slate-200/80 bg-white px-1.5 py-1">
            <span className="text-[9px] font-bold tracking-wider text-slate-400">NEWS2</span>
            <span className="text-xs font-bold font-mono text-slate-800">
              {news2 !== null && news2 !== undefined ? Number(news2).toFixed(0) : '—'}
            </span>
          </div>
          <div className="flex flex-col items-center rounded-md border border-slate-200/80 bg-white px-1.5 py-1">
            <span className="text-[9px] font-bold tracking-wider text-slate-400">SHOCK</span>
            <span className="text-xs font-bold font-mono text-slate-800">
              {shock !== null && shock !== undefined ? Number(shock).toFixed(2) : '—'}
            </span>
          </div>
        </div>

        {/* Target Predictions: Septic Shock, Hypotension, Cardiac Arrest */}
        <div className="mt-2.5 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <div className="rounded bg-slate-50 p-1 border border-slate-100">
              <span className="block text-[9px] text-slate-500 truncate" title="Septic Shock">
                Septic shock
              </span>
              <span className="font-mono font-bold text-slate-800">
                {sepsis.toFixed(0)}%
              </span>
            </div>
            <div className="rounded bg-slate-50 p-1 border border-slate-100">
              <span className="block text-[9px] text-slate-500 truncate" title="BP Collapse">
                Hypotension
              </span>
              <span className="font-mono font-bold text-slate-800">
                {bp.toFixed(0)}%
              </span>
            </div>
            <div className="rounded bg-slate-50 p-1 border border-slate-100">
              <span className="block text-[9px] text-slate-500 truncate" title="Cardiac Arrest">
                Cardiac arrest
              </span>
              <span className="font-mono font-bold text-slate-800">
                {ca.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Sparkline & freshness */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex-1 max-w-[120px]">
          {_crashHistory.length >= 2 ? (
            <Sparkline data={_crashHistory} width={100} height={20} />
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">1 point</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          {inference_errors?.length ? (
            <span
              className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded border border-amber-200"
              title={`Inference errors: ${inference_errors.join(', ')}`}
            >
              ⚠ {inference_errors.length}
            </span>
          ) : null}
          <span className="font-mono text-[10px] text-slate-400">
            {formatFreshness(last_updated || timestamp)}
          </span>
        </div>
      </div>
    </Card>
  );
}
