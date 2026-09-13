import React, { useEffect, useRef, useState } from 'react';
import { Button, Badge, ProgressBar, Alert } from '@heroui/react';
import { X, ShieldAlert, ShieldCheck, Activity, Clock, FileText, AlertTriangle } from 'lucide-react';
import type { ChronosPatient, ChronosRiskPoint } from '../model/chronos.types';
import { RiskTrajectoryChart } from './RiskTrajectoryChart';
import { getPatientHistory } from '../api/chronos.client';

type VitalHistoryRow = {
  timestamp?: string;
  heart_rate?: number | null;
  mean_arterial_pressure?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  spo2?: number | null;
  respiratory_rate?: number | null;
  temperature?: number | null;
  lactate?: number | null;
};

function riskColor(level: string): 'danger' | 'warning' | 'accent' | 'success' {
  if (level === 'CRITICAL') return 'danger';
  if (level === 'HIGH') return 'warning';
  if (level === 'MODERATE') return 'accent';
  return 'success';
}

function riskBadgeClass(level: string): string {
  if (level === 'CRITICAL') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (level === 'HIGH') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (level === 'MODERATE') return 'bg-cyan-50 text-cyan-800 border-cyan-200';
  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function formatPhysio(val: number | null | undefined, digits = 0): string {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  return Number(val).toFixed(digits);
}

function formatClockTime(isoString?: string): string {
  if (!isoString) return '—';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function PatientWorkspaceDialog({
  patient,
  onClose,
}: {
  patient: ChronosPatient | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [history, setHistory] = useState<VitalHistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  // Focus management & ESC key
  useEffect(() => {
    if (!patient) return;
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Lock background scrolling
    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus dialog
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = origOverflow;
      previousActiveElementRef.current?.focus();
    };
  }, [patient, onClose]);

  // Load patient longitudinal history
  useEffect(() => {
    if (!patient?.patient_id) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    setHistoryError(false);

    getPatientHistory(patient.patient_id)
      .then((res) => {
        if (!cancelled) setHistory((res.history as VitalHistoryRow[]) || []);
      })
      .catch(() => {
        if (!cancelled) setHistoryError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patient?.patient_id, patient?.last_updated]);

  if (!patient) return null;

  const {
    patient_id,
    crash_probability_score,
    crash_risk_level,
    predictions,
    clinical_scores,
    current_vitals,
    last_updated,
    timestamp,
    ground_truth,
    _riskHistory = [],
    inference_errors,
  } = patient;

  const ca = predictions?.cardiac_arrest;
  const metrics = ca?.physics_metrics;
  const isOverride = ca?.physics_override_triggered ?? false;
  const alertReasons = ca?.alert_reasons ?? [];

  // Vitals resolution
  const latestHistorical = history.length > 0 ? history[history.length - 1] : null;
  const vitals = current_vitals || {
    heart_rate: latestHistorical?.heart_rate,
    mean_arterial_pressure: latestHistorical?.mean_arterial_pressure,
    systolic_bp: latestHistorical?.systolic_bp,
    diastolic_bp: latestHistorical?.diastolic_bp,
    spo2: latestHistorical?.spo2,
    respiratory_rate: latestHistorical?.respiratory_rate,
    temperature: latestHistorical?.temperature,
    lactate: latestHistorical?.lactate,
  };

  const allDrivers = [
    ...(predictions?.septic_shock?.shap_drivers || []),
    ...(predictions?.blood_pressure_collapse?.shap_drivers || []),
    ...(predictions?.cardiac_arrest?.shap_drivers || []),
  ];

  // Unique top drivers
  const uniqueDrivers = Array.from(
    new Map(allDrivers.map((d) => [d.feature_name, d])).values()
  )
    .sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value))
    .slice(0, 6);

  const maxAbsShap = Math.max(...uniqueDrivers.map((d) => Math.abs(d.shap_value)), 0.001);

  return (
    <div
      className="chronos-dialog-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <section
        ref={dialogRef}
        className="chronos-patient-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chronos-dialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <header className="chronos-dialog-titlebar">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  ICU Clinical Workstation
                </span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-[11px] text-slate-500">
                  Updated {formatClockTime(last_updated || timestamp)}
                </span>
              </div>
              <h2 id="chronos-dialog-title" className="text-xl font-bold tracking-tight text-slate-900 mt-0.5">
                Patient {patient_id}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${riskBadgeClass(
                crash_risk_level
              )}`}
            >
              {crash_risk_level} · {crash_probability_score.toFixed(1)}%
            </span>

            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="Close patient workspace"
              title="Close (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Dialog Body */}
        <div className="chronos-dialog-body p-5 space-y-5">
          {/* Inference Warnings if any */}
          {inference_errors?.length ? (
            <Alert color="warning" className="text-xs">
              <span className="font-semibold">Model inference alert:</span> Fallback calculations engaged for {inference_errors.join(', ')}.
            </Alert>
          ) : null}

          {/* Section 1: Current Physiology */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-teal-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Current Bedside Physiology
                </h3>
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Units: bpm · mmHg · % · /min · °C · mmol/L
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-400">HEART RATE</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {formatPhysio(vitals.heart_rate, 0)}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500">bpm</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-400">MEAN ARTERIAL</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {formatPhysio(vitals.mean_arterial_pressure, 0)}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500">mmHg</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-400">OXYGEN SAT (SpO₂)</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {formatPhysio(vitals.spo2, 0)}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500">%</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-400">RESPIRATORY</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {formatPhysio(vitals.respiratory_rate, 0)}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500">/min</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-400">TEMPERATURE</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {formatPhysio(vitals.temperature, 1)}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500">°C</span>
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-center">
                <span className="text-[10px] font-bold text-slate-400">LACTATE</span>
                <p className="mt-1 font-mono text-lg font-bold text-slate-900">
                  {formatPhysio(vitals.lactate, 1)}{' '}
                  <span className="font-sans text-xs font-normal text-slate-500">mmol/L</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Clinical Risk Trajectory (Visual Focal Point) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <RiskTrajectoryChart points={_riskHistory} />
          </div>

          {/* Section 3: Two-Column Target Predictions & Physics Safety Layer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Target Predictions & SHAP Contributors */}
            <div className="space-y-4">
              {/* Target Predictions */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Early-Warning Target Predictions
                  </h3>
                  <span className="text-[11px] text-slate-400 font-mono">2–6h Clinical Horizon</span>
                </div>

                <div className="space-y-3">
                  {/* Septic Shock */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-slate-800">Septic Shock</span>
                        <p className="text-[11px] text-slate-500">Systemic infection response & metabolic failure</p>
                      </div>
                      <Badge color={riskColor(predictions?.septic_shock?.risk_level || 'LOW')} variant="soft">
                        {predictions?.septic_shock?.risk_probability_percentage.toFixed(1)}% · {predictions?.septic_shock?.risk_level}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={predictions?.septic_shock?.risk_probability_percentage || 0}
                      maxValue={100}
                      color={riskColor(predictions?.septic_shock?.risk_level || 'LOW')}
                      className="mt-2.5"
                    />
                  </div>

                  {/* BP Collapse */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-slate-800">Hypotension / Blood-Pressure Collapse</span>
                        <p className="text-[11px] text-slate-500">Severe circulatory depression (MAP &lt; 65 mmHg)</p>
                      </div>
                      <Badge color={riskColor(predictions?.blood_pressure_collapse?.risk_level || 'LOW')} variant="soft">
                        {predictions?.blood_pressure_collapse?.risk_probability_percentage.toFixed(1)}% · {predictions?.blood_pressure_collapse?.risk_level}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={predictions?.blood_pressure_collapse?.risk_probability_percentage || 0}
                      maxValue={100}
                      color={riskColor(predictions?.blood_pressure_collapse?.risk_level || 'LOW')}
                      className="mt-2.5"
                    />
                  </div>

                  {/* Cardiac Arrest / Hemodynamic Collapse */}
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-sm text-slate-800">Cardiac Arrest / Hemodynamic Collapse</span>
                        <p className="text-[11px] text-slate-500">Circulatory collapse & arrest cascade risk</p>
                      </div>
                      <Badge color={riskColor(predictions?.cardiac_arrest?.risk_level || 'LOW')} variant="soft">
                        {predictions?.cardiac_arrest?.risk_probability_percentage.toFixed(1)}% · {predictions?.cardiac_arrest?.risk_level}
                      </Badge>
                    </div>
                    <ProgressBar
                      value={predictions?.cardiac_arrest?.risk_probability_percentage || 0}
                      maxValue={100}
                      color={riskColor(predictions?.cardiac_arrest?.risk_level || 'LOW')}
                      className="mt-2.5"
                    />
                  </div>
                </div>
              </div>

              {/* Model Contributors (SHAP) */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Model Contributors (SHAP Attribution)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono">Relative Influence</span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3.5 italic">
                  Features contributing to the current model output; these do not establish causation.
                </p>

                {uniqueDrivers.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Feature attribution data unavailable for this observation.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uniqueDrivers.map((d, i) => {
                      const widthPct = (Math.abs(d.shap_value) / maxAbsShap) * 100;
                      const isPositive = d.shap_value >= 0;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="w-36 truncate font-medium text-slate-700" title={d.feature_name}>
                            {d.feature_name.replace(/_/g, ' ')}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full ${isPositive ? 'bg-rose-500' : 'bg-teal-600'}`}
                              style={{ width: `${Math.max(widthPct, 4)}%` }}
                            />
                          </div>
                          <span className={`w-14 text-right font-mono text-[11px] font-semibold ${
                            isPositive ? 'text-rose-600' : 'text-teal-700'
                          }`}>
                            {isPositive ? '+' : ''}{d.shap_value.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Physics Safety Net & Longitudinal Record */}
            <div className="space-y-4">
              {/* Physics Safety Layer */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    {isOverride ? (
                      <ShieldAlert size={16} className="text-rose-600" />
                    ) : (
                      <ShieldCheck size={16} className="text-emerald-600" />
                    )}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Physics Safety Net (Biological Constraints)
                    </h3>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                      isOverride
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isOverride ? 'Safety Override Active' : 'Physics Verified'}
                  </span>
                </div>

                {isOverride ? (
                  <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-rose-700">
                      <AlertTriangle size={14} />
                      <span>Deterministic Biological Boundary Breached</span>
                    </div>
                    {alertReasons.map((reason, idx) => (
                      <p key={idx} className="font-mono text-[11px] pl-5">
                        • {reason}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 mb-3">
                    Continuous monitoring of Fick principle oxygen transport and microvascular compliance. All biological parameters remain within compensatory boundaries.
                  </p>
                )}

                {/* Physics Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tissue Hypoxia Index</span>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                      {metrics?.tissue_hypoxia_index !== undefined ? metrics.tissue_hypoxia_index.toFixed(3) : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Normal &lt; 0.40</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hemodynamic Instability</span>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                      {metrics?.hemodynamic_instability_score !== undefined ? metrics.hemodynamic_instability_score.toFixed(3) : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Normal &lt; 0.50</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">O₂ Delivery (DO₂)</span>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                      {metrics?.oxygen_delivery_do2 !== undefined ? metrics.oxygen_delivery_do2.toFixed(1) : '—'}{' '}
                      <span className="text-[10px] font-normal text-slate-500">mL/min/m²</span>
                    </p>
                    <span className="text-[10px] text-slate-400">Critical &lt; 330</span>
                  </div>

                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">O₂ Extraction Ratio</span>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-800">
                      {metrics?.o2_extraction_ratio !== undefined ? `${(metrics.o2_extraction_ratio * 100).toFixed(1)}%` : '—'}
                    </p>
                    <span className="text-[10px] text-slate-400">Exhaustion &gt; 70%</span>
                  </div>
                </div>
              </div>

              {/* Longitudinal History Table */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-slate-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Longitudinal Clinical Record
                    </h3>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    Last {history.length} Readings
                  </span>
                </div>

                {loadingHistory ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Loading clinical history…</p>
                ) : historyError ? (
                  <p className="text-xs text-amber-700 py-3 text-center">History record unavailable for this patient.</p>
                ) : history.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No retained clinical observations available.</p>
                ) : (
                  <div className="overflow-x-auto max-h-56 overflow-y-auto border border-slate-100 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold tracking-wider text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-2.5">TIME</th>
                          <th className="py-2 px-1.5 text-right font-mono">HR</th>
                          <th className="py-2 px-1.5 text-right font-mono">MAP</th>
                          <th className="py-2 px-1.5 text-right font-mono">SpO₂</th>
                          <th className="py-2 px-1.5 text-right font-mono">RR</th>
                          <th className="py-2 px-1.5 text-right font-mono">TEMP</th>
                          <th className="py-2 px-2 text-right font-mono">LACT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-slate-600 text-[11px]">
                        {[...history].reverse().map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="py-1.5 px-2.5 text-slate-500 whitespace-nowrap">
                              {formatClockTime(row.timestamp)}
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-semibold text-slate-800">
                              {formatPhysio(row.heart_rate, 0)}
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-semibold text-slate-800">
                              {formatPhysio(row.mean_arterial_pressure, 0)}
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-semibold text-slate-800">
                              {formatPhysio(row.spo2, 0)}
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-semibold text-slate-800">
                              {formatPhysio(row.respiratory_rate, 0)}
                            </td>
                            <td className="py-1.5 px-1.5 text-right text-slate-700">
                              {formatPhysio(row.temperature, 1)}
                            </td>
                            <td className="py-1.5 px-2 text-right text-slate-700">
                              {formatPhysio(row.lactate, 1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Stream Validation Overlay (if present) */}
              {ground_truth && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-600">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-700 uppercase tracking-wide text-[10px]">
                      Replay Ground Truth Overlay
                    </span>
                    <Badge color="default" variant="soft" className="text-[10px]">
                      MIMIC Demo Dataset
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono mt-2">
                    <div className="bg-white p-1.5 rounded border border-slate-200/60">
                      <span className="block text-[9px] text-slate-400">SEPSIS</span>
                      <span className={ground_truth.sepsis_occurred ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                        {ground_truth.sepsis_occurred ? 'OCCURRED' : 'NONE'}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200/60">
                      <span className="block text-[9px] text-slate-400">BP COLLAPSE</span>
                      <span className={ground_truth.bp_collapse_occurred ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                        {ground_truth.bp_collapse_occurred ? 'OCCURRED' : 'NONE'}
                      </span>
                    </div>
                    <div className="bg-white p-1.5 rounded border border-slate-200/60">
                      <span className="block text-[9px] text-slate-400">CARDIAC EVENT</span>
                      <span className={ground_truth.cardiac_event_occurred ? 'text-rose-600 font-bold' : 'text-emerald-700'}>
                        {ground_truth.cardiac_event_occurred ? 'OCCURRED' : 'NONE'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
