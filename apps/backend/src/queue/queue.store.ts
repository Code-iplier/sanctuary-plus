import type { DemoState, Priority, QueueEntry, QueueStatus } from './queue.types';

export const priorityOrder: Priority[] = ['EMERGENCY', 'URGENT', 'NORMAL', 'FOLLOW_UP'];

export const activeStatuses: QueueStatus[] = ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'];

const NOTIFY_THRESHOLD = 3;

export function tokenLabel(n: number): string {
  const letter = String.fromCharCode(65 + Math.floor(n / 100) % 26);
  const num = n % 100 === 0 ? 100 : n % 100;
  return `${letter}-${num}`;
}

export function createInitialState(): DemoState {
  return {
    nextIds: { queue: 5, token: 25, event: 1, patient: 10 },
    hospitals: [
      { id: 'h1', name: 'City Care Hospital', location: 'Hyderabad' },
      { id: 'h2', name: 'Lakshmi Medical Center', location: 'Chennai' },
      { id: 'h3', name: 'Sunrise General Hospital', location: 'Bengaluru' },
    ],
    departments: [
      { id: 'd1', hospitalId: 'h1', name: 'Cardiology' },
      { id: 'd2', hospitalId: 'h1', name: 'General Medicine' },
      { id: 'd3', hospitalId: 'h2', name: 'Orthopedics' },
      { id: 'd4', hospitalId: 'h3', name: 'ENT' },
      { id: 'd5', hospitalId: 'h2', name: 'Dermatology' },
      { id: 'd6', hospitalId: 'h3', name: 'Pediatrics' },
    ],
    doctors: [
      { id: 'dr1', departmentId: 'd1', name: 'Dr. Asha Nair', averageConsultationTimeMinutes: 8, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 10, roomNumber: 'Room 101' },
      { id: 'dr2', departmentId: 'd1', name: 'Dr. Sameer Khan', averageConsultationTimeMinutes: 9, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 0, roomNumber: 'Room 102' },
      { id: 'dr3', departmentId: 'd2', name: 'Dr. Meera Iyer', averageConsultationTimeMinutes: 7, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 5, roomNumber: 'Room 201' },
      { id: 'dr4', departmentId: 'd3', name: 'Dr. Rahul Menon', averageConsultationTimeMinutes: 11, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 3, roomNumber: 'Room 301' },
      { id: 'dr5', departmentId: 'd4', name: 'Dr. Kavya Rao', averageConsultationTimeMinutes: 6, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 2, roomNumber: 'Room 401' },
      { id: 'dr6', departmentId: 'd5', name: 'Dr. Arun Pillai', averageConsultationTimeMinutes: 8, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 0, roomNumber: 'Room 302' },
      { id: 'dr7', departmentId: 'd6', name: 'Dr. Sneha Gupta', averageConsultationTimeMinutes: 10, availabilityStatus: 'AVAILABLE', currentDelayMinutes: 0, roomNumber: 'Room 402' },
    ],
    patients: [
      { id: 'p1', name: 'Ananya Sharma', phone: '9000011111', hospitalId: 'h1', age: '28', gender: 'Female' },
      { id: 'p2', name: 'Rohan Patel', phone: '9000022222', hospitalId: 'h1', age: '35', gender: 'Male' },
      { id: 'p3', name: 'Neha Das', phone: '9000033333', hospitalId: 'h2', age: '42', gender: 'Female' },
      { id: 'p4', name: 'Imran Ali', phone: '9000044444', hospitalId: 'h2', age: '55', gender: 'Male' },
      { id: 'p5', name: 'Priya Nambiar', phone: '9000055555', hospitalId: 'h3', age: '30', gender: 'Female' },
    ],
    queues: [
      { id: 'q1', patientId: 'p1', doctorId: 'dr3', priority: 'NORMAL', status: 'WAITING', tokenNumber: 21, tokenLabel: 'A-21', joinedAt: new Date(Date.now() - 50 * 60000).toISOString(), visitType: 'New consultation', reason: 'Fever and headache' },
      { id: 'q2', patientId: 'p2', doctorId: 'dr3', priority: 'URGENT', status: 'WAITING', tokenNumber: 22, tokenLabel: 'A-22', joinedAt: new Date(Date.now() - 45 * 60000).toISOString(), visitType: 'Follow-up' },
      { id: 'q3', patientId: 'p3', doctorId: 'dr4', priority: 'NORMAL', status: 'WAITING', tokenNumber: 23, tokenLabel: 'A-23', joinedAt: new Date(Date.now() - 40 * 60000).toISOString(), visitType: 'New consultation' },
      { id: 'q4', patientId: 'p4', doctorId: 'dr1', priority: 'FOLLOW_UP', status: 'IN_CONSULTATION', tokenNumber: 24, tokenLabel: 'A-24', joinedAt: new Date(Date.now() - 60 * 60000).toISOString(), visitType: 'Review', consultationStartedAt: new Date(Date.now() - 8 * 60000).toISOString(), roomNumber: 'Room 101' },
    ],
    events: [],
  };
}

export function sortQueueEntries(entries: QueueEntry[]): QueueEntry[] {
  return [...entries].sort((a, b) => {
    const pd = priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    if (pd !== 0) return pd;
    return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
  });
}

export function recalculateState(state: DemoState): void {
  state.doctors.forEach((doctor) => {
    const active = sortQueueEntries(state.queues.filter((q) => q.doctorId === doctor.id && activeStatuses.includes(q.status)));
    active.forEach((entry, index) => {
      entry.queuePosition = index + 1;
      entry.estimatedWaitMinutes = Math.max(0, index * doctor.averageConsultationTimeMinutes + doctor.currentDelayMinutes);
      if (entry.status === 'WAITING' && index > 0 && index <= NOTIFY_THRESHOLD) entry.status = 'NOTIFIED';
    });
  });
  state.events = state.events.slice(0, 50);
}

export function pushEvent(state: DemoState, type: string, detail: string): void {
  state.events.unshift({ id: `e${state.nextIds.event++}`, type, detail, createdAt: new Date().toISOString() });
  state.events = state.events.slice(0, 50);
}

export function activeQueueEntries(state: DemoState, doctorId: string): QueueEntry[] {
  return sortQueueEntries(state.queues.filter((q) => q.doctorId === doctorId && activeStatuses.includes(q.status)));
}