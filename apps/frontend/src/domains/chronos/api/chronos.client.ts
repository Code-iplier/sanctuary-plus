/**
 * Chronos API Client — Sanctuary domain boundary.
 * Components call this client, never fetch() directly.
 * REST goes Browser → Vite /api/chronos → Nest 3000 → FastAPI 8000.
 * WebSocket goes Browser → Vite /ws → FastAPI 8000 (not Nest).
 */
import type { ChronosPatient, ChronosSummary } from '../model/chronos.types';

const CHRONOS_PREFIX = '/api/chronos';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CHRONOS_PREFIX}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) throw new Error(`Chronos request ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function getChronosSummary(): Promise<ChronosSummary> {
  return request<ChronosSummary>('/summary');
}

export async function predictChronos(payload: Record<string, unknown>): Promise<ChronosPatient> {
  return request<ChronosPatient>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPatientHistory(patientId: string): Promise<{ patient_id: string; n_rows: number; history: unknown[] }> {
  return request<{ patient_id: string; n_rows: number; history: unknown[] }>(`/patient/${encodeURIComponent(patientId)}/history`);
}
