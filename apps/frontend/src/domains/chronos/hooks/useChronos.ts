/**
 * useChronos — realtime hook.
 * Manages: health polling → apiOnline/modelsLoaded,
 * WS /ws/triage/all → triage broadcast (direct via Vite proxy, not Nest),
 * patient map + _crashHistory sparklines, selection, connected state.
 * Preserves Chronos websocket_connections["__triage__"] fan-out.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChronosPatient } from '../model/chronos.types';
import { getChronosSummary } from '../api/chronos.client';

const MAX_HISTORY = 24;

export type ChronosHistoryPoint = {
  timestamp: string;
  crashProbability: number;
};

export type UseChronosReturn = {
  patients: Record<string, ChronosPatient>;
  selected: string | null;
  selectedPatient: ChronosPatient | null;
  selectPatient: (id: string) => void;
  connected: boolean;
  apiOnline: boolean;
  modelsLoaded: string[];
  predictionHistory: ChronosHistoryPoint[];
};

export function useChronos(): UseChronosReturn {
  const [patients, setPatients] = useState<Record<string, ChronosPatient>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState<string[]>([]);
  const [predictionHistory, setPredictionHistory] = useState<ChronosHistoryPoint[]>([]);

  const historyRef = useRef<Record<string, number[]>>({});
  const predictionHistoryRef = useRef<ChronosHistoryPoint[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectPatient = useCallback((id: string) => {
    setSelected((prev) => (prev === id ? null : id));
  }, []);

  // Health polling — distinguishes online vs offline (not fake empty patients)
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const summary = await getChronosSummary();
        if (cancelled) return;
        setApiOnline(true);
        setModelsLoaded(summary.modelsLoaded ?? []);
      } catch {
        if (cancelled) return;
        setApiOnline(false);
        setModelsLoaded([]);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // WebSocket realtime — single domain-level connection, StrictMode-safe
  useEffect(() => {
    if (!apiOnline) return;

    let closed = false;

    const connect = () => {
      if (closed) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/triage/all`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (closed) return;
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as ChronosPatient;
            if (!data?.patient_id) return;
            const pid = data.patient_id;
            const score = data.crash_probability_score ?? 0;
            // Per-patient bounded history — preserved for sparklines
            if (!historyRef.current[pid]) historyRef.current[pid] = [];
            const hist = historyRef.current[pid];
            hist.push(score);
            if (hist.length > MAX_HISTORY) hist.shift();
            (data as ChronosPatient & { _crashHistory?: number[] })._crashHistory = [...hist];

            // Prediction event history — one point per WebSocket event (not cohort average)
            // Uses actual Chronos event timestamp; generated fallback only for malformed data
            const ts: string =
              (data as any).timestamp ?? (data as any).last_updated ?? new Date().toISOString();
            const point: ChronosHistoryPoint = { timestamp: ts, crashProbability: score };
            predictionHistoryRef.current.push(point);
            if (predictionHistoryRef.current.length > MAX_HISTORY) predictionHistoryRef.current.shift();
            const nextHistory = [...predictionHistoryRef.current];

            setPatients((prev) => ({ ...prev, [pid]: data }));
            setPredictionHistory(nextHistory);
          } catch {
            // ignore malformed
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (!closed) reconnectTimer.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {
            // ignore
          }
        };
      } catch {
        if (!closed) reconnectTimer.current = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      try {
        wsRef.current?.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
      setConnected(false);
    };
  }, [apiOnline]);

  return {
    patients,
    selected,
    selectedPatient: selected ? (patients[selected] ?? null) : null,
    selectPatient,
    connected,
    apiOnline,
    modelsLoaded,
    predictionHistory,
  };
}
