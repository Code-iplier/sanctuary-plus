import React, { useState, useMemo } from 'react';
import { Card, Button, Alert } from '@heroui/react';
import { Activity, AlertTriangle, HeartPulse, Radio } from 'lucide-react';
import { useChronosContext } from '../context/ChronosContext';
import { PatientCard } from '../components/PatientCard';
import { DetailPanel } from '../components/DetailPanel';
import { ChronosWorkspaceState } from '../components/ChronosWorkspaceState';
import type { ChronosPatient, RiskFilter } from '../model/chronos.types';

const SORT_OPTIONS = [
  {
    id: 'crash_prob',
    label: 'Crash Probability ↓',
    getter: (p: ChronosPatient) => p.crash_probability_score || 0,
    desc: true,
  },
  {
    id: 'sofa',
    label: 'SOFA ↓',
    getter: (p: ChronosPatient) => p.clinical_scores?.sofa_score || 0,
    desc: true,
  },
  {
    id: 'news2',
    label: 'NEWS2 ↓',
    getter: (p: ChronosPatient) => p.clinical_scores?.news2_score || 0,
    desc: true,
  },
  {
    id: 'sepsis',
    label: 'Sepsis ↓',
    getter: (p: ChronosPatient) =>
      p.predictions?.septic_shock?.risk_probability_percentage || 0,
    desc: true,
  },
  {
    id: 'cardiac',
    label: 'Cardiac ↓',
    getter: (p: ChronosPatient) =>
      p.predictions?.cardiac_arrest?.risk_probability_percentage || 0,
    desc: true,
  },
] as const;

const RISK_LEVELS: RiskFilter[] = [
  'ALL',
  'CRITICAL',
  'HIGH',
  'MODERATE',
  'LOW',
];

export function TriagePage() {
  const {
    patients,
    selected,
    selectedPatient,
    selectPatient,
    connected,
    apiOnline,
    modelsLoaded,
    connectionState,
    lastEventAt,
  } = useChronosContext();
  const [sortBy, setSortBy] = useState('crash_prob');
  const [filterRisk, setFilterRisk] = useState<RiskFilter>('ALL');

  const displayPatients = useMemo(() => {
    const all = Object.values(patients);
    const filtered =
      filterRisk === 'ALL'
        ? all
        : all.filter((p) => p.crash_risk_level === filterRisk);
    const opt = SORT_OPTIONS.find((s) => s.id === sortBy) ?? SORT_OPTIONS[0];
    return [...filtered].sort((a, b) => {
      const va = opt.getter(a);
      const vb = opt.getter(b);
      return opt.desc
        ? (vb as number) - (va as number)
        : (va as number) - (vb as number);
    });
  }, [patients, sortBy, filterRisk]);

  const totalCount = Object.keys(patients).length;
  const riskCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    Object.values(patients).forEach((patient) => {
      if (patient.crash_risk_level in counts)
        counts[patient.crash_risk_level] += 1;
    });
    return counts;
  }, [patients]);
  const lastUpdate =
    lastEventAt ??
    Object.values(patients)
      .map((p) => p.last_updated ?? p.timestamp)
      .filter(Boolean)
      .sort()
      .at(-1) ??
    null;
  const hasPatients = totalCount > 0;
  const showScaffold = !hasPatients && connectionState !== 'LIVE';

  return (
    <div className="flex flex-col gap-3">
      {/* Connection / status band — distinct states without fake data */}
      {connectionState === 'STALE' && (
        <Alert color="danger" className="text-xs">
          <span className="font-semibold">Chronos API offline</span> — no new
          predictions will arrive. Retained patient values remain visible and
          should be treated as stale.
        </Alert>
      )}
      {connectionState === 'CONNECTING' && hasPatients && (
        <Alert color="warning" className="text-xs">
          Chronos API online ·{' '}
          <span className="font-semibold">live stream reconnecting</span>.
          Retained predictions stay visible while Chronos reconnects.
        </Alert>
      )}

      <section
        className="chronos-command-bar"
        aria-label="Chronos triage status"
      >
        <div className="chronos-command-heading">
          <div className="chronos-command-icon">
            <HeartPulse size={20} />
          </div>
          <div>
            <p className="chronos-eyebrow">ICU DECISION SUPPORT</p>
            <h3>Triage radar</h3>
            <p>
              Ranked patient signals from the live Chronos prediction stream.
            </p>
          </div>
        </div>
        <div className="chronos-command-meta">
          <span
            className={`chronos-live-state ${connected ? 'is-live' : 'is-muted'}`}
          >
            <Radio size={13} /> {connectionState}
          </span>
          <span>
            Last event{' '}
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
          </span>
        </div>
      </section>
      <div
        className="chronos-risk-summary"
        aria-label="Patient risk distribution"
      >
        {[
          {
            label: 'Critical',
            value: riskCounts.CRITICAL,
            tone: 'critical',
            icon: AlertTriangle,
          },
          {
            label: 'High',
            value: riskCounts.HIGH,
            tone: 'high',
            icon: Activity,
          },
          {
            label: 'Moderate',
            value: riskCounts.MODERATE,
            tone: 'moderate',
            icon: Activity,
          },
          { label: 'Low', value: riskCounts.LOW, tone: 'low', icon: Activity },
        ].map(({ label, value, tone, icon: Icon }) => (
          <Card
            key={label}
            className={`chronos-risk-tile chronos-risk-${tone}`}
          >
            <div>
              <p>{label}</p>
              <strong>{value}</strong>
              <span>{value === 1 ? 'patient' : 'patients'}</span>
            </div>
            <Icon size={18} aria-hidden="true" />
          </Card>
        ))}
      </div>

      {/* Summary / context row — hierarchy: population + controls */}
      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono font-semibold tracking-wide text-slate-700">
            {displayPatients.length} / {totalCount} PATIENTS
          </span>
          <span className="text-slate-300">·</span>
          <label className="flex items-center gap-1.5 text-slate-600">
            <span className="text-[11px] font-bold tracking-widest">SORT</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span className="font-mono text-[11px] text-slate-500">
            {modelsLoaded.length ? `${modelsLoaded.length} models · ` : ''}
            {connected ? 'Live' : apiOnline ? 'Polling' : 'Offline'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RISK_LEVELS.map((level) => (
            <Button
              key={level}
              size="sm"
              variant={filterRisk === level ? 'primary' : 'outline'}
              onPress={() => setFilterRisk(level)}
            >
              {level}
            </Button>
          ))}
        </div>
      </Card>

      {showScaffold ? <ChronosWorkspaceState state={connectionState} /> : null}

      {/* Patient list + detail — responsive, no horizontal overflow */}
      {hasPatients && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] chronos-layout">
          <div className="flex flex-col gap-2 min-w-0">
            {displayPatients.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-500">
                No patients match filter “{filterRisk}”. Clear filter to see
                all.
              </Card>
            ) : (
              displayPatients.map((p) => (
                <PatientCard
                  key={p.patient_id}
                  patient={p}
                  isSelected={selected === p.patient_id}
                  onClick={() => selectPatient(p.patient_id)}
                />
              ))
            )}
          </div>
          <div className="min-w-0">
            <DetailPanel patient={selectedPatient} />
          </div>
        </div>
      )}
    </div>
  );
}
