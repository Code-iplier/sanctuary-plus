import React from 'react';
import { Card, Badge } from '@heroui/react';
import { Heart } from 'lucide-react';
import type { ChronosPatient } from '../model/chronos.types';
import { Sparkline } from './Sparkline';

const CLINICAL_CHIPS = [
  { key: 'sofa_score' as const, label: 'SOFA' },
  { key: 'news2_score' as const, label: 'NEWS2' },
  { key: 'shock_index' as const, label: 'Shock' },
];

function riskColor(level: string): 'danger' | 'warning' | 'accent' | 'success' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH') return 'warning';
  if (level === 'MODERATE') return 'accent';
  return 'success';
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
  const { patient_id, crash_probability_score, crash_risk_level, predictions, clinical_scores, _crashHistory = [], last_updated, inference_errors } = patient as any;
  const sepsis = predictions.septic_shock?.risk_probability_percentage ?? 0;
  const bp = predictions.blood_pressure_collapse?.risk_probability_percentage ?? 0;
  const ca = predictions.cardiac_arrest?.risk_probability_percentage ?? 0;

  return (
    <Card
      className={`p-3 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-cyan-600' : 'hover:shadow-md'} card-hover`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold tracking-wide text-slate-700">PATIENT {patient_id}</span>
        <Badge color={riskColor(crash_risk_level)} variant="soft">
          {crash_probability_score.toFixed(1)}% · {crash_risk_level}
        </Badge>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex gap-1.5 flex-1">
          {CLINICAL_CHIPS.map((chip) => {
            const val = (clinical_scores as Record<string, number>)[chip.key];
            return (
              <div key={chip.key} className="flex flex-col items-center rounded-md bg-slate-50 border border-slate-200 px-2 py-1 min-w-[56px]">
                <span className="text-[9px] font-semibold tracking-widest text-slate-500">{chip.label}</span>
                <span className="text-xs font-bold text-slate-800">
                  {val != null ? Number(val).toFixed(chip.key === 'shock_index' ? 2 : 0) : '—'}
                </span>
              </div>
            );
          })}
        </div>
        {_crashHistory.length >= 2 && <Sparkline data={_crashHistory} width={72} height={18} />}
      </div>

      <div className="flex gap-1.5 mt-2.5 flex-wrap items-center">
        <Badge color="accent" variant="soft" className="text-[10px]">SEP {sepsis.toFixed(0)}%</Badge>
        <Badge color={bp > 30 ? 'warning' : 'success'} variant="soft" className="text-[10px]">HYP {bp.toFixed(0)}%</Badge>
        <Badge color={ca > 30 ? 'danger' : 'success'} variant="soft" className="text-[10px]">CA {ca.toFixed(0)}%</Badge>
        {last_updated && <span className="ml-auto text-[10px] font-mono text-slate-400">{new Date(last_updated).toLocaleTimeString()}</span>}
        {inference_errors?.length ? <Badge color="warning" variant="soft" className="text-[10px]">⚠ {inference_errors.length}</Badge> : null}
      </div>
    </Card>
  );
}
