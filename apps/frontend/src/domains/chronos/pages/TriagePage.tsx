import React, { useState, useMemo } from 'react';
import { Card, Badge, Button, Alert } from '@heroui/react';
import { useChronosContext } from '../context/ChronosContext';
import { PatientCard } from '../components/PatientCard';
import { DetailPanel } from '../components/DetailPanel';
import type { RiskFilter } from '../model/chronos.types';

const SORT_OPTIONS = [
  { id: 'crash_prob', label: 'Crash Probability ↓', getter: (p: any) => p.crash_probability_score || 0, desc: true },
  { id: 'sofa', label: 'SOFA ↓', getter: (p: any) => p.clinical_scores?.sofa_score || 0, desc: true },
  { id: 'news2', label: 'NEWS2 ↓', getter: (p: any) => p.clinical_scores?.news2_score || 0, desc: true },
  { id: 'sepsis', label: 'Sepsis ↓', getter: (p: any) => p.predictions?.septic_shock?.risk_probability_percentage || 0, desc: true },
  { id: 'cardiac', label: 'Cardiac ↓', getter: (p: any) => p.predictions?.cardiac_arrest?.risk_probability_percentage || 0, desc: true },
] as const;

const RISK_LEVELS: RiskFilter[] = ['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

export function TriagePage() {
  const { patients, selected, selectedPatient, selectPatient, connected, apiOnline, modelsLoaded } = useChronosContext();
  const [sortBy, setSortBy] = useState('crash_prob');
  const [filterRisk, setFilterRisk] = useState<RiskFilter>('ALL');

  const displayPatients = useMemo(() => {
    const all = Object.values(patients);
    const filtered = filterRisk === 'ALL' ? all : all.filter((p) => p.crash_risk_level === filterRisk);
    const opt = SORT_OPTIONS.find((s) => s.id === sortBy) ?? SORT_OPTIONS[0];
    return [...filtered].sort((a: any, b: any) => {
      const va = opt.getter(a);
      const vb = opt.getter(b);
      return opt.desc ? (vb as number) - (va as number) : (va as number) - (vb as number);
    });
  }, [patients, sortBy, filterRisk]);

  const totalCount = Object.keys(patients).length;
  const hasPatients = totalCount > 0;
  const isLoading = !apiOnline && !hasPatients;
  const isOffline = !apiOnline && hasPatients;
  const isStreamDisconnected = apiOnline && !connected;

  return (
    <div className="flex flex-col gap-3">
      {/* Connection / status band — distinct states without fake data */}
      {isLoading && (
        <Card className="p-3 flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-slate-700">Connecting to Chronos</p>
            <p className="text-xs text-slate-500">Checking FastAPI health at /api/chronos/summary · Retrying every 10s.</p>
          </div>
        </Card>
      )}
      {!isLoading && !apiOnline && (
        <Alert color="danger" className="text-xs">
          <span className="font-semibold">Chronos API offline</span> — FastAPI 8000 unreachable. No new predictions will arrive. Existing patients remain visible but are stale.
        </Alert>
      )}
      {apiOnline && isStreamDisconnected && (
        <Alert color="warning" className="text-xs">
          Chronos API online · <span className="font-semibold">Live stream disconnected</span> — Reconnecting to /ws/triage/all automatically. Predictions remain accessible via REST.
        </Alert>
      )}

      {/* Summary / context row — hierarchy: population + controls */}
      <Card className="p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-mono font-semibold tracking-wide text-slate-700">
            {displayPatients.length} / {totalCount} PATIENTS
          </span>
          <span className="text-slate-300">·</span>
          <label className="flex items-center gap-1.5 text-slate-600">
            <span className="text-[11px] font-bold tracking-widest">SORT</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs">
              {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </label>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span className="font-mono text-[11px] text-slate-500">
            {modelsLoaded.length ? `${modelsLoaded.length} models · ` : ''}{connected ? 'Live' : apiOnline ? 'Polling' : 'Offline'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RISK_LEVELS.map((level) => (
            <Button key={level} size="sm" variant={filterRisk === level ? 'primary' : 'outline'} onPress={() => setFilterRisk(level)}>
              {level}
            </Button>
          ))}
        </div>
      </Card>

      {/* Empty — explicit no-patients, no fake rows */}
      {!hasPatients && apiOnline && connected && (
        <Card className="p-8 text-center">
          <div className="text-2xl mb-2">📡</div>
          <p className="font-semibold text-slate-700">No active patients</p>
          <p className="text-xs text-slate-500 mt-1">Chronos is connected. Patients appear here when the streamer posts vitals to FastAPI /predict and events flow through /ws/triage/all.</p>
          <p className="text-[11px] font-mono text-slate-400 mt-2">POST /api/chronos/predict → services/chronos → /ws/triage/all</p>
        </Card>
      )}
      {!hasPatients && apiOnline && !connected && !isLoading && (
        <Card className="p-6 text-center">
          <p className="text-sm font-semibold text-slate-700">Waiting for stream</p>
          <p className="text-xs text-slate-500 mt-1">API is online but triage stream is reconnecting. Patients will appear once WebSocket re-establishes.</p>
        </Card>
      )}

      {/* Patient list + detail — responsive, no horizontal overflow */}
      {hasPatients && (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_360px] chronos-layout">
          <div className="flex flex-col gap-2 min-w-0">
            {displayPatients.length === 0 ? (
              <Card className="p-6 text-center text-xs text-slate-500">No patients match filter “{filterRisk}”. Clear filter to see all.</Card>
            ) : (
              displayPatients.map((p: any) => (
                <PatientCard key={p.patient_id} patient={p} isSelected={selected === p.patient_id} onClick={() => selectPatient(p.patient_id)} />
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
