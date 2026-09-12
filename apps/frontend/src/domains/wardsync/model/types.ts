// ==========================================
// WardSync Domain Types & Utilities
// ==========================================

export type DeviceType =
  | 'PERIPHERAL_IV'
  | 'CENTRAL_LINE'
  | 'URINARY_CATHETER'
  | 'SURGICAL_DRAIN';

export type DeviceStatus = 'ACTIVE' | 'REVIEW_DUE' | 'REMOVED';

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

export type DeviceConnection = {
  id: string;
  deviceId: string;
  type: 'FLUID' | 'MEDICATION' | 'BLOOD' | 'NUTRITION' | 'DRAINAGE';
  referenceId?: string;
  startedAt: string;
  endedAt?: string;
};

export type Device = {
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

export type News2Trend = 'RISING' | 'STABLE' | 'FALLING';
export type FlagStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
export type FlagResolution =
  | 'CLINICAL_REVIEW_COMPLETE'
  | 'DEVICE_RETAINED'
  | 'DEVICE_REMOVED'
  | 'PURPOSE_UPDATED'
  | 'DISMISSED';
export type Consciousness =
  | 'ALERT'
  | 'CONFUSION'
  | 'VOICE'
  | 'PAIN'
  | 'UNRESPONSIVE';

export type Patient = {
  id: string;
  name: string;
  ward: string;
  bed: string;
  age: number;
  sex: 'M' | 'F' | 'OTHER';
  mrn: string;
  consultant: string;
  resuscitationStatus: string;
  fallRiskScore: number;
  pressureUlcerRisk: string;
  infectionAlerts: string[];
  allergies: string[];
  admittedAt: string;
  latestVitalAt?: string;
  primaryDiagnosis?: string;
  secondaryDiagnoses?: string[];
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
  trend: News2Trend;
  perParameterScore: News2ParameterScores;
  createdAt: string;
};

export type Flag = {
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
  resolution?: FlagResolution;
  acknowledgedAt?: string;
  resolvedAt?: string;
  resolvedReadingId?: string;
  resolutionNote?: string;
};

export type PatientView = {
  patient: Patient;
  devices: Device[];
  connections: DeviceConnection[];
  vitals: VitalsReading[];
  news2: News2Score[];
  flags: Flag[];
};

export type RecheckItem = {
  patientId: string;
  name: string;
  bed: string;
  totalScore: number;
  lastObservationAgeMinutes: number;
  priority: number;
  trend: News2Trend;
};

export type Dashboard = {
  patients: Patient[];
  openFlags: Flag[];
  reviewDueDevices: Device[];
  risingTrends: News2Score[];
  recheckPriority: RecheckItem[];
  auditTrail: Array<{
    id: string;
    action: string;
    timestamp: string;
    patientId?: string;
    before?: unknown;
    after?: unknown;
  }>;
};

export const TREND_COLOR: Record<News2Trend, 'danger' | 'warning' | 'success'> = {
  RISING: 'danger',
  STABLE: 'warning',
  FALLING: 'success',
};

export function getDeviceDuration(insertedAt: string): string {
  const ms = Math.max(0, Date.now() - new Date(insertedAt).getTime());
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days === 0) return hours <= 1 ? 'Just inserted' : `${hours}h dwell`;
  return `Day ${days + 1}`;
}

export function formatDeviceDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatEventDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  return `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getLocalIsoSlice(): string {
  const tzOffsetMs = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffsetMs).toISOString().slice(0, 16);
}

export function formatObservationFreshness(takenAt?: string): {
  text: string;
  isStale: boolean;
  hasVitals: boolean;
} {
  if (!takenAt) {
    return { text: 'No vitals recorded', isStale: false, hasVitals: false };
  }
  const date = new Date(takenAt);
  const diffMs = Date.now() - date.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return { text: 'Just now', isStale: false, hasVitals: true };
  }

  const diffMinutes = Math.floor(diffMs / 60000);

  let text: string;
  if (diffMinutes < 60) {
    text = `${Math.max(1, diffMinutes)} min ago`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    text = mins === 0 ? `${hours}h ago` : `${hours}h ${mins}m ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    const remainingHours = Math.floor((diffMinutes % 1440) / 60);
    text =
      remainingHours === 0
        ? `${days}d ago`
        : `${days}d ${remainingHours}h ago`;
  }

  // Meaningfully stale if >= 12 hours (720 min)
  const isStale = diffMinutes >= 720;
  return { text, isStale, hasVitals: true };
}

export function formatMinutesAge(minutes: number): string {
  if (minutes >= 999) return 'No vitals recorded';
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins === 0 ? `${hours}h ago` : `${hours}h ${mins}m ago`;
  }
  const days = Math.floor(minutes / 1440);
  const remainingHours = Math.floor((minutes % 1440) / 60);
  return remainingHours === 0 ? `${days}d ago` : `${days}d ${remainingHours}h ago`;
}

