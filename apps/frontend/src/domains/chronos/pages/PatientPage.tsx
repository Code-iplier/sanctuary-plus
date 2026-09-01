import React from 'react';
import { Card, Badge } from '@heroui/react';
import { useChronosContext } from '../context/ChronosContext';
import { DetailPanel } from '../components/DetailPanel';

export function PatientPage() {
  const { selectedPatient } = useChronosContext();
  return (
    <div>
      <Card className="p-3 mb-3">
        <h3 className="font-semibold text-slate-800">Patient Detail</h3>
        <p className="text-xs text-slate-500">Selected patient from Triage — SHAP, physics, trends, history.</p>
      </Card>
      <DetailPanel patient={selectedPatient} />
      {!selectedPatient && <p className="text-xs text-slate-400 mt-2">Tip: Go to Triage and select a patient card to populate this view. History is bounded per Chronos rolling deque.</p>}
    </div>
  );
}
