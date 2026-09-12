import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@heroui/react';
import { Activity } from 'lucide-react';
import { getPatientHistory } from '../api/chronos.client';
import type { ChronosPatient, ChronosRiskPoint } from '../model/chronos.types';

type VitalHistoryRow = {
  timestamp?: string;
  heart_rate?: number;
  mean_arterial_pressure?: number;
  spo2?: number;
  respiratory_rate?: number;
  temperature?: number;
  lactate?: number;
};

function formatTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString();
}

function formatValue(value: unknown, digits = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '—';
}

function RiskTrend({ points }: { points: ChronosRiskPoint[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return '';
    return points
      .map((point, index) => {
        const x = (index / (points.length - 1)) * 100;
        const y =
          42 - Math.min(Math.max(point.crashProbability, 0), 100) * 0.38;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [points]);

  if (!points.length) {
    return (
      <p className="text-xs text-slate-400">
        Risk points appear as live Chronos WebSocket events arrive.
      </p>
    );
  }

  return (
    <div>
      <svg
        viewBox="0 0 100 44"
        className="h-20 w-full"
        role="img"
        aria-label="Crash probability trend"
      >
        <path
          d="M 0 42 H 100"
          stroke="rgba(148,163,184,0.35)"
          strokeWidth="0.5"
        />
        {path ? (
          <path
            d={path}
            fill="none"
            stroke="#0891b2"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        {points.length === 1 ? (
          <circle
            cx="50"
            cy={
              42 - Math.min(Math.max(points[0].crashProbability, 0), 100) * 0.38
            }
            r="2"
            fill="#0891b2"
          />
        ) : null}
      </svg>
      <div className="flex justify-between text-[10px] font-mono text-slate-400">
        <span>{formatTime(points[0]?.timestamp)}</span>
        <span>
          {points[points.length - 1]?.crashProbability.toFixed(1)}% latest
        </span>
        <span>{formatTime(points[points.length - 1]?.timestamp)}</span>
      </div>
    </div>
  );
}

export function PatientHistoryPanel({
  patient,
}: {
  patient: ChronosPatient | null;
}) {
  const [history, setHistory] = useState<VitalHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!patient?.patient_id) {
      setHistory([]);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    getPatientHistory(patient.patient_id)
      .then((response) => {
        if (!cancelled) setHistory(response.history as VitalHistoryRow[]);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patient?.patient_id, patient?.last_updated]);

  if (!patient) return null;
  const latestRows = [...history].reverse();
  const riskPoints = patient._riskHistory ?? [];

  return (
    <div className="flex flex-col gap-3">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
              <Activity size={15} /> Live risk trend
            </h4>
            <p className="text-xs text-slate-500">
              Last {riskPoints.length} browser-session Chronos events, bounded
              to 24.
            </p>
          </div>
        </div>
        <div className="mt-2">
          <RiskTrend points={riskPoints} />
        </div>
      </Card>

      <Card className="p-4 overflow-hidden">
        <h4 className="font-semibold text-sm text-slate-800">
          Chronos vital history
        </h4>
        <p className="text-xs text-slate-500 mt-1">
          Raw readings retained by Chronos for this patient; latest 24 readings
          only.
        </p>
        {loading ? (
          <p className="text-xs text-slate-400 mt-3">
            Loading Chronos history…
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-amber-700 mt-3">
            History is not available for this active patient.
          </p>
        ) : null}
        {!loading && !error && !history.length ? (
          <p className="text-xs text-slate-400 mt-3">
            No readings retained yet.
          </p>
        ) : null}
        {latestRows.length ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full min-w-[620px] text-xs">
              <thead className="text-[10px] tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="text-left py-2 pr-3">TIME</th>
                  <th className="text-right py-2 px-2">HR</th>
                  <th className="text-right py-2 px-2">MAP</th>
                  <th className="text-right py-2 px-2">SpO₂</th>
                  <th className="text-right py-2 px-2">RR</th>
                  <th className="text-right py-2 px-2">TEMP</th>
                  <th className="text-right py-2 pl-2">LACTATE</th>
                </tr>
              </thead>
              <tbody className="font-mono text-slate-600">
                {latestRows.map((row, index) => (
                  <tr
                    key={`${row.timestamp ?? 'reading'}-${index}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-2 pr-3">{formatTime(row.timestamp)}</td>
                    <td className="text-right py-2 px-2">
                      {formatValue(row.heart_rate)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatValue(row.mean_arterial_pressure)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatValue(row.spo2)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatValue(row.respiratory_rate)}
                    </td>
                    <td className="text-right py-2 px-2">
                      {formatValue(row.temperature, 1)}
                    </td>
                    <td className="text-right py-2 pl-2">
                      {formatValue(row.lactate, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
