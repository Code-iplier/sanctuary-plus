const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const API_PREFIX = '/api/chronos';

export type ChronosSummary = {
  status: string;
  models_loaded: string[];
  active_patients: number;
  patient_count: number;
  source: string;
  refreshedAt: string;
};

export type ChronosPatients = {
  count: number;
  active_patients: Array<{
    patient_id: string;
    risk_level?: string;
    [key: string]: unknown;
  }>;
};

export type ChronosAlertEntry = {
  patient_id: string;
  probability: number;
  risk_level: string;
  source: string;
};

export type PredictionResult = {
  patient_id: string;
  timestamp: string;
  status: string;
  alerts: Record<string, ChronosAlertEntry>;
  source: string;
  model_metadata?: {
    loaded_registry: string[];
    available_targets: string[];
    [key: string]: unknown;
  };
};

export type MonitoredPatient = {
  patientId: string;
  timestamp: string;
  alerts: Record<string, ChronosAlertEntry>;
  source: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${API_PREFIX}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`Chronos request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export function getChronosSummary(): Promise<ChronosSummary> {
  return request<ChronosSummary>('/summary');
}

export function getPatients(): Promise<ChronosPatients> {
  return request<ChronosPatients>('/patients');
}

export function predictVitals(payload: Record<string, unknown>): Promise<PredictionResult> {
  return request<PredictionResult>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getPatientHistory(patientId: string): Promise<unknown> {
  return request<unknown>(
    `/patient/${encodeURIComponent(patientId)}/history`,
  );
}
