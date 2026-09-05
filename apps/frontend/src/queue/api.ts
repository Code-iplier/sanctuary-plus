import { io, type Socket } from 'socket.io-client';
import {
  callPatientLocal,
  completeConsultationLocal,
  findDoctorLocal,
  findPatientByPhoneLocal,
  joinQueueLocal,
  markNoShowLocal,
  registerPatientLocal,
  skipPatientLocal,
  snapshotLocal,
  startConsultationLocal,
  toggleDoctorAvailabilityLocal,
  updateDoctorDelayLocal,
  updateQueuePriorityLocal,
} from './local';
import type { DemoState, Doctor, Patient, Priority, QueueEntry } from './types';

const API_BASE = import.meta.env.VITE_QUEUE_API_URL ?? 'http://localhost:3000/api';
const SOCKET_URL = import.meta.env.VITE_QUEUE_SOCKET_URL ?? 'http://localhost:3000';

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

export function connectRealtime(onState: (state: DemoState) => void): Socket {
  const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
  socket.on('state-updated', onState);
  socket.on('connect_error', () => onState(snapshotLocal()));
  return socket;
}

export function fetchBootstrap() {
  return request<DemoState>('/bootstrap').catch(() => snapshotLocal());
}

export function findPatientByPhone(phone: string) {
  return request<Patient | null>(`/patients/${encodeURIComponent(phone)}`).catch(() => findPatientByPhoneLocal(phone));
}

export function findDoctor(id: string) {
  return request<Doctor | null>(`/doctors/${encodeURIComponent(id)}`).catch(() => findDoctorLocal(id));
}

export function registerPatient(input: { name: string; phone: string; age?: string; gender?: string; hospitalId: string }) {
  return request<Patient>('/patients/register', { method: 'POST', body: JSON.stringify(input) }).catch(() =>
    registerPatientLocal(input),
  );
}

export function joinQueue(input: { patientId: string; doctorId: string; priority: Priority; visitType: string; reason?: string }) {
  return request<QueueEntry>('/queues/join', { method: 'POST', body: JSON.stringify(input) }).catch(() => {
    const fallback = joinQueueLocal(input);
    if (!fallback) throw new Error('Unable to join queue');
    return fallback;
  });
}

export function callPatient(doctorId: string) {
  return request<QueueEntry>(`/doctors/${encodeURIComponent(doctorId)}/call`, { method: 'POST' }).catch(() => {
    const fallback = callPatientLocal(doctorId);
    if (!fallback) throw new Error('Unable to call patient');
    return fallback;
  });
}

export function startConsultation(doctorId: string) {
  return request<QueueEntry>(`/doctors/${encodeURIComponent(doctorId)}/start`, { method: 'POST' }).catch(() => {
    const fallback = startConsultationLocal(doctorId);
    if (!fallback) throw new Error('Unable to start consultation');
    return fallback;
  });
}

export function completeConsultation(doctorId: string) {
  return request<QueueEntry>(`/doctors/${encodeURIComponent(doctorId)}/complete`, { method: 'POST' }).catch(() => {
    const fallback = completeConsultationLocal(doctorId);
    if (!fallback) throw new Error('Unable to complete consultation');
    return fallback;
  });
}

export function skipPatient(doctorId: string) {
  return request<QueueEntry>(`/doctors/${encodeURIComponent(doctorId)}/skip`, { method: 'POST' }).catch(() => {
    const fallback = skipPatientLocal(doctorId);
    if (!fallback) throw new Error('Unable to skip patient');
    return fallback;
  });
}

export function markNoShow(doctorId: string) {
  return request<QueueEntry>(`/doctors/${encodeURIComponent(doctorId)}/no-show`, { method: 'POST' }).catch(() => {
    const fallback = markNoShowLocal(doctorId);
    if (!fallback) throw new Error('Unable to mark no-show');
    return fallback;
  });
}

export function updateQueuePriority(queueId: string, priority: Priority) {
  return request<QueueEntry>(`/queue/${encodeURIComponent(queueId)}/priority`, {
    method: 'PATCH',
    body: JSON.stringify({ priority }),
  }).catch(() => {
    const fallback = updateQueuePriorityLocal(queueId, priority);
    if (!fallback) throw new Error('Unable to update priority');
    return fallback;
  });
}

export function updateDoctorDelay(doctorId: string, minutes: number) {
  return request<Doctor>(`/doctors/${encodeURIComponent(doctorId)}/delay`, {
    method: 'PATCH',
    body: JSON.stringify({ minutes }),
  }).catch(() => {
    const fallback = updateDoctorDelayLocal(doctorId, minutes);
    if (!fallback) throw new Error('Unable to update delay');
    return fallback;
  });
}

export function toggleDoctorAvailability(doctorId: string) {
  return request<Doctor>(`/doctors/${encodeURIComponent(doctorId)}/status`, { method: 'PATCH' }).catch(() => {
    const fallback = toggleDoctorAvailabilityLocal(doctorId);
    if (!fallback) throw new Error('Unable to toggle availability');
    return fallback;
  });
}