export type Priority = 'EMERGENCY' | 'URGENT' | 'NORMAL' | 'FOLLOW_UP';
export type QueueStatus =
  | 'WAITING'
  | 'NOTIFIED'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'NO_SHOW'
  | 'CANCELLED';
export type DoctorAvailability = 'AVAILABLE' | 'UNAVAILABLE';
export type Session = { role: 'patient'; patientId: string } | { role: 'staff'; staffName: string } | null;

export interface Hospital {
  id: string;
  name: string;
  location: string;
}

export interface Department {
  id: string;
  hospitalId: string;
  name: string;
}

export interface Doctor {
  id: string;
  departmentId: string;
  name: string;
  averageConsultationTimeMinutes: number;
  availabilityStatus: DoctorAvailability;
  currentDelayMinutes: number;
  roomNumber: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  hospitalId: string;
  age?: string;
  gender?: string;
}

export interface QueueEntry {
  id: string;
  patientId: string;
  doctorId: string;
  priority: Priority;
  status: QueueStatus;
  tokenNumber: number;
  tokenLabel: string;
  joinedAt: string;
  visitType: string;
  reason?: string;
  queuePosition?: number;
  estimatedWaitMinutes?: number;
  calledAt?: string;
  consultationStartedAt?: string;
  consultationCompletedAt?: string;
  roomNumber?: string;
}

export interface EventLog {
  id: string;
  type: string;
  detail: string;
  createdAt: string;
}

export interface DemoState {
  nextIds: { queue: number; token: number; event: number; patient: number };
  hospitals: Hospital[];
  departments: Department[];
  doctors: Doctor[];
  patients: Patient[];
  queues: QueueEntry[];
  events: EventLog[];
}