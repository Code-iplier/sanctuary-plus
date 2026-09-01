import React from 'react';
import { Card, Badge, ProgressBar, Alert } from '@heroui/react';
import type { ChronosPatient } from '../model/chronos.types';

function riskColor(level: string): 'danger' | 'warning' | 'accent' | 'success' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH') return 'warning';
  if (level === 'MODERATE') return 'accent';
  return 'success';
}

function SHAPList({ drivers }: { drivers: { feature_name: string; shap_value: number; current_value: number; direction: string }[] }) {
  if (!drivers?.length) return <p className="text-xs text-slate-400">No SHAP data.</p>;
  const maxAbs = Math.max(...drivers.map((d) => Math.abs(d.shap_value)), 0.001);
  return (
    <div className="flex flex-col gap-1.5">
      {drivers.slice(0, 5).map((d, i) => {
        const width = (Math.abs(d.shap_value) / maxAbs) * 100;
        const pos = d.shap_value >= 0;
        return (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="flex-1 truncate text-slate-600">{d.feature_name.replace(/_/g, ' ')}</span>
            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full ${pos ? 'bg-cyan-600' : 'bg-red-500'}`} style={{ width: `${width}%` }} />
            </div>
            <span className={`font-mono text-[11px] ${pos ? 'text-cyan-700' : 'text-red-600'}`}>
              {pos ? '+' : ''}{d.shap_value.toFixed(3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DetailPanel({ patient }: { patient: ChronosPatient | null }) {
  if (!patient) {
    return (
      <Card className="p-8 text-center">
        <div className="text-2xl mb-2">🫀</div>
        <p className="font-semibold text-slate-700">No Patient Selected</p>
        <p className="text-xs text-slate-500 mt-1">Select a patient in Triage to view prediction, SHAP, and physics details.</p>
      </Card>
    );
  }

  const { patient_id, crash_probability_score, crash_risk_level, predictions, clinical_scores, last_updated, inference_errors } = patient as any;
  const ca = predictions.cardiac_arrest;
  const metrics = ca?.physics_metrics;

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500">PATIENT ID</p>
            <p className="font-mono font-semibold text-slate-800">{patient_id}</p>
          </div>
          <Badge color={riskColor(crash_risk_level)} variant="soft">
            {crash_risk_level} · {crash_probability_score.toFixed(1)}%
          </Badge>
        </div>
        <ProgressBar value={Math.min(crash_probability_score, 100)} maxValue={100} color={riskColor(crash_risk_level)} className="mt-3" />
        {last_updated && <p className="text-[11px] font-mono text-slate-400 mt-1.5">Updated {new Date(last_updated).toLocaleTimeString()}</p>}
        {inference_errors?.length ? <Alert color="warning" className="text-xs mt-2">Inference warnings: {inference_errors.join(', ')}</Alert> : null}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: 'SOFA', v: clinical_scores.sofa_score },
            { label: 'NEWS2', v: clinical_scores.news2_score },
            { label: 'Shock', v: clinical_scores.shock_index },
          ].map((s) => (
            <div key={s.label} className="rounded-md bg-slate-50 border border-slate-200 p-2 text-center">
              <p className="text-[9px] font-bold tracking-widest text-slate-500">{s.label}</p>
              <p className="font-semibold text-slate-800">{Number(s.v ?? 0).toFixed(s.label === 'Shock' ? 2 : 1)}</p>
            </div>
          ))}
        </div>
      </Card>

      {[
        { title: 'Septic Shock', emoji: '🦠', p: predictions.septic_shock },
        { title: 'BP Collapse', emoji: '💉', p: predictions.blood_pressure_collapse },
        { title: 'Cardiac Arrest', emoji: '🫀', p: predictions.cardiac_arrest },
      ].map(({ title, emoji, p }) => (
        <Card key={title} className="p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-slate-800">
              {emoji} {title}
            </span>
            <Badge color={riskColor(p.risk_level)} variant="soft">
              {p.risk_probability_percentage.toFixed(1)}% · {p.risk_level}
            </Badge>
          </div>
          <ProgressBar value={p.risk_probability_percentage} maxValue={100} color={riskColor(p.risk_level)} className="mt-2" />
          <div className="mt-3">
            <p className="text-[10px] font-bold tracking-widest text-slate-500 mb-1.5">SHAP DRIVERS</p>
            <SHAPList drivers={p.shap_drivers} />
          </div>
        </Card>
      ))}

      {metrics && (
        <Card className="p-4">
          <p className="font-semibold text-sm text-slate-800 mb-2">🔬 Physics Engine</p>
          {ca.physics_override_triggered && ca.alert_reasons.map((r: string, i: number) => <Alert key={i} color="danger" className="text-xs mb-1">{r}</Alert>)}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 border p-2">
              <p className="text-[9px] font-bold tracking-widest text-slate-500">Tissue Hypoxia</p>
              <p className={`font-semibold ${(metrics.tissue_hypoxia_index ?? 0) > 0.65 ? 'text-red-600' : 'text-slate-800'}`}>{((metrics.tissue_hypoxia_index ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-md bg-slate-50 border p-2">
              <p className="text-[9px] font-bold tracking-widest text-slate-500">Hemodynamic Inst.</p>
              <p className={`font-semibold ${(metrics.hemodynamic_instability_score ?? 0) > 0.65 ? 'text-red-600' : 'text-slate-800'}`}>{((metrics.hemodynamic_instability_score ?? 0) * 100).toFixed(1)}%</p>
            </div>
            <div className="rounded-md bg-slate-50 border p-2">
              <p className="text-[9px] font-bold tracking-widest text-slate-500">DO₂</p>
              <p className="font-semibold text-slate-800">{metrics.oxygen_delivery_do2 != null ? `${metrics.oxygen_delivery_do2.toFixed(0)} mL/m²/min` : '—'}</p>
            </div>
            <div className="rounded-md bg-slate-50 border p-2">
              <p className="text-[9px] font-bold tracking-widest text-slate-500">Override</p>
              <p className={`font-bold ${ca.physics_override_triggered ? 'text-red-600' : 'text-slate-600'}`}>{ca.physics_override_triggered ? '🚨 FIRED' : 'Normal'}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
