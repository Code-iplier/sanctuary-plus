import { io, type Socket } from 'socket.io-client';
import {
  cancelTicketLocal,
  callNextLocal,
  finishConsultationLocal,
  issueTicketLocal,
  loadLocalSnapshot,
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
  import.meta.env.VITE_QUEUE_API_URL ?? 'http://localhost:3000/api';
const SOCKET_URL =
  import.meta.env.VITE_QUEUE_SOCKET_URL ?? 'http://localhost:3000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
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
): () => void {
  try {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    if (onState) {
      socket.on('state-updated', onState);
      socket.on('connected', (data: { ok: boolean; state: QueueSnapshot }) => {
        if (data?.state) onState(data.state);
      });
      socket.on('connect_error', () => onState(loadLocalSnapshot()));
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

export function fetchSnapshot(departmentId?: string): Promise<QueueSnapshot> {
  const url = departmentId
    ? `/queue/snapshot?departmentId=${encodeURIComponent(departmentId)}`
    : '/queue/snapshot';
  return request<QueueSnapshot>(url).catch(() => loadLocalSnapshot());
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
  }).catch(() => issueTicketLocal(input));
}

export function triageTicket(
  ticketId: string,
  input: {
    triageLevel: TriageLevel;
    vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
    triageNotes?: string;
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
const PATIENTS_STORE_KEY = 'sanctuary_patients_v2';

const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 'PAT-000101',
    name: 'Ananya Sharma',
    phone: '9000011111',
    age: '28',
    gender: 'Female',
    hospitalId: 'h1',
  },
  {
    id: 'PAT-000102',
    name: 'Rohan Patel',
    phone: '9000022222',
    age: '35',
    gender: 'Male',
    hospitalId: 'h1',
  },
  {
    id: 'PAT-000103',
    name: 'Neha Das',
    phone: '9000033333',
    age: '42',
    gender: 'Female',
    hospitalId: 'h1',
  },
  {
    id: 'PAT-000104',
    name: 'Imran Ali',
    phone: '9000044444',
    age: '55',
    gender: 'Male',
    hospitalId: 'h1',
  },
  {
    id: 'PAT-000105',
    name: 'Priya Nambiar',
    phone: '9000055555',
    age: '30',
    gender: 'Female',
    hospitalId: 'h1',
  },
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
  const patients = getStoredPatients();
  return patients.find((p) => p.phone.replace(/\D/g, '') === clean) ?? null;
}

export async function registerPatient(input: {
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  hospitalId?: string;
}): Promise<Patient> {
  const clean = input.phone.replace(/\D/g, '');
  const patients = getStoredPatients();
  const existing = patients.find((p) => p.phone.replace(/\D/g, '') === clean);
  if (existing) return existing;

  const newPatient: Patient = {
    id: `PAT-${String(Date.now()).slice(-6)}`,
    name: input.name,
    phone: clean,
    age: input.age ?? '30',
    gender: input.gender ?? 'Female',
    hospitalId: input.hospitalId ?? 'h1',
  };
  patients.push(newPatient);
  try {
    sessionStorage.setItem(PATIENTS_STORE_KEY, JSON.stringify(patients));
  } catch {
    /* Session storage may be unavailable in restricted browser contexts. */
  }
  return newPatient;
}

export async function fetchBootstrap(): Promise<any> {
  const snapshot = await fetchSnapshot();
  return {
    ...snapshot,
    hospitals: [
      { id: 'h1', name: 'Sanctuary+ General Hospital' },
      { id: 'h2', name: 'City Memorial Specialty Center' },
    ],
  };
}
