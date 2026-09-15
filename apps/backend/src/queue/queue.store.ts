import { Injectable } from '@nestjs/common';
import {
  Department,
  DoctorProfile,
  DoctorRoom,
  PatientTicket,
  QueueEvent,
  QueuePolicy,
  QueueSnapshot,
  DepartmentMetrics,
  TriageLevel,
  DoctorAvailability,
  RoomStatus,
  VisitType,
  QueuePressure,
} from './queue.types';

@Injectable()
export class QueueStore {
  private departments: Department[] = [
    {
      id: 'dept-gm',
      name: 'General Medicine',
      code: 'GEN',
      description: 'Primary care, fevers, chronic illnesses & internal medicine',
      location: 'OPD Block A, Ground Floor',
    },
    {
      id: 'dept-card',
      name: 'Cardiology',
      code: 'CARD',
      description: 'Cardiac evaluations, hypertension & ECG reviews',
      location: 'Heart Center, 1st Floor',
    },
    {
      id: 'dept-orth',
      name: 'Orthopedics',
      code: 'ORTH',
      description: 'Bone, joint, spine & sports injury consultations',
      location: 'Bone & Joint Wing, 2nd Floor',
    },
    {
      id: 'dept-ped',
      name: 'Pediatrics',
      code: 'PED',
      description: 'Child wellness, immunizations & acute pediatric care',
      location: 'Mother & Child Wing, 1st Floor',
    },
    {
      id: 'dept-derm',
      name: 'Dermatology',
      code: 'DERM',
      description: 'Skin health, allergies & clinical dermatology',
      location: 'Specialty Clinic, 3rd Floor',
    },
  ];

  private rooms: DoctorRoom[] = [
    { id: 'room-gm-01', roomNumber: 'GM-01', departmentId: 'dept-gm', status: 'AVAILABLE', currentDoctorId: 'doc-01' },
    { id: 'room-gm-02', roomNumber: 'GM-02', departmentId: 'dept-gm', status: 'AVAILABLE', currentDoctorId: 'doc-02' },
    { id: 'room-gm-03', roomNumber: 'GM-03', departmentId: 'dept-gm', status: 'AVAILABLE', currentDoctorId: null },
    { id: 'room-card-01', roomNumber: 'CARD-01', departmentId: 'dept-card', status: 'OCCUPIED', currentDoctorId: 'doc-03' },
    { id: 'room-card-02', roomNumber: 'CARD-02', departmentId: 'dept-card', status: 'AVAILABLE', currentDoctorId: 'doc-04' },
    { id: 'room-orth-01', roomNumber: 'ORTH-01', departmentId: 'dept-orth', status: 'AVAILABLE', currentDoctorId: 'doc-05' },
    { id: 'room-ped-01', roomNumber: 'PED-01', departmentId: 'dept-ped', status: 'AVAILABLE', currentDoctorId: 'doc-06' },
    { id: 'room-derm-01', roomNumber: 'DERM-01', departmentId: 'dept-derm', status: 'AVAILABLE', currentDoctorId: 'doc-07' },
  ];

  private doctors: DoctorProfile[] = [
    { id: 'doc-01', name: 'Dr. Sunita Rao', departmentId: 'dept-gm', assignedRoomId: 'room-gm-01', status: 'AVAILABLE', averageConsultMinutes: 8 },
    { id: 'doc-02', name: 'Dr. Rajesh Sharma', departmentId: 'dept-gm', assignedRoomId: 'room-gm-02', status: 'AVAILABLE', averageConsultMinutes: 10 },
    { id: 'doc-03', name: 'Dr. Vikram Malhotra', departmentId: 'dept-card', assignedRoomId: 'room-card-01', status: 'CALLING', averageConsultMinutes: 12 },
    { id: 'doc-04', name: 'Dr. Meera Iyer', departmentId: 'dept-card', assignedRoomId: 'room-card-02', status: 'AVAILABLE', averageConsultMinutes: 10 },
    { id: 'doc-05', name: 'Dr. Amit Mehta', departmentId: 'dept-orth', assignedRoomId: 'room-orth-01', status: 'AVAILABLE', averageConsultMinutes: 15 },
    { id: 'doc-06', name: 'Dr. Sneha Gupta', departmentId: 'dept-ped', assignedRoomId: 'room-ped-01', status: 'AVAILABLE', averageConsultMinutes: 9 },
    { id: 'doc-07', name: 'Dr. Arun Pillai', departmentId: 'dept-derm', assignedRoomId: 'room-derm-01', status: 'AVAILABLE', averageConsultMinutes: 7 },
  ];

  private policy: QueuePolicy = {
    approachingThreshold: 2,
    returnWindowMinutes: 5,
    priorityWeights: {
      URGENT: 3,
      NORMAL: 2,
      FOLLOW_UP: 1,
    },
  };

  private tickets: PatientTicket[] = [
    { id: 'TKT-SYN-0001', encounterId: 'ENC-SYN-0001-OPD-20260915', tokenNumber: 'GEN-101', patientId: 'PAT-SYN-0001', patientName: 'Ananya Sharma', patientPhone: '9000011111', departmentId: 'dept-gm', departmentName: 'General Medicine', visitType: 'NEW', reason: 'Persistent fever, dry cough and body ache for 3 days', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 45 * 60000).toISOString(), triagedAt: new Date(Date.now() - 40 * 60000).toISOString(), triageScore: 32 },
    { id: 'TKT-SYN-0002', encounterId: 'ENC-SYN-0002-OPD-20260915', tokenNumber: 'CARD-201', patientId: 'PAT-SYN-0002', patientName: 'Rohan Patel', patientPhone: '9000022222', departmentId: 'dept-card', departmentName: 'Cardiology', visitType: 'NEW', reason: 'Exertional chest pressure radiating to the arm and jaw', triageLevel: 'URGENT', status: 'WAITING', createdAt: new Date(Date.now() - 30 * 60000).toISOString(), triagedAt: new Date(Date.now() - 25 * 60000).toISOString(), vitals: { bp: '168/96', pulse: '108', temp: '98.6', spo2: '95' }, triageNotes: 'Immediate clinician assessment required', triageScore: 100 },
    { id: 'TKT-SYN-0003', encounterId: 'ENC-SYN-0003-OPD-20260915', tokenNumber: 'CARD-202', patientId: 'PAT-SYN-0003', patientName: 'Neha Das', patientPhone: '9000033333', departmentId: 'dept-card', departmentName: 'Cardiology', visitType: 'FOLLOW_UP', reason: 'Post-angioplasty follow-up with mild stable exertional fatigue', triageLevel: 'FOLLOW_UP', status: 'WAITING', assignedDoctorId: 'doc-03', assignedDoctorName: 'Dr. Vikram Malhotra', assignedRoomId: 'room-card-01', assignedRoomNumber: 'CARD-01', createdAt: new Date(Date.now() - 60 * 60000).toISOString(), triagedAt: new Date(Date.now() - 50 * 60000).toISOString(), triageScore: 26 },
    { id: 'TKT-SYN-0004', encounterId: 'ENC-SYN-0004-OPD-20260915', tokenNumber: 'PED-401', patientId: 'PAT-SYN-0004', patientName: 'Zaid Ali', patientPhone: '9000044444', departmentId: 'dept-ped', departmentName: 'Pediatrics', visitType: 'NEW', reason: 'Fever, dry cough and new rash for 2 days', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 20 * 60000).toISOString(), triagedAt: new Date(Date.now() - 15 * 60000).toISOString(), triageScore: 36 },
    { id: 'TKT-SYN-0005', encounterId: 'ENC-SYN-0005-OPD-20260915', tokenNumber: 'GEN-107', patientId: 'PAT-SYN-0005', patientName: 'Priya Nambiar', patientPhone: '9000055555', departmentId: 'dept-gm', departmentName: 'General Medicine', visitType: 'REVIEW', reason: 'Fatigue, cold intolerance and recent weight gain', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 90 * 60000).toISOString(), triagedAt: new Date(Date.now() - 85 * 60000).toISOString(), triageScore: 29 },
    { id: 'TKT-SYN-0006', encounterId: 'ENC-SYN-0006-OPD-20260915', tokenNumber: 'GEN-108', patientId: 'PAT-SYN-0006', patientName: 'Suresh Kumar', patientPhone: '9000066666', departmentId: 'dept-gm', departmentName: 'General Medicine', visitType: 'NEW', reason: 'Severe worsening breathlessness with wheeze and productive cough', triageLevel: 'URGENT', status: 'WAITING', createdAt: new Date(Date.now() - 24 * 60000).toISOString(), triagedAt: new Date(Date.now() - 20 * 60000).toISOString(), vitals: { bp: '148/86', pulse: '112', temp: '98.6', spo2: '88' }, triageNotes: 'Immediate respiratory assessment required', triageScore: 99 },
    { id: 'TKT-SYN-0007', encounterId: 'ENC-SYN-0007-OPD-20260915', tokenNumber: 'DERM-501', patientId: 'PAT-SYN-0007', patientName: 'Ayesha Khan', patientPhone: '9000077777', departmentId: 'dept-derm', departmentName: 'Dermatology', visitType: 'NEW', reason: 'Generalized itchy hives after shrimp exposure', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 18 * 60000).toISOString(), triagedAt: new Date(Date.now() - 14 * 60000).toISOString(), triageScore: 48 },
    { id: 'TKT-SYN-0008', encounterId: 'ENC-SYN-0008-OPD-20260915', tokenNumber: 'ORTH-301', patientId: 'PAT-SYN-0008', patientName: 'Arjun Menon', patientPhone: '9000088888', departmentId: 'dept-orth', departmentName: 'Orthopedics', visitType: 'NEW', reason: 'Right knee pain for 6 months, worse on stairs', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 16 * 60000).toISOString(), triagedAt: new Date(Date.now() - 12 * 60000).toISOString(), triageScore: 24 },
    { id: 'TKT-SYN-0009', encounterId: 'ENC-SYN-0009-OPD-20260915', tokenNumber: 'DERM-502', patientId: 'PAT-SYN-0009', patientName: 'Meera Joshi', patientPhone: '9000099999', departmentId: 'dept-derm', departmentName: 'Dermatology', visitType: 'NEW', reason: 'Inflammatory facial acne for 8 months', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 14 * 60000).toISOString(), triagedAt: new Date(Date.now() - 10 * 60000).toISOString(), triageScore: 21 },
    { id: 'TKT-SYN-0010', encounterId: 'ENC-SYN-0010-OPD-20260915', tokenNumber: 'GEN-109', patientId: 'PAT-SYN-0010', patientName: 'Rajiv Bose', patientPhone: '9000001112', departmentId: 'dept-gm', departmentName: 'General Medicine', visitType: 'REVIEW', reason: 'Worsening leg swelling, reduced urine and orthopnea', triageLevel: 'URGENT', status: 'WAITING', createdAt: new Date(Date.now() - 12 * 60000).toISOString(), triagedAt: new Date(Date.now() - 8 * 60000).toISOString(), vitals: { bp: '154/92', pulse: '88', temp: '98.6', spo2: '94' }, triageNotes: 'Prompt renal and fluid-status assessment required', triageScore: 86 },
    { id: 'TKT-SYN-0011', encounterId: 'ENC-SYN-0011-OPD-20260915', tokenNumber: 'ORTH-302', patientId: 'PAT-SYN-0011', patientName: 'Lakshmi Devi', patientPhone: '9000002223', departmentId: 'dept-orth', departmentName: 'Orthopedics', visitType: 'FOLLOW_UP', reason: 'Chronic lower-back and bilateral knee pain', triageLevel: 'FOLLOW_UP', status: 'WAITING', createdAt: new Date(Date.now() - 10 * 60000).toISOString(), triagedAt: new Date(Date.now() - 7 * 60000).toISOString(), triageScore: 23 },
    { id: 'TKT-SYN-0012', encounterId: 'ENC-SYN-0012-OPD-20260915', tokenNumber: 'ORTH-303', patientId: 'PAT-SYN-0012', patientName: 'Nitin Verma', patientPhone: '9000003334', departmentId: 'dept-orth', departmentName: 'Orthopedics', visitType: 'NEW', reason: 'Acute low-back pain radiating to posterior thigh after lifting', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 8 * 60000).toISOString(), triagedAt: new Date(Date.now() - 5 * 60000).toISOString(), triageScore: 40 },
    { id: 'TKT-SYN-0013', encounterId: 'ENC-SYN-0013-OPD-20260915', tokenNumber: 'GEN-110', patientId: 'PAT-SYN-0013', patientName: 'Farah Begum', patientPhone: '9000004445', departmentId: 'dept-gm', departmentName: 'General Medicine', visitType: 'NEW', reason: 'Right upper abdominal pain after oily food with nausea', triageLevel: 'NORMAL', status: 'WAITING', createdAt: new Date(Date.now() - 6 * 60000).toISOString(), triagedAt: new Date(Date.now() - 4 * 60000).toISOString(), triageScore: 58 },
    { id: 'TKT-SYN-0014', encounterId: 'ENC-SYN-0014-OPD-20260915', tokenNumber: 'PED-402', patientId: 'PAT-SYN-0014', patientName: 'Devika Rao', patientPhone: '9000005556', departmentId: 'dept-ped', departmentName: 'Pediatrics', visitType: 'NEW', reason: 'Rapidly worsening wheeze and breathlessness', triageLevel: 'URGENT', status: 'WAITING', createdAt: new Date(Date.now() - 4 * 60000).toISOString(), triagedAt: new Date(Date.now() - 3 * 60000).toISOString(), vitals: { bp: '—', pulse: '132', temp: '98.8', spo2: '90' }, triageNotes: 'Immediate paediatric respiratory assessment required', triageScore: 100 },
    { id: 'TKT-SYN-0015', encounterId: 'ENC-SYN-0015-OPD-20260915', tokenNumber: 'GEN-111', patientId: 'PAT-SYN-0015', patientName: 'Harpreet Singh', patientPhone: '9000006667', departmentId: 'dept-gm', departmentName: 'General Medicine', visitType: 'FOLLOW_UP', reason: 'Four weeks of elevated home blood-pressure readings', triageLevel: 'FOLLOW_UP', status: 'WAITING', createdAt: new Date(Date.now() - 2 * 60000).toISOString(), triagedAt: new Date(Date.now() - 1 * 60000).toISOString(), triageScore: 27 },
  ];

  private events: QueueEvent[] = [
    {
      id: 'ev-01',
      ticketId: 'TKT-SYN-0005',
      eventType: 'CONSULTATION_COMPLETED',
      actor: 'Dr. Sunita Rao',
      detail: 'Consultation finished in Room GM-01 for Priya Nambiar',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'ev-02',
      ticketId: 'TKT-SYN-0003',
      eventType: 'PATIENT_CALLED',
      actor: 'Dr. Vikram Malhotra',
      detail: 'Called Token CARD-201 to Room CARD-01',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    },
  ];

  private tokenSequences: Record<string, number> = {
    GEN: 111,
    CARD: 203,
    ORTH: 303,
    PED: 402,
    DERM: 504,
  };

  private lock = false;

  constructor() {
    this.recalculate();
  }

  /** Merge durable tickets into the in-memory operational queue after startup. */
  public hydrateTickets(tickets: PatientTicket[]): void {
    const durableIds = new Set(tickets.map((ticket) => ticket.id));
    this.tickets = this.tickets.filter((ticket) => !durableIds.has(ticket.id));
    this.tickets.push(...tickets);
    for (const ticket of tickets) {
      const [code, sequence] = ticket.tokenNumber.split('-');
      const parsedSequence = Number(sequence);
      if (code && Number.isInteger(parsedSequence)) {
        this.tokenSequences[code] = Math.max(this.tokenSequences[code] ?? 0, parsedSequence);
      }
    }
    this.recalculate();
  }

  // Authoritative snapshot calculation
  public getSnapshot(): QueueSnapshot {
    this.recalculate();
    return {
      departments: [...this.departments],
      rooms: [...this.rooms],
      doctors: [...this.doctors],
      tickets: [...this.tickets],
      events: [...this.events].reverse(),
      policy: { ...this.policy },
      metrics: this.computeMetrics(),
    };
  }

  // Recalculates position, patientsAhead, and ETA for every ticket
  private recalculate(): void {
    const priorityWeight: Record<TriageLevel, number> = {
      URGENT: 3,
      NORMAL: 2,
      FOLLOW_UP: 1,
    };

    for (const dept of this.departments) {
      // Find all waiting tickets in this department
      const deptWaiting = this.tickets.filter(
        (t) => t.departmentId === dept.id && t.status === 'WAITING'
      );

      // Sort by Priority desc, then createdAt asc
      deptWaiting.sort((a, b) => {
        const pDiff = (priorityWeight[b.triageLevel] ?? 0) - (priorityWeight[a.triageLevel] ?? 0);
        if (pDiff !== 0) return pDiff;
        const urgencyDiff = (b.triageScore ?? 0) - (a.triageScore ?? 0);
        if (urgencyDiff !== 0) return urgencyDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Active doctors in this department
      const activeDocs = this.doctors.filter(
        (d) => d.departmentId === dept.id && d.status !== 'OFFLINE' && d.status !== 'ON_BREAK'
      );
      const docCount = Math.max(1, activeDocs.length);
      const avgDuration =
        activeDocs.reduce((acc, d) => acc + d.averageConsultMinutes, 0) / docCount || 10;

      deptWaiting.forEach((ticket, idx) => {
        ticket.patientsAhead = idx;
        ticket.estimatedWaitMinutes = Math.round((idx * avgDuration) / docCount);
      });
    }
  }

  // Operational metrics for Queue Health & Lobby TV Display
  private computeMetrics(): DepartmentMetrics[] {
    return this.departments.map((dept) => {
      const deptTickets = this.tickets.filter((t) => t.departmentId === dept.id);
      const waiting = deptTickets.filter((t) => t.status === 'WAITING');
      const consulting = deptTickets.filter((t) => t.status === 'IN_CONSULTATION');
      const urgentCount = waiting.filter((t) => t.triageLevel === 'URGENT').length;

      const activeDocs = this.doctors.filter(
        (d) => d.departmentId === dept.id && d.status !== 'OFFLINE' && d.status !== 'ON_BREAK'
      );
      const availRooms = this.rooms.filter(
        (r) => r.departmentId === dept.id && r.status === 'AVAILABLE'
      );

      const avgWait = waiting.length
        ? Math.round(waiting.reduce((acc, t) => acc + (t.estimatedWaitMinutes ?? 0), 0) / waiting.length)
        : 0;

      const longestWait = waiting.length
        ? Math.max(...waiting.map((t) => Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000)))
        : 0;

      // Currently serving ticket (called or in consult)
      const serving = deptTickets.find((t) => t.status === 'IN_CONSULTATION' || t.status === 'CALLED');

      // Queue pressure determination
      let pressure: QueuePressure = 'NORMAL';
      if (waiting.length > Math.max(1, activeDocs.length) * 4 || avgWait > 35 || urgentCount >= 3) {
        pressure = 'HIGH';
      } else if (waiting.length > Math.max(1, activeDocs.length) * 2 || avgWait > 15 || urgentCount >= 1) {
        pressure = 'MODERATE';
      }

      return {
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code,
        waitingCount: waiting.length,
        consultingCount: consulting.length,
        activeDoctors: activeDocs.length,
        availableRooms: availRooms.length,
        averageWaitMinutes: avgWait,
        longestWaitMinutes: longestWait,
        urgentWaitingCount: urgentCount,
        queuePressure: pressure,
        currentlyServing: serving
          ? {
              tokenNumber: serving.tokenNumber,
              roomNumber: serving.assignedRoomNumber ?? 'OPD Room',
            }
          : null,
      };
    });
  }

  // ISSUE TICKET (Patient / Walk-In)
  public issueTicket(input: {
    patientId: string;
    patientName: string;
    patientPhone: string;
    departmentId: string;
    visitType: VisitType;
    reason: string;
  }): PatientTicket {
    const dept = this.departments.find((d) => d.id === input.departmentId);
    if (!dept) throw new Error('Invalid department');

    // Duplicate check: Patient cannot have an active ticket in the same department
    const existingActive = this.tickets.find(
      (t) =>
        t.patientId === input.patientId &&
        t.departmentId === input.departmentId &&
        ['CREATED', 'TRIAGE_PENDING', 'WAITING', 'CALLED', 'IN_CONSULTATION'].includes(t.status)
    );
    if (existingActive) {
      return existingActive;
    }

    const seq = (this.tokenSequences[dept.code] ?? 100) + 1;
    this.tokenSequences[dept.code] = seq;
    const tokenNumber = `${dept.code}-${seq}`;

    const newTicket: PatientTicket = {
      id: `tkt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tokenNumber,
      patientId: input.patientId,
      patientName: input.patientName,
      patientPhone: input.patientPhone,
      departmentId: dept.id,
      departmentName: dept.name,
      visitType: input.visitType,
      reason: input.reason,
      triageLevel: 'NORMAL',
      status: 'TRIAGE_PENDING',
      createdAt: new Date().toISOString(),
    };

    this.tickets.push(newTicket);
    this.logEvent(newTicket.id, 'TICKET_CREATED', 'Patient Mobile / Self-Service', `Created ${tokenNumber} for ${input.patientName}`);
    this.recalculate();
    return newTicket;
  }

  public attachEncounterId(ticketId: string, encounterId: string): PatientTicket {
    const ticket = this.tickets.find((candidate) => candidate.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');
    ticket.encounterId = encounterId;
    return ticket;
  }

  public removeTicket(ticketId: string): void {
    this.tickets = this.tickets.filter((ticket) => ticket.id !== ticketId);
    this.recalculate();
  }

  public getTicketByEncounterId(encounterId: string): PatientTicket | undefined {
    return this.tickets.find((ticket) => ticket.encounterId === encounterId);
  }

  // TRIAGE TICKET (Reception / Triage Nurse)
  public triageTicket(
    ticketId: string,
    triageLevel: TriageLevel,
    vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string },
    triageNotes?: string,
    actor = 'Triage Staff',
    priorityScore?: number,
  ): PatientTicket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.triageLevel = triageLevel;
    ticket.vitals = vitals;
    ticket.triageNotes = triageNotes;
    ticket.triageScore = priorityScore;
    ticket.status = 'WAITING';
    ticket.triagedAt = new Date().toISOString();

    this.logEvent(
      ticket.id,
      'TRIAGE_UPDATED',
      actor,
      `Triage Level set to ${triageLevel}. Admitted to ${ticket.departmentName} queue.`
    );
    this.recalculate();
    return ticket;
  }

  // CALL NEXT PATIENT (Doctor Room Console - Atomic Concurrency Protected)
  public callNext(roomId: string, actor = 'Consulting Physician'): PatientTicket {
    if (this.lock) throw new Error('Queue busy, please retry in a moment.');
    this.lock = true;
    try {
      const room = this.rooms.find((r) => r.id === roomId);
      if (!room) throw new Error('Room not found');

      const doctor = this.doctors.find((d) => d.id === room.currentDoctorId || d.assignedRoomId === room.id);
      if (!doctor) throw new Error('No doctor currently assigned to this room.');

      // Find highest priority, earliest waiting ticket in this department
      this.recalculate();
      const eligible = this.tickets
        .filter((t) => t.departmentId === room.departmentId && t.status === 'WAITING')
        .sort((a, b) => {
          const pWeight: Record<TriageLevel, number> = { URGENT: 3, NORMAL: 2, FOLLOW_UP: 1 };
          const diff = (pWeight[b.triageLevel] ?? 0) - (pWeight[a.triageLevel] ?? 0);
          if (diff !== 0) return diff;
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        })[0];

      if (!eligible) {
        throw new Error('No waiting patients in this department queue.');
      }

      // Authoritative atomic transition: WAITING -> CALLED
      eligible.status = 'CALLED';
      eligible.assignedDoctorId = doctor.id;
      eligible.assignedDoctorName = doctor.name;
      eligible.assignedRoomId = room.id;
      eligible.assignedRoomNumber = room.roomNumber;
      eligible.calledAt = new Date().toISOString();

      room.status = 'OCCUPIED';
      doctor.status = 'CALLING';

      this.logEvent(
        eligible.id,
        'PATIENT_CALLED',
        actor,
        `Called ${eligible.tokenNumber} to Room ${room.roomNumber} (${doctor.name})`
      );
      this.recalculate();
      return eligible;
    } finally {
      this.lock = false;
    }
  }

  // START CONSULTATION
  public startConsultation(roomId: string, actor = 'Doctor'): PatientTicket {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const ticket = this.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'CALLED');
    if (!ticket) throw new Error('No called patient found for this room');

    ticket.status = 'IN_CONSULTATION';
    ticket.consultationStartedAt = new Date().toISOString();

    const doctor = this.doctors.find((d) => d.id === ticket.assignedDoctorId);
    if (doctor) doctor.status = 'IN_CONSULTATION';

    this.logEvent(ticket.id, 'CONSULTATION_STARTED', actor, `Consultation started for ${ticket.tokenNumber} in ${room.roomNumber}`);
    this.recalculate();
    return ticket;
  }

  // FINISH CONSULTATION
  public finishConsultation(roomId: string, notes?: string, actor = 'Doctor'): PatientTicket {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const ticket = this.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'IN_CONSULTATION');
    if (!ticket) throw new Error('No active consultation found in this room');

    ticket.status = 'COMPLETED';
    ticket.consultationCompletedAt = new Date().toISOString();

    room.status = 'AVAILABLE';
    const doctor = this.doctors.find((d) => d.id === ticket.assignedDoctorId);
    if (doctor) doctor.status = 'AVAILABLE';

    this.logEvent(ticket.id, 'CONSULTATION_COMPLETED', actor, `Completed visit for ${ticket.tokenNumber}. Notes: ${notes ?? 'Prescription issued.'}`);
    this.recalculate();
    return ticket;
  }

  // MARK NO-SHOW
  public markNoShow(roomId: string, reason?: string, actor = 'Doctor / Staff'): PatientTicket {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const ticket = this.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'CALLED');
    if (!ticket) throw new Error('No called ticket to mark no-show');

    ticket.status = 'NO_SHOW';
    room.status = 'AVAILABLE';
    const doctor = this.doctors.find((d) => d.id === ticket.assignedDoctorId);
    if (doctor) doctor.status = 'AVAILABLE';

    this.logEvent(ticket.id, 'PATIENT_NO_SHOW', actor, `Marked No-Show for ${ticket.tokenNumber}. Reason: ${reason ?? 'Exceeded return window'}`);
    this.recalculate();
    return ticket;
  }

  // RECALL PATIENT
  public recallPatient(roomId: string, actor = 'Doctor'): PatientTicket {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const ticket = this.tickets.find((t) => t.assignedRoomId === room.id && (t.status === 'CALLED' || t.status === 'NO_SHOW'));
    if (!ticket) throw new Error('No ticket eligible for recall');

    ticket.status = 'CALLED';
    ticket.calledAt = new Date().toISOString();
    room.status = 'OCCUPIED';

    this.logEvent(ticket.id, 'PATIENT_RECALLED', actor, `Recalled ${ticket.tokenNumber} to Room ${room.roomNumber}`);
    this.recalculate();
    return ticket;
  }

  // SKIP TICKET
  public skipTicket(roomId: string, actor = 'Doctor'): PatientTicket {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');

    const ticket = this.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'CALLED');
    if (!ticket) throw new Error('No ticket to skip');

    ticket.status = 'SKIPPED';
    room.status = 'AVAILABLE';
    const doctor = this.doctors.find((d) => d.id === ticket.assignedDoctorId);
    if (doctor) doctor.status = 'AVAILABLE';

    this.logEvent(ticket.id, 'TICKET_SKIPPED', actor, `Temporarily skipped ${ticket.tokenNumber}`);
    this.recalculate();
    return ticket;
  }

  // CANCEL TICKET
  public cancelTicket(ticketId: string, actor = 'Patient / Staff', reason = 'Patient cancelled'): PatientTicket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    ticket.status = 'CANCELLED';
    ticket.cancelledAt = new Date().toISOString();

    if (ticket.assignedRoomId) {
      const room = this.rooms.find((r) => r.id === ticket.assignedRoomId);
      if (room && room.status === 'OCCUPIED') room.status = 'AVAILABLE';
    }

    this.logEvent(ticket.id, 'TICKET_CANCELLED', actor, `Cancelled ticket: ${reason}`);
    this.recalculate();
    return ticket;
  }

  // PRIORITY CHANGE AUDIT
  public updatePriority(ticketId: string, priority: TriageLevel, reason: string, actor = 'Operations Staff'): PatientTicket {
    const ticket = this.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket not found');

    const prev = ticket.triageLevel;
    ticket.triageLevel = priority;

    this.logEvent(
      ticket.id,
      'PRIORITY_CHANGED',
      actor,
      `Priority changed: ${prev} -> ${priority}. Reason: ${reason}`
    );
    this.recalculate();
    return ticket;
  }

  // UPDATE DOCTOR STATUS
  public updateDoctorStatus(doctorId: string, status: DoctorAvailability): DoctorProfile {
    const doctor = this.doctors.find((d) => d.id === doctorId);
    if (!doctor) throw new Error('Doctor not found');
    doctor.status = status;
    this.logEvent('SYS', 'DOCTOR_STATUS_CHANGED', doctor.name, `Status updated to ${status}`);
    this.recalculate();
    return doctor;
  }

  // UPDATE ROOM STATUS
  public updateRoomStatus(roomId: string, status: RoomStatus): DoctorRoom {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) throw new Error('Room not found');
    room.status = status;
    this.logEvent('SYS', 'ROOM_STATUS_CHANGED', room.roomNumber, `Room status set to ${status}`);
    this.recalculate();
    return room;
  }

  // FIND ACTIVE TICKET FOR PATIENT
  public getActiveTicketForPatient(patientId: string): PatientTicket | null {
    this.recalculate();
    return (
      this.tickets.find(
        (t) =>
          t.patientId === patientId &&
          ['CREATED', 'TRIAGE_PENDING', 'WAITING', 'CALLED', 'IN_CONSULTATION'].includes(t.status)
      ) ?? null
    );
  }

  // ALL TICKETS FOR PATIENT
  public getTicketsForPatient(patientId: string): PatientTicket[] {
    this.recalculate();
    return this.tickets.filter((t) => t.patientId === patientId).reverse();
  }

  private logEvent(ticketId: string, eventType: string, actor: string, detail: string): void {
    this.events.push({
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ticketId,
      eventType,
      actor,
      detail,
      timestamp: new Date().toISOString(),
    });
  }
}
