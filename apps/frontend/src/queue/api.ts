import { io, type Socket } from 'socket.io-client';
import {
  cancelTicketLocal,
  callNextLocal,
  finishConsultationLocal,
  loadLocalSnapshot,
  loadPatientSnapshotLocal,
  markNoShowLocal,
  recallPatientLocal,
  skipTicketLocal,
  startConsultationLocal,
  triageTicketLocal,
  updateDoctorStatusLocal,
  updatePriorityLocal,
  updateRoomStatusLocal,
  subscribeQueue,
} from './store';
import type {
  DoctorAvailability,
  PatientTicket,
  QueueSnapshot,
  RoomStatus,
  TriageLevel,
  VisitType,
  Patient,
} from './types';

export { subscribeQueue, loadLocalSnapshot };

const API_BASE =
  import.meta.env.VITE_QUEUE_API_URL ?? '/api';
const SOCKET_URL =
  import.meta.env.VITE_QUEUE_SOCKET_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

function sessionAccess(): { accessToken: string; role?: string; patientId?: string } {
  try {
    const raw = sessionStorage.getItem('sanctuary-hospital-session-v1');
    if (!raw) return { accessToken: '' };
    const parsed = JSON.parse(raw) as { accessToken?: string; role?: string; patientId?: string };
    return { ...parsed, accessToken: parsed.accessToken ?? '' };
  } catch {
    return { accessToken: '' };
  }
}

function localQueueFallback(): QueueSnapshot {
  const session = sessionAccess();
  return session.role === 'patient' && session.patientId
    ? loadPatientSnapshotLocal(session.patientId)
    : loadLocalSnapshot();
}

async function request<T>(path: string, init?: RequestInit, accessTokenOverride?: string): Promise<T> {
  const accessToken = accessTokenOverride ?? sessionAccess().accessToken;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch {
      /* keep default message */
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function connectRealtime(
  onState?: (state: QueueSnapshot) => void,
  accessToken?: string,
): () => void {
  try {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: { token: accessToken ?? '' },
    });
    if (onState) {
      socket.on('state-updated', onState);
      socket.on('connected', (data: { ok: boolean; state: QueueSnapshot }) => {
        if (data?.state) onState(data.state);
      });
      socket.on('connect_error', () => onState(localQueueFallback()));
    }
    return () => {
      socket.disconnect();
    };
  } catch {
    return () => {
      /* No socket was created. */
    };
  }
}

export function fetchSnapshot(departmentId?: string, accessToken?: string): Promise<QueueSnapshot> {
  const url = departmentId
    ? `/queue/snapshot?departmentId=${encodeURIComponent(departmentId)}`
    : '/queue/snapshot';
  return request<QueueSnapshot>(url, undefined, accessToken).catch(() => localQueueFallback());
}

export function issueTicket(input: {
  patientId: string;
  patientName: string;
  patientPhone: string;
  departmentId: string;
  visitType: VisitType;
  reason: string;
}): Promise<PatientTicket> {
  return request<PatientTicket>('/queue/tickets/issue', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function triageTicket(
  ticketId: string,
  input: {
    triageLevel: TriageLevel;
    vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
      triageNotes?: string;
      priorityScore?: number;
    actor?: string;
  },
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/tickets/${encodeURIComponent(ticketId)}/triage`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  ).catch(() => triageTicketLocal(ticketId, input));
}

export function callNext(
  roomId: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/rooms/${encodeURIComponent(roomId)}/call-next`,
    {
      method: 'POST',
      body: JSON.stringify({ actor }),
    },
  ).catch(() => callNextLocal(roomId, actor));
}

export function startConsultation(
  roomId: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/rooms/${encodeURIComponent(roomId)}/start`,
    {
      method: 'POST',
      body: JSON.stringify({ actor }),
    },
  ).catch(() => startConsultationLocal(roomId, actor));
}

export function finishConsultation(
  roomId: string,
  notes?: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/rooms/${encodeURIComponent(roomId)}/finish`,
    {
      method: 'POST',
      body: JSON.stringify({ notes, actor }),
    },
  ).catch(() => finishConsultationLocal(roomId, notes, actor));
}

export function markNoShow(
  roomId: string,
  reason?: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/rooms/${encodeURIComponent(roomId)}/no-show`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, actor }),
    },
  ).catch(() => markNoShowLocal(roomId, reason, actor));
}

export function recallPatient(
  roomId: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/rooms/${encodeURIComponent(roomId)}/recall`,
    {
      method: 'POST',
      body: JSON.stringify({ actor }),
    },
  ).catch(() => recallPatientLocal(roomId, actor));
}

export function skipTicket(
  roomId: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/rooms/${encodeURIComponent(roomId)}/skip`,
    {
      method: 'POST',
      body: JSON.stringify({ actor }),
    },
  ).catch(() => skipTicketLocal(roomId, actor));
}

export function cancelTicket(
  ticketId: string,
  reason?: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/tickets/${encodeURIComponent(ticketId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, actor }),
    },
  ).catch(() => cancelTicketLocal(ticketId, actor, reason));
}

export function updatePriority(
  ticketId: string,
  priority: TriageLevel,
  reason: string,
  actor?: string,
): Promise<PatientTicket> {
  return request<PatientTicket>(
    `/queue/tickets/${encodeURIComponent(ticketId)}/priority`,
    {
      method: 'PATCH',
      body: JSON.stringify({ priority, reason, actor }),
    },
  ).catch(() => updatePriorityLocal(ticketId, priority, reason, actor));
}

export function updateDoctorStatus(
  doctorId: string,
  status: DoctorAvailability,
): Promise<any> {
  return request(`/queue/doctors/${encodeURIComponent(doctorId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).catch(() => updateDoctorStatusLocal(doctorId, status));
}

export function updateRoomStatus(
  roomId: string,
  status: RoomStatus,
): Promise<any> {
  return request(`/queue/rooms/${encodeURIComponent(roomId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }).catch(() => updateRoomStatusLocal(roomId, status));
}

// Patient Directory & Bootstrap helpers
const PATIENTS_STORE_KEY = 'sanctuary_patients_v3';

const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 'PAT-SYN-0001',
    name: 'Ananya Sharma',
    phone: '9000011111',
    age: '28',
    gender: 'Female',
  },
  {
    id: 'PAT-SYN-0002',
    name: 'Rohan Patel',
    phone: '9000022222',
    age: '56',
    gender: 'Male',
  },
  {
    id: 'PAT-SYN-0003',
    name: 'Neha Das',
    phone: '9000033333',
    age: '42',
    gender: 'Female',
  },
  {
    id: 'PAT-SYN-0004',
    name: 'Zaid Ali',
    phone: '9000044444',
    age: '6',
    gender: 'Male',
  },
  {
    id: 'PAT-SYN-0005',
    name: 'Priya Nambiar',
    phone: '9000055555',
    age: '34',
    gender: 'Female',
  },
  { id: 'PAT-SYN-0006', name: 'Suresh Kumar', phone: '9000066666', age: '67', gender: 'Male', },
  { id: 'PAT-SYN-0007', name: 'Ayesha Khan', phone: '9000077777', age: '29', gender: 'Female', },
  { id: 'PAT-SYN-0008', name: 'Arjun Menon', phone: '9000088888', age: '48', gender: 'Male', },
  { id: 'PAT-SYN-0009', name: 'Meera Joshi', phone: '9000099999', age: '24', gender: 'Female', },
  { id: 'PAT-SYN-0010', name: 'Rajiv Bose', phone: '9000001112', age: '63', gender: 'Male', },
  { id: 'PAT-SYN-0011', name: 'Lakshmi Devi', phone: '9000002223', age: '71', gender: 'Female', },
  { id: 'PAT-SYN-0012', name: 'Nitin Verma', phone: '9000003334', age: '39', gender: 'Male', },
  { id: 'PAT-SYN-0013', name: 'Farah Begum', phone: '9000004445', age: '52', gender: 'Female', },
  { id: 'PAT-SYN-0014', name: 'Devika Rao', phone: '9000005556', age: '8', gender: 'Female', },
  { id: 'PAT-SYN-0015', name: 'Harpreet Singh', phone: '9000006667', age: '45', gender: 'Male', },
];

function getStoredPatients(): Patient[] {
  try {
    const raw = sessionStorage.getItem(PATIENTS_STORE_KEY);
    if (!raw) {
      sessionStorage.setItem(
        PATIENTS_STORE_KEY,
        JSON.stringify(DEFAULT_PATIENTS),
      );
      return DEFAULT_PATIENTS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PATIENTS;
  }
}

export async function findPatientByPhone(
  phone: string,
): Promise<Patient | null> {
  const clean = phone.replace(/\D/g, '');
  const patient = await request<Patient | null>('/auth/patient/lookup', {
    method: 'POST',
    body: JSON.stringify({ phone: clean }),
  });
  if (patient) rememberPatient(patient);
  return patient;
}

export async function registerPatient(input: {
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  facilityId?: string;
}): Promise<Patient> {
  const patient = await request<Patient>('/auth/patient/register', {
    method: 'POST',
    body: JSON.stringify({ ...input, phone: input.phone.replace(/\D/g, '') }),
  });
  rememberPatient(patient);
  return patient;
}

function rememberPatient(patient: Patient) {
  const patients = getStoredPatients();
  const existingIndex = patients.findIndex((candidate) => candidate.id === patient.id || candidate.phone.replace(/\D/g, '') === patient.phone.replace(/\D/g, ''));
  if (existingIndex >= 0) patients[existingIndex] = patient;
  else patients.push(patient);
  try {
    sessionStorage.setItem(PATIENTS_STORE_KEY, JSON.stringify(patients));
  } catch {
    /* Session storage may be unavailable in restricted browser contexts. */
  }
}

export async function fetchBootstrap(accessToken?: string): Promise<any> {
  const snapshot = await fetchSnapshot(undefined, accessToken);
  return {
    ...snapshot,
    hospitals: [
      { id: 'h1', name: 'Sanctuary+ General Hospital' },
      { id: 'h2', name: 'City Memorial Specialty Center' },
    ],
  };
}
