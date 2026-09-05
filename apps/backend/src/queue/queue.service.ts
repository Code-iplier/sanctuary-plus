import { Injectable } from '@nestjs/common';
import { activeQueueEntries, createInitialState, pushEvent, recalculateState, sortQueueEntries, tokenLabel } from './queue.store';
import type { DemoState, Doctor, Patient, Priority, QueueEntry } from './queue.types';

export interface RegisterPatientInput {
  name: string;
  phone: string;
  age?: string;
  gender?: string;
  hospitalId: string;
}

export interface JoinQueueInput {
  patientId: string;
  doctorId: string;
  priority: Priority;
  visitType: string;
  reason?: string;
}

@Injectable()
export class QueueService {
  private readonly state: DemoState = createInitialState();

  snapshot(): DemoState {
    recalculateState(this.state);
    return structuredClone(this.state);
  }

  hospitals() {
    return this.state.hospitals;
  }

  departments(hospitalId: string) {
    return this.state.departments.filter((d) => d.hospitalId === hospitalId);
  }

  doctors(departmentId?: string) {
    return departmentId ? this.state.doctors.filter((d) => d.departmentId === departmentId) : this.state.doctors;
  }

  getDoctor(id: string): Doctor | null {
    return this.state.doctors.find((d) => d.id === id) ?? null;
  }

  getPatientByPhone(phone: string): Patient | null {
    return this.state.patients.find((p) => p.phone === phone) ?? null;
  }

  getQueueById(id: string): QueueEntry | null {
    return this.state.queues.find((q) => q.id === id) ?? null;
  }

  getActiveQueueForDoctor(doctorId: string): QueueEntry[] {
    return activeQueueEntries(this.state, doctorId);
  }

  getQueuesForPatient(patientId: string): QueueEntry[] {
    return sortQueueEntries(this.state.queues.filter((q) => q.patientId === patientId));
  }

  registerPatient(input: RegisterPatientInput): Patient {
    const existing = this.getPatientByPhone(input.phone);
    if (existing) {
      existing.name = input.name;
      if (input.age) existing.age = input.age;
      if (input.gender) existing.gender = input.gender;
      existing.hospitalId = input.hospitalId;
      return existing;
    }
    const patient: Patient = {
      id: `p${this.state.nextIds.patient++}`,
      name: input.name,
      phone: input.phone,
      hospitalId: input.hospitalId,
      age: input.age,
      gender: input.gender,
    };
    this.state.patients.push(patient);
    pushEvent(this.state, 'PATIENT_REGISTERED', `${input.name} registered`);
    return patient;
  }

  joinQueue(input: JoinQueueInput): QueueEntry | null {
    const doctor = this.getDoctor(input.doctorId);
    const patient = this.state.patients.find((p) => p.id === input.patientId) ?? null;
    if (!doctor || !patient) return null;
    if (doctor.availabilityStatus === 'UNAVAILABLE') return null;
    const existing = this.state.queues.find(
      (e) =>
        e.patientId === patient.id &&
        e.doctorId === doctor.id &&
        ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(e.status),
    );
    if (existing) return existing;
    const n = this.state.nextIds.token++;
    const entry: QueueEntry = {
      id: `q${this.state.nextIds.queue++}`,
      patientId: patient.id,
      doctorId: doctor.id,
      priority: 'NORMAL',
      status: 'WAITING',
      tokenNumber: n,
      tokenLabel: tokenLabel(n),
      joinedAt: new Date().toISOString(),
      visitType: input.visitType,
      reason: input.reason,
    };
    this.state.queues.push(entry);
    pushEvent(this.state, 'QUEUE_JOINED', `${patient.name} joined ${doctor.name}`);
    return entry;
  }

  callPatient(doctorId: string): QueueEntry | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    const next = sortQueueEntries(
      this.state.queues.filter((e) => e.doctorId === doctorId && (e.status === 'WAITING' || e.status === 'NOTIFIED')),
    )[0];
    if (!next) return null;
    next.status = 'CALLED';
    next.calledAt = new Date().toISOString();
    next.roomNumber = doctor.roomNumber;
    pushEvent(this.state, 'PATIENT_CALLED', `${doctor.name} called ${next.tokenLabel}`);
    return next;
  }

  startConsultation(doctorId: string): QueueEntry | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    const cur = this.state.queues.find((e) => e.doctorId === doctorId && e.status === 'IN_CONSULTATION');
    if (cur) return cur;
    const next = sortQueueEntries(
      this.state.queues.filter((e) => e.doctorId === doctorId && (e.status === 'CALLED' || e.status === 'WAITING' || e.status === 'NOTIFIED')),
    )[0];
    if (!next) return null;
    next.status = 'IN_CONSULTATION';
    next.consultationStartedAt = new Date().toISOString();
    next.roomNumber = next.roomNumber ?? doctor.roomNumber;
    pushEvent(this.state, 'CONSULTATION_STARTED', `${doctor.name} started ${next.tokenLabel}`);
    return next;
  }

  completeConsultation(doctorId: string): QueueEntry | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    const cur = this.state.queues.find((e) => e.doctorId === doctorId && e.status === 'IN_CONSULTATION');
    if (!cur) return null;
    cur.status = 'COMPLETED';
    cur.consultationCompletedAt = new Date().toISOString();
    pushEvent(this.state, 'CONSULTATION_COMPLETED', `${doctor.name} completed ${cur.tokenLabel}`);
    return cur;
  }

  skipPatient(doctorId: string): QueueEntry | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    const target = sortQueueEntries(
      this.state.queues.filter((e) => e.doctorId === doctorId && (e.status === 'WAITING' || e.status === 'NOTIFIED' || e.status === 'CALLED')),
    )[0];
    if (!target) return null;
    target.status = 'SKIPPED';
    pushEvent(this.state, 'PATIENT_SKIPPED', `${target.tokenLabel} skipped`);
    return target;
  }

  markNoShow(doctorId: string): QueueEntry | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    const target = sortQueueEntries(
      this.state.queues.filter((e) => e.doctorId === doctorId && (e.status === 'WAITING' || e.status === 'NOTIFIED' || e.status === 'CALLED')),
    )[0];
    if (!target) return null;
    target.status = 'NO_SHOW';
    pushEvent(this.state, 'PATIENT_NO_SHOW', `${target.tokenLabel} no-show`);
    return target;
  }

  updatePriority(queueId: string, priority: Priority): QueueEntry | null {
    const entry = this.getQueueById(queueId);
    if (!entry) return null;
    entry.priority = priority;
    pushEvent(this.state, 'PRIORITY_CHANGED', `${entry.tokenLabel} -> ${priority}`);
    return entry;
  }

  updateDoctorDelay(doctorId: string, minutes: number): Doctor | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    doctor.currentDelayMinutes = Math.max(0, Number(minutes) || 0);
    pushEvent(this.state, 'DOCTOR_DELAY_UPDATED', `${doctor.name} delay ${doctor.currentDelayMinutes}min`);
    return doctor;
  }

  toggleDoctorAvailability(doctorId: string): Doctor | null {
    const doctor = this.getDoctor(doctorId);
    if (!doctor) return null;
    doctor.availabilityStatus = doctor.availabilityStatus === 'AVAILABLE' ? 'UNAVAILABLE' : 'AVAILABLE';
    pushEvent(this.state, 'DOCTOR_STATUS_CHANGED', `${doctor.name} -> ${doctor.availabilityStatus}`);
    return doctor;
  }
}