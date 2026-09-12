import React, { useState } from 'react';
import { Badge, Button, Card } from '@heroui/react';
import { AlertCircle, HeartPulse } from 'lucide-react';
import type {
  Consciousness,
  PatientView,
} from '../model/types';
import { recordVitals } from '../api/wardsync.api';
import News2TrendChart from './News2TrendChart';

interface VitalsFlowsheetProps {
  patientView: PatientView | null;
  onRefresh: () => Promise<void>;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
  onObservationRecorded?: () => void;
}

export default function VitalsFlowsheet({
  patientView,
  onRefresh,
  onError,
  onSuccess,
  onObservationRecorded,
}: VitalsFlowsheetProps) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [vitalsInput, setVitalsInput] = useState({
    respiratoryRate: '20',
    spo2: '96',
    spo2Scale: 1 as 1 | 2,
    temperature: '37.5',
    systolicBP: '120',
    heartRate: '84',
    consciousness: 'ALERT' as Consciousness,
    supplementalOxygen: false,
  });

  const updateInput = <K extends keyof typeof vitalsInput>(
    field: K,
    value: (typeof vitalsInput)[K],
  ) => {
    if (formError) setFormError(null);
    setVitalsInput((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): string | null => {
    const rr = Number(vitalsInput.respiratoryRate);
    if (!vitalsInput.respiratoryRate.trim() || Number.isNaN(rr) || rr <= 0) {
      return 'Respiratory rate: value must be a valid positive clinical measurement (breaths/min).';
    }
    const spo2 = Number(vitalsInput.spo2);
    if (!vitalsInput.spo2.trim() || Number.isNaN(spo2) || spo2 < 0 || spo2 > 100) {
      return 'SpO₂: value must be between 0 and 100%.';
    }
    const temp = Number(vitalsInput.temperature);
    if (!vitalsInput.temperature.trim() || Number.isNaN(temp) || temp < 25 || temp > 45) {
      return 'Temperature: value is outside the accepted clinical range (25.0–45.0 °C).';
    }
    const sbp = Number(vitalsInput.systolicBP);
    if (!vitalsInput.systolicBP.trim() || Number.isNaN(sbp) || sbp <= 0) {
      return 'Systolic BP: value must be a valid positive measurement (mmHg).';
    }
    const hr = Number(vitalsInput.heartRate);
    if (!vitalsInput.heartRate.trim() || Number.isNaN(hr) || hr <= 0) {
      return 'Heart rate: value must be a valid positive measurement (bpm).';
    }
    return null;
  };

  const handleRecordVitals = async () => {
    if (!patientView) return;
    const clientErr = validateForm();
    if (clientErr) {
      setFormError(clientErr);
      return;
    }

    setFormError(null);
    setLoading(true);
    try {
      const payload = {
        patientId: patientView.patient.id,
        respiratoryRate: Number(vitalsInput.respiratoryRate),
        spo2: Number(vitalsInput.spo2),
        spo2Scale: Number(vitalsInput.spo2Scale) as 1 | 2,
        temperature: Number(vitalsInput.temperature),
        systolicBP: Number(vitalsInput.systolicBP),
        heartRate: Number(vitalsInput.heartRate),
        consciousness: vitalsInput.consciousness,
        supplementalOxygen: Boolean(vitalsInput.supplementalOxygen),
      };

      const result = await recordVitals(payload);
      const latestScore = result.news2.at(-1);
      setFormError(null);
      onSuccess(
        `Vitals recorded for ${patientView.patient.name}. NEWS2 is ${latestScore?.totalScore ?? 0} (${latestScore?.trend ?? 'STABLE'}).`,
      );
      await onRefresh();
      onObservationRecorded?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not record vitals.';
      setFormError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isMultiDay = Boolean(
    patientView &&
      patientView.vitals.length > 1 &&
      new Date(patientView.vitals[0].takenAt).toDateString() !==
        new Date(patientView.vitals.at(-1)!.takenAt).toDateString(),
  );

  return (
    <div className="flex flex-col gap-4 mt-3">
      {/* 1. NEWS2 Longitudinal Trend Chart */}
      <News2TrendChart scores={patientView?.news2 ?? []} />

      {/* 2. Side-by-side Flowsheet Table & Record Observation Form */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        {/* Active Vitals Flowsheet Table */}
        <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-slate-800">
              Patient Vitals Flowsheet History
            </h3>
            <p className="text-xs text-slate-500">
              Sequential ward observation checks and computed NEWS2 points
            </p>
          </div>
          <Badge color="accent" variant="soft">
            {patientView?.vitals.length ?? 0} Records
          </Badge>
        </div>

        {patientView && patientView.vitals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-2">Obs Time</th>
                  <th className="p-2">RR</th>
                  <th className="p-2">SpO2</th>
                  <th className="p-2">Temp</th>
                  <th className="p-2">BP</th>
                  <th className="p-2">HR</th>
                  <th className="p-2">AVPU</th>
                  <th className="p-2">O2</th>
                  <th className="p-2">NEWS2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...patientView.vitals].reverse().map((vital) => {
                  const scoreObj = patientView.news2.find(
                    (s) => s.readingId === vital.id,
                  );
                  return (
                    <tr key={vital.id} className="hover:bg-slate-50">
                      <td className="p-2 font-mono font-medium text-slate-700">
                        {isMultiDay ? (
                          <span className="whitespace-nowrap">
                            <span className="text-slate-400 font-normal mr-1">
                              {new Date(vital.takenAt).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                            {new Date(vital.takenAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        ) : (
                          new Date(vital.takenAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        )}
                      </td>
                      <td className="p-2">{vital.respiratoryRate}/min</td>
                      <td className="p-2">
                        {vital.spo2}% {vital.spo2Scale === 2 ? '(S2)' : ''}
                      </td>
                      <td className="p-2">{vital.temperature}°C</td>
                      <td className="p-2">{vital.systolicBP}</td>
                      <td className="p-2">{vital.heartRate} bpm</td>
                      <td className="p-2">{vital.consciousness}</td>
                      <td className="p-2">
                        {vital.supplementalOxygen ? 'Yes' : 'Air'}
                      </td>
                      <td className="p-2">
                        <Badge
                          color={
                            (scoreObj?.totalScore ?? 0) >= 7
                              ? 'danger'
                              : (scoreObj?.totalScore ?? 0) >= 5
                                ? 'warning'
                                : 'default'
                          }
                          variant="primary"
                          className="text-[11px] font-bold"
                        >
                          {scoreObj?.totalScore ?? '--'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-lg">
            No previous readings logged. Record an observation to start the flowsheet.
          </div>
        )}
      </Card>

      {/* Bedside Observation Form */}
      <Card className="p-4">
        <h3 className="font-semibold text-slate-800 mb-1">
          Record New Bedside Observation
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Inputs are dynamically validated against national clinical parameters
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">
            <span className="block text-slate-600 mb-1">Respiratory Rate (breaths/min)</span>
            <input
              type="text"
              placeholder="e.g. 18"
              value={vitalsInput.respiratoryRate}
              onChange={(e) => updateInput('respiratoryRate', e.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="text-xs">
            <span className="block text-slate-600 mb-1">SpO2 (%)</span>
            <input
              type="text"
              placeholder="e.g. 96"
              value={vitalsInput.spo2}
              onChange={(e) => updateInput('spo2', e.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="text-xs">
            <span className="block text-slate-600 mb-1">Temperature (°C)</span>
            <input
              type="text"
              placeholder="e.g. 37.5"
              value={vitalsInput.temperature}
              onChange={(e) => updateInput('temperature', e.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="text-xs">
            <span className="block text-slate-600 mb-1">Systolic BP (mmHg)</span>
            <input
              type="text"
              placeholder="e.g. 120"
              value={vitalsInput.systolicBP}
              onChange={(e) => updateInput('systolicBP', e.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="text-xs">
            <span className="block text-slate-600 mb-1">Heart Rate (bpm)</span>
            <input
              type="text"
              placeholder="e.g. 84"
              value={vitalsInput.heartRate}
              onChange={(e) => updateInput('heartRate', e.target.value)}
              className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-900 focus:border-blue-500 focus:outline-none"
            />
          </label>

          <label className="text-xs">
            <span className="block text-slate-600 mb-1">SpO2 Target Scale</span>
            <select
              value={vitalsInput.spo2Scale}
              onChange={(e) =>
                updateInput('spo2Scale', Number(e.target.value) as 1 | 2)
              }
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium"
            >
              <option value={1}>Scale 1 (Normal Target 96%+)</option>
              <option value={2}>Scale 2 (COPD Target 88-92%)</option>
            </select>
          </label>

          <label className="text-xs">
            <span className="block text-slate-600 mb-1">Consciousness (AVPU)</span>
            <select
              value={vitalsInput.consciousness}
              onChange={(e) =>
                updateInput('consciousness', e.target.value as Consciousness)
              }
              className="h-9 w-full rounded border border-slate-300 bg-white px-2 text-xs font-medium"
            >
              <option value="ALERT">Alert</option>
              <option value="CONFUSION">New Confusion</option>
              <option value="VOICE">Responds to Voice</option>
              <option value="PAIN">Responds to Pain</option>
              <option value="UNRESPONSIVE">Unresponsive</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs pt-4">
            <input
              type="checkbox"
              checked={vitalsInput.supplementalOxygen}
              onChange={(e) => updateInput('supplementalOxygen', e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-slate-700 font-medium">Receiving Supplemental O2</span>
          </label>
        </div>

        {/* Validation Error Feedback Banner */}
        {formError && (
          <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="block font-semibold text-rose-950">Observation not recorded</strong>
              <p className="text-rose-800 leading-normal">{formError}</p>
            </div>
          </div>
        )}

        <div className="mt-5">
          <Button
            className="w-full font-semibold"
            variant="primary"
            isDisabled={loading || !patientView}
            onPress={() => void handleRecordVitals()}
          >
            <HeartPulse size={16} /> Calculate &amp; Commit NEWS2
          </Button>
        </div>
      </Card>
    </div>
    </div>
  );
}
