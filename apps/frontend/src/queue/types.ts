export type TriageLevel = 'URGENT' | 'NORMAL' | 'FOLLOW_UP';

export type TicketStatus =
  | 'CREATED'
  | 'TRIAGE_PENDING'
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SKIPPED'
  | 'NO_SHOW';

export type DoctorAvailability =
  | 'AVAILABLE'
  | 'CALLING'
  | 'IN_CONSULTATION'
  | 'ON_BREAK'
  | 'PAUSED'
  | 'OFFLINE';

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'CLOSED';

export type QueuePressure = 'NORMAL' | 'MODERATE' | 'HIGH';

export type VisitType = 'NEW' | 'FOLLOW_UP' | 'REVIEW' | 'OTHER';

export interface Department {
  id: string;
  name: string;
  code: string; // e.g. "GEN", "CARD", "ORTH", "PED", "DERM"
  description: string;
  location: string;
}

export interface DoctorRoom {
  id: string;
  roomNumber: string; // e.g. "GM-01", "GM-02", "CARD-01"
  departmentId: string;
  status: RoomStatus;
  currentDoctorId?: string | null;
}

export interface DoctorProfile {
  id: string;
  name: string;
  departmentId: string;
  assignedRoomId?: string | null;
  status: DoctorAvailability;
  averageConsultMinutes: number;
}

export interface PatientTicket {
  id: string;
  tokenNumber: string; // e.g. "GEN-104", "CARD-201"
  patientId: string; // Shared ID format e.g. "PAT-000104"
  patientName: string;
  patientPhone: string;
  departmentId: string;
  departmentName: string;
  visitType: VisitType;
  reason: string;
  triageLevel: TriageLevel;
  status: TicketStatus;
  assignedDoctorId?: string | null;
  assignedRoomId?: string | null;
  assignedDoctorName?: string | null;
  assignedRoomNumber?: string | null;
  createdAt: string;
  triagedAt?: string | null;
  calledAt?: string | null;
  consultationStartedAt?: string | null;
  consultationCompletedAt?: string | null;
  cancelledAt?: string | null;
  vitals?: {
    bp?: string;
    pulse?: string;
    temp?: string;
    spo2?: string;
  };
  triageNotes?: string;
  chiefComplaint?: string;
  estimatedWaitMinutes?: number;
  patientsAhead?: number;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  age?: string | number;
  gender?: string;
  hospitalId?: string;
  createdAt?: string;
}

export type DemoState = any;
export type Priority = TriageLevel;
export type QueueEntry = PatientTicket;
export type QueueStatus = TicketStatus;

export interface QueuePolicy {
  approachingThreshold: number; // default: 2
  returnWindowMinutes: number; // default: 5
  priorityWeights: Record<TriageLevel, number>;
}

export interface QueueEvent {
  id: string;
  ticketId: string;
  eventType: string;
  actor: string;
  detail: string;
  timestamp: string;
}

export interface DepartmentMetrics {
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  waitingCount: number;
  consultingCount: number;
  activeDoctors: number;
  availableRooms: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
  urgentWaitingCount: number;
  queuePressure: QueuePressure;
  currentlyServing?: {
    tokenNumber: string;
    roomNumber: string;
  } | null;
}

export interface QueueSnapshot {
  departments: Department[];
  rooms: DoctorRoom[];
  doctors: DoctorProfile[];
  tickets: PatientTicket[];
  events: QueueEvent[];
  policy: QueuePolicy;
  metrics: DepartmentMetrics[];
}

export type Session =
  | {
      role: 'patient';
      patientId: string;
      phone?: string;
      name?: string;
      accessToken?: string;
    }
  | {
      role: 'staff';
      staffId?: string;
      staffName: string;
      name?: string;
      username?: string;
      roleTitle?: string;
      doctorProfileId?: string;
      roomId?: string;
      departmentId?: string;
      accessToken?: string;
    }
  | null;

// Helper to determine derived APPROACHING state without mutating authoritative DB status
export function isApproaching(ticket: PatientTicket, threshold = 2): boolean {
  return (
    ticket.status === 'WAITING' && (ticket.patientsAhead ?? 999) <= threshold
  );
}
