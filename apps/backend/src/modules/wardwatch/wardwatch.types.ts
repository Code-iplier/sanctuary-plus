export type DeviceType =
  | 'PERIPHERAL_IV'
  | 'CENTRAL_LINE'
  | 'URINARY_CATHETER'
  | 'SURGICAL_DRAIN';

export type DeviceStatus = 'ACTIVE' | 'REVIEW_DUE' | 'REMOVED';

export type DeviceConnectionType =
  | 'FLUID'
  | 'MEDICATION'
  | 'BLOOD'
  | 'NUTRITION'
  | 'DRAINAGE';

export type News2Trend = 'RISING' | 'STABLE' | 'FALLING';
export type FlagStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

export type FlagResolution =
  | 'DEVICE_RETAINED'
  | 'DEVICE_REMOVED'
  | 'PURPOSE_UPDATED'
  | 'CLINICAL_REVIEW_COMPLETE'
  | 'DISMISSED';

export type Consciousness =
  | 'ALERT'
  | 'CONFUSION'
  | 'VOICE'
  | 'PAIN'
  | 'UNRESPONSIVE';

export type DeviceEventType =
  | 'INSERTED'
  | 'REVIEWED'
  | 'INDICATION_UPDATED'
  | 'USE_UPDATED'
  | 'REMOVED';

export type DeviceLifecycleEvent = {
  id: string;
  deviceId: string;
  timestamp: string;
  type: DeviceEventType;
  title: string;
  description: string;
  performedBy?: string;
  details?: Record<string, unknown>;
};

export type PatientDevice = {
  id: string;
  patientId: string;
  type: DeviceType;
  location?: string;
  indication?: string;
  currentUse?: string;
  notes?: string;
  insertedAt: string;
  insertedBy?: string;
  removedAt?: string;
  removalReason?: string;
  removedBy?: string;
  status: DeviceStatus;
  lastReviewedAt?: string;
  lastReviewOutcome?: string;
  lastReviewedBy?: string;
  reviewReason?: string;
  indicationResolvedAt?: string;
  events?: DeviceLifecycleEvent[];
};

export type DeviceConnection = {
  id: string;
  deviceId: string;
  type: DeviceConnectionType;
  referenceId?: string;
  startedAt: string;
  endedAt?: string;
};

export type VitalsReading = {
  id: string;
  patientId: string;
  takenAt: string;
  respiratoryRate: number;
  spo2: number;
  spo2Scale: 1 | 2;
  temperature: number;
  systolicBP: number;
  heartRate: number;
  consciousness: Consciousness;
  supplementalOxygen: boolean;
};

export type News2ParameterScores = {
  respiratoryRate: number;
  spo2: number;
  temperature: number;
  systolicBP: number;
  heartRate: number;
  consciousness: number;
  supplementalOxygen: number;
};

export type News2Score = {
  id: string;
  readingId: string;
  patientId: string;
  totalScore: number;
  perParameterScore: News2ParameterScores;
  trend: News2Trend;
  createdAt: string;
};

export type CorrelationFlag = {
  id: string;
  patientId: string;
  raisedAt: string;
  reason: string;
  evidence: {
    vitalsTrendSummary: string;
    deviceReviewReason: string;
    drivers: string[];
  };
  status: FlagStatus;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolvedReadingId?: string;
  resolution?: FlagResolution;
  resolutionNote?: string;
};

export type WardPatient = {
  id: string;
  name: string;
  ward: string;
  bed: string;
  age?: number;
  sex?: 'M' | 'F' | 'OTHER';
  mrn?: string;
  consultant?: string;
  resuscitationStatus?: string;
  fallRiskScore?: number;
  pressureUlcerRisk?: string;
  infectionAlerts?: string[];
  allergies?: string[];
  admittedAt?: string;
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string[];
};

export type AuditEvent = {
  id: string;
  patientId?: string;
  action: string;
  timestamp: string;
  before?: unknown;
  after?: unknown;
};

export type PatientCombinedView = {
  patient: WardPatient;
  devices: PatientDevice[];
  connections: DeviceConnection[];
  vitals: VitalsReading[];
  news2: News2Score[];
  flags: CorrelationFlag[];
};

export type WardDashboard = {
  patients: WardPatient[];
  openFlags: CorrelationFlag[];
  reviewDueDevices: PatientDevice[];
  risingTrends: News2Score[];
  recheckPriority: Array<{
    patientId: string;
    name: string;
    bed: string;
    totalScore: number;
    lastObservationAgeMinutes: number;
    priority: number;
    trend: News2Trend;
  }>;
  auditTrail: AuditEvent[];
};
