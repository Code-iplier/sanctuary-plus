import type { Medication } from '../lib/medication-utils';

export type MedicationDiscrepancy = {
  id: string;
  type:
    | 'missing-from-current'
    | 'unexpected-current'
    | 'dose-mismatch'
    | 'route-mismatch'
    | 'frequency-mismatch';
  severity: 'low' | 'moderate' | 'high' | 'critical';
  medicationIds: string[];
  medicationNames: string[];
  description: string;
};

export type MedicationAllergy = {
  id: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: 'low' | 'moderate' | 'high' | 'critical' | 'unknown';
  status: 'active' | 'inactive' | 'unverified';
};

export type MedicationInteraction = {
  id: string;
  patientId: string;
  medications: string[];
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  recommendation: string;
  source: string;
  ruleId?: string;
};

export type ReconciliationDecision =
  'continue' | 'modify' | 'hold' | 'discontinue' | 'replace' | 'review';

export type ReconciliationRecord = {
  id: string;
  medicationId: string;
  patientId: string;
  previousStatus: Medication['status'];
  decision: ReconciliationDecision;
  reason: string;
  changedBy: string;
  changedAt: string;
};

export type MedicationAuditEvent = {
  id: string;
  patientId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  reason?: string;
  createdAt: string;
};

const API_PREFIX = '/api';

export type MedicationAccess = {
  role: 'patient' | 'staff';
  patientId?: string;
  accessToken?: string;
};

export type MedicationPatient = {
  id: string;
  displayName: string;
  medicationCount: number;
};

async function request<T>(
  path: string,
  access: MedicationAccess,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_PREFIX}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(access.accessToken
        ? { Authorization: `Bearer ${access.accessToken}` }
        : {}),
      'x-sanctuary-role': access.role,
      ...(access.patientId
        ? { 'x-sanctuary-patient-id': access.patientId }
        : {}),
    },
    ...init,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(message || `Medication request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getMedications(
  patientId: string,
  access: MedicationAccess,
): Promise<Medication[]> {
  return request<Medication[]>(
    `/patients/${encodeURIComponent(patientId)}/medications`,
    access,
  );
}

export function getMedicationPatients(
  access: MedicationAccess,
): Promise<MedicationPatient[]> {
  return request<MedicationPatient[]>('/medications/patients', access);
}

export function getMedicationComparison(
  patientId: string,
  access: MedicationAccess,
  source = 'home',
  current = 'hospital',
): Promise<MedicationDiscrepancy[]> {
  const params = new URLSearchParams({ source, current });
  return request<MedicationDiscrepancy[]>(
    `/patients/${encodeURIComponent(patientId)}/medication-comparison?${params.toString()}`,
    access,
  );
}

export function getMedicationAudit(
  patientId: string,
  access: MedicationAccess,
): Promise<MedicationAuditEvent[]> {
  return request<MedicationAuditEvent[]>(
    `/patients/${encodeURIComponent(patientId)}/medication-audit`,
    access,
  );
}

export function getMedicationAllergies(
  patientId: string,
  access: MedicationAccess,
): Promise<MedicationAllergy[]> {
  return request<MedicationAllergy[]>(
    `/patients/${encodeURIComponent(patientId)}/allergies`,
    access,
  );
}

export function reportMedicationAllergy(
  patientId: string,
  access: MedicationAccess,
  payload: {
    substance: string;
    reaction: string;
    severity?: MedicationAllergy['severity'];
  },
): Promise<MedicationAllergy> {
  return request<MedicationAllergy>(
    `/patients/${encodeURIComponent(patientId)}/allergies`,
    access,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export function createMedication(
  patientId: string,
  access: MedicationAccess,
  payload: {
    name: string;
    strength: string;
    dose: string;
    unit: string;
    route: string;
    frequency: string;
    scheduled: string;
    source: 'home' | 'hospital' | 'external' | 'discharge';
  },
): Promise<Medication> {
  return request<Medication>(
    `/patients/${encodeURIComponent(patientId)}/medications`,
    access,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function getMedicationSafety(
  patientId: string,
  access: MedicationAccess,
): Promise<{
  allergies: MedicationAllergy[];
  interactions: MedicationInteraction[];
}> {
  return request(
    `/patients/${encodeURIComponent(patientId)}/medication-safety`,
    access,
  );
}

export function reconcileMedication(
  medicationId: string,
  access: MedicationAccess,
  payload: {
    decision: ReconciliationDecision;
    reason: string;
    changedBy: string;
  },
): Promise<ReconciliationRecord> {
  return request<ReconciliationRecord>(
    `/medications/${encodeURIComponent(medicationId)}/reconcile`,
    access,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  );
}

export function verifyMedication(
  medicationId: string,
  access: MedicationAccess,
  payload: {
    verificationStatus: 'verified' | 'rejected';
    reason: string;
    changedBy: string;
  },
): Promise<Medication> {
  return request<Medication>(
    `/medications/${encodeURIComponent(medicationId)}/verification`,
    access,
    { method: 'PATCH', body: JSON.stringify(payload) },
  );
}
