export type MedicationStatus =
  'active' | 'review' | 'held' | 'discontinued' | 'flagged';
export type MedicationSource = 'home' | 'hospital' | 'external' | 'discharge';
export type MedicationRisk = 'low' | 'moderate' | 'high';
export type MedicationVerificationStatus =
  'unverified' | 'verified' | 'rejected';
export type ReconciliationDecision =
  'continue' | 'modify' | 'hold' | 'discontinue' | 'replace' | 'review';
export type SafetySeverity = 'low' | 'moderate' | 'high' | 'critical';

export type Medication = {
  id: string;
  patientId: string;
  name: string;
  genericName: string;
  rxCui?: string;
  strength: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  scheduled: string;
  source: MedicationSource;
  status: MedicationStatus;
  risk: MedicationRisk;
  verificationStatus: MedicationVerificationStatus;
  allergies: string[];
  createdAt: string;
  updatedAt: string;
};

export type Allergy = {
  id: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: SafetySeverity | 'unknown';
  status: 'active' | 'inactive' | 'unverified';
};

export type MedicationInteraction = {
  id: string;
  patientId: string;
  medications: string[];
  severity: SafetySeverity;
  description: string;
  recommendation: string;
  source: string;
  ruleId?: string;
};

export type MedicationSafetyAlert = {
  id: string;
  type: 'allergy' | 'interaction' | 'duplicate-therapy';
  severity: SafetySeverity;
  medicationIds: string[];
  medicationNames: string[];
  description: string;
  recommendation: string;
  source: string;
  ruleVersion: string;
};

export type ReconciliationRecord = {
  id: string;
  medicationId: string;
  patientId: string;
  previousStatus: MedicationStatus;
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

export type CreateMedicationInput = {
  name: string;
  genericName?: string;
  rxCui?: string;
  strength: string;
  dose: string;
  unit: string;
  route: string;
  frequency: string;
  scheduled: string;
  source: MedicationSource;
  risk?: MedicationRisk;
};

export type CreateAllergyInput = {
  substance: string;
  reaction: string;
  severity?: SafetySeverity;
};

export type ReconcileMedicationInput = {
  decision: ReconciliationDecision;
  reason: string;
  changedBy: string;
};

export type MedicationSafety = {
  allergies: Allergy[];
  interactions: MedicationInteraction[];
  alerts: MedicationSafetyAlert[];
  source: string;
  ruleVersion: string;
  evaluatedAt: string;
};
