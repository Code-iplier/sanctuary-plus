import type { ClinicalInterviewStage, KioskSessionStatus, TranscriptSpeaker } from './types';

const API_BASE = import.meta.env.VITE_QUEUE_API_URL ?? '/api';

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `MediKiosk request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export type KioskSession = {
  id: string;
  patientId: string;
  encounterId: string;
  status: KioskSessionStatus;
  currentStage: ClinicalInterviewStage;
  questionIndex: number;
  followUpCount?: number;
  clinicalState: Record<string, unknown>;
  safetySignals: unknown[];
  patientVerified: boolean;
  transcript: Array<{ id: string; speaker: TranscriptSpeaker; text: string; occurredAt: string }>;
};

export type LiveToken = { token: string; model: string; expireTime: string };

export function createKioskSession(token: string, encounterId: string, patientId?: string, fresh = false) {
  return request<KioskSession>(token, '/medikiosk/sessions', {
    method: 'POST',
    body: JSON.stringify({ encounterId, patientId, fresh }),
  });
}

export function getKioskSession(token: string, sessionId: string) {
  return request<KioskSession>(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}`);
}

export function appendTranscript(token: string, sessionId: string, input: { speaker: TranscriptSpeaker; text: string }) {
  return request(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/transcript`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateKioskState(token: string, sessionId: string, input: {
  currentStage?: ClinicalInterviewStage;
  questionIndex?: number;
  answerAccepted?: boolean;
  missingDetail?: string;
  factEvidence?: Record<string, { language?: string; confidence?: number }>;
  clinicalState?: Record<string, unknown>;
  safetySignals?: unknown[];
  status?: KioskSessionStatus;
}) {
  return request<KioskSession & { interview?: { currentQuestionIndex: number; nextQuestionText?: string | null; followUpQuestionText?: string | null; missingDetail?: string | null; followUpCount: number; shouldAdvance: boolean; followUpAllowed: boolean; instruction: string } }>(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/state`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function reviewClinicalFact(token: string, sessionId: string, factId: string, input: { status: 'ACCEPTED' | 'REJECTED' | 'UNCERTAIN'; correctedValue?: unknown }) {
  return request<any>(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/facts/${encodeURIComponent(factId)}/review`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function generateKioskReport(token: string, sessionId: string) {
  return request(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/report`, { method: 'POST' });
}

export function verifyKioskIntake(token: string, sessionId: string, report: Record<string, unknown>) {
  return request<{ report: Record<string, unknown>; pdf: { base64: string; filename: string; mimeType: string } }>(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/verify`, { method: 'POST', body: JSON.stringify({ report }) });
}

export function updateKioskReport(token: string, sessionId: string, report: Record<string, unknown>) {
  return request(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/report`, { method: 'PATCH', body: JSON.stringify({ report }) });
}

export function issueGeminiLiveToken(token: string, sessionId: string) {
  return request<LiveToken>(token, `/medikiosk/sessions/${encodeURIComponent(sessionId)}/live-token`, {
    method: 'POST',
  });
}

export function getEncounterWorkflow(token: string, encounterId: string) {
  return request<any>(token, `/medikiosk/encounters/${encodeURIComponent(encounterId)}`);
}

export function getActivePatientEncounter(token: string, patientId: string) {
  return request<any>(token, `/medikiosk/patients/${encodeURIComponent(patientId)}/active-encounter`);
}

export function getStaffEncounters(token: string) {
  return request<any[]>(token, '/medikiosk/staff/encounters');
}

export function updateIntakeReport(token: string, encounterId: string, report: Record<string, unknown>) {
  return request(token, `/medikiosk/encounters/${encodeURIComponent(encounterId)}/report`, {
    method: 'PATCH',
    body: JSON.stringify({ report }),
  });
}

export async function getIntakeReportPdf(token: string, encounterId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/medikiosk/encounters/${encodeURIComponent(encounterId)}/report-pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unable to load the intake PDF (${response.status})`);
  return response.blob();
}

export function startConsultation(token: string, encounterId: string) {
  return request<any>(token, `/medikiosk/encounters/${encodeURIComponent(encounterId)}/consultation`, { method: 'POST' });
}

export function updateConsultation(token: string, consultationId: string, input: { transcript?: unknown[]; decisions?: Record<string, unknown> }) {
  return request(token, `/medikiosk/consultations/${encodeURIComponent(consultationId)}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function transcribeConsultation(token: string, consultationId: string, input: { audioBase64: string; mimeType?: string; filename?: string; durationSeconds?: number }) {
  return request<any>(token, `/medikiosk/consultations/${encodeURIComponent(consultationId)}/transcribe`, { method: 'POST', body: JSON.stringify(input) });
}

export function finalizeConsultation(token: string, consultationId: string, input: unknown) {
  return request<any>(token, `/medikiosk/consultations/${encodeURIComponent(consultationId)}/finalize`, { method: 'POST', body: JSON.stringify(input) });
}

export function getPatientNextSteps(token: string, patientId: string) {
  return request<any[]>(token, `/medikiosk/patients/${encodeURIComponent(patientId)}/next-steps`);
}

export function getPatientPrescriptions(token: string, patientId: string) {
  return request<any[]>(token, `/medikiosk/patients/${encodeURIComponent(patientId)}/prescriptions`);
}

export function getFamilyMemberHealthSummary(token: string, abhaId: string) {
  return request<any>(token, `/medikiosk/family-members/${encodeURIComponent(abhaId.trim())}`);
}

export async function getFamilyMemberDocumentContent(token: string, abhaId: string, documentId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/medikiosk/family-members/${encodeURIComponent(abhaId)}/documents/${encodeURIComponent(documentId)}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unable to open the family record (${response.status})`);
  return response.blob();
}

export async function getFamilyMemberReportPdf(token: string, abhaId: string, encounterId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/medikiosk/family-members/${encodeURIComponent(abhaId)}/encounters/${encodeURIComponent(encounterId)}/report-pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Unable to open the family hospital report (${response.status})`);
  return response.blob();
}

export function getPatientDocuments(token: string, patientId: string) {
  return request<any[]>(token, `/medikiosk/patients/${encodeURIComponent(patientId)}/documents`);
}

export function uploadPatientDocument(token: string, input: { filename: string; mimeType: string; dataBase64: string; documentType?: string; encounterId?: string }) {
  return request<any>(token, '/medikiosk/documents', { method: 'POST', body: JSON.stringify(input) });
}

export async function getPatientDocumentContent(token: string, documentId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/medikiosk/documents/${encodeURIComponent(documentId)}/content`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Unable to load document (${response.status})`);
  return response.blob();
}

export function confirmPatientDocumentExtraction(token: string, documentId: string, extractedData: Record<string, unknown>) {
  return request<any>(token, `/medikiosk/documents/${encodeURIComponent(documentId)}/extraction`, { method: 'PATCH', body: JSON.stringify({ extractedData }) });
}

export function reviewPatientDocument(token: string, documentId: string) {
  return request<any>(token, `/medikiosk/documents/${encodeURIComponent(documentId)}/review`, { method: 'POST' });
}
