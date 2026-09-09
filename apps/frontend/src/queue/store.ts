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
} from './types';

const STORAGE_KEY = 'sanctuary_smart_opd_v2';

function createSeedSnapshot(): QueueSnapshot {
  const departments: Department[] = [
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

  const rooms: DoctorRoom[] = [
    { id: 'room-gm-01', roomNumber: 'GM-01', departmentId: 'dept-gm', status: 'AVAILABLE', currentDoctorId: 'doc-01' },
    { id: 'room-gm-02', roomNumber: 'GM-02', departmentId: 'dept-gm', status: 'AVAILABLE', currentDoctorId: 'doc-02' },
    { id: 'room-gm-03', roomNumber: 'GM-03', departmentId: 'dept-gm', status: 'AVAILABLE', currentDoctorId: null },
    { id: 'room-card-01', roomNumber: 'CARD-01', departmentId: 'dept-card', status: 'OCCUPIED', currentDoctorId: 'doc-03' },
    { id: 'room-card-02', roomNumber: 'CARD-02', departmentId: 'dept-card', status: 'AVAILABLE', currentDoctorId: 'doc-04' },
    { id: 'room-orth-01', roomNumber: 'ORTH-01', departmentId: 'dept-orth', status: 'AVAILABLE', currentDoctorId: 'doc-05' },
    { id: 'room-ped-01', roomNumber: 'PED-01', departmentId: 'dept-ped', status: 'AVAILABLE', currentDoctorId: 'doc-06' },
    { id: 'room-derm-01', roomNumber: 'DERM-01', departmentId: 'dept-derm', status: 'AVAILABLE', currentDoctorId: 'doc-07' },
  ];

  const doctors: DoctorProfile[] = [
    { id: 'doc-01', name: 'Dr. Sunita Rao', departmentId: 'dept-gm', assignedRoomId: 'room-gm-01', status: 'AVAILABLE', averageConsultMinutes: 8 },
    { id: 'doc-02', name: 'Dr. Rajesh Sharma', departmentId: 'dept-gm', assignedRoomId: 'room-gm-02', status: 'AVAILABLE', averageConsultMinutes: 10 },
    { id: 'doc-03', name: 'Dr. Vikram Malhotra', departmentId: 'dept-card', assignedRoomId: 'room-card-01', status: 'CALLING', averageConsultMinutes: 12 },
    { id: 'doc-04', name: 'Dr. Meera Iyer', departmentId: 'dept-card', assignedRoomId: 'room-card-02', status: 'AVAILABLE', averageConsultMinutes: 10 },
    { id: 'doc-05', name: 'Dr. Amit Mehta', departmentId: 'dept-orth', assignedRoomId: 'room-orth-01', status: 'AVAILABLE', averageConsultMinutes: 15 },
    { id: 'doc-06', name: 'Dr. Sneha Gupta', departmentId: 'dept-ped', assignedRoomId: 'room-ped-01', status: 'AVAILABLE', averageConsultMinutes: 9 },
    { id: 'doc-07', name: 'Dr. Arun Pillai', departmentId: 'dept-derm', assignedRoomId: 'room-derm-01', status: 'AVAILABLE', averageConsultMinutes: 7 },
  ];

  const policy: QueuePolicy = {
    approachingThreshold: 2,
    returnWindowMinutes: 5,
    priorityWeights: { URGENT: 3, NORMAL: 2, FOLLOW_UP: 1 },
  };

  const tickets: PatientTicket[] = [
    {
      id: 'tkt-01',
      tokenNumber: 'GEN-101',
      patientId: 'PAT-000101',
      patientName: 'Ananya Sharma',
      patientPhone: '9000011111',
      departmentId: 'dept-gm',
      departmentName: 'General Medicine',
      visitType: 'NEW',
      reason: 'Persistent fever and fatigue for 3 days',
      triageLevel: 'NORMAL',
      status: 'WAITING',
      createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
      triagedAt: new Date(Date.now() - 40 * 60000).toISOString(),
    },
    {
      id: 'tkt-02',
      tokenNumber: 'GEN-102',
      patientId: 'PAT-000102',
      patientName: 'Rohan Patel',
      patientPhone: '9000022222',
      departmentId: 'dept-gm',
      departmentName: 'General Medicine',
      visitType: 'NEW',
      reason: 'Chest tightness and shortness of breath',
      triageLevel: 'URGENT',
      status: 'WAITING',
      createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
      triagedAt: new Date(Date.now() - 25 * 60000).toISOString(),
      vitals: { bp: '142/90', pulse: '98', temp: '98.6', spo2: '96' },
      triageNotes: 'Priority escalated due to vitals',
    },
    {
      id: 'tkt-03',
      tokenNumber: 'CARD-201',
      patientId: 'PAT-000103',
      patientName: 'Neha Das',
      patientPhone: '9000033333',
      departmentId: 'dept-card',
      departmentName: 'Cardiology',
      visitType: 'FOLLOW_UP',
      reason: 'Post-angioplasty routine review',
      triageLevel: 'FOLLOW_UP',
      status: 'CALLED',
      assignedDoctorId: 'doc-03',
      assignedDoctorName: 'Dr. Vikram Malhotra',
      assignedRoomId: 'room-card-01',
      assignedRoomNumber: 'CARD-01',
      createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
      triagedAt: new Date(Date.now() - 50 * 60000).toISOString(),
      calledAt: new Date(Date.now() - 2 * 60000).toISOString(),
    },
    {
      id: 'tkt-04',
      tokenNumber: 'PED-401',
      patientId: 'PAT-000104',
      patientName: 'Imran Ali (Child: Zaid)',
      patientPhone: '9000044444',
      departmentId: 'dept-ped',
      departmentName: 'Pediatrics',
      visitType: 'NEW',
      reason: 'Viral rash and dry cough',
      triageLevel: 'NORMAL',
      status: 'WAITING',
      createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
      triagedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'tkt-05',
      tokenNumber: 'GEN-100',
      patientId: 'PAT-000105',
      patientName: 'Priya Nambiar',
      patientPhone: '9000055555',
      departmentId: 'dept-gm',
      departmentName: 'General Medicine',
      visitType: 'REVIEW',
      reason: 'Blood test reports review',
      triageLevel: 'NORMAL',
      status: 'COMPLETED',
      assignedDoctorId: 'doc-01',
      assignedDoctorName: 'Dr. Sunita Rao',
      assignedRoomId: 'room-gm-01',
      assignedRoomNumber: 'GM-01',
      createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
      triagedAt: new Date(Date.now() - 85 * 60000).toISOString(),
      calledAt: new Date(Date.now() - 35 * 60000).toISOString(),
      consultationStartedAt: new Date(Date.now() - 30 * 60000).toISOString(),
      consultationCompletedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ];

  const events: QueueEvent[] = [
    {
      id: 'ev-01',
      ticketId: 'tkt-05',
      eventType: 'CONSULTATION_COMPLETED',
      actor: 'Dr. Sunita Rao',
      detail: 'Consultation finished in Room GM-01 for Priya Nambiar',
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: 'ev-02',
      ticketId: 'tkt-03',
      eventType: 'PATIENT_CALLED',
      actor: 'Dr. Vikram Malhotra',
      detail: 'Called Token CARD-201 to Room CARD-01',
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    },
  ];

  return recalculateLocal({
    departments,
    rooms,
    doctors,
    tickets,
    events,
    policy,
    metrics: [],
  });
}

function recalculateLocal(snapshot: QueueSnapshot): QueueSnapshot {
  const priorityWeight: Record<TriageLevel, number> = {
    URGENT: 3,
    NORMAL: 2,
    FOLLOW_UP: 1,
  };

  for (const dept of snapshot.departments) {
    const deptWaiting = snapshot.tickets.filter(
      (t) => t.departmentId === dept.id && t.status === 'WAITING'
    );

    deptWaiting.sort((a, b) => {
      const pDiff = (priorityWeight[b.triageLevel] ?? 0) - (priorityWeight[a.triageLevel] ?? 0);
      if (pDiff !== 0) return pDiff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const activeDocs = snapshot.doctors.filter(
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

  // Compute Metrics
  snapshot.metrics = snapshot.departments.map((dept) => {
    const deptTickets = snapshot.tickets.filter((t) => t.departmentId === dept.id);
    const waiting = deptTickets.filter((t) => t.status === 'WAITING');
    const consulting = deptTickets.filter((t) => t.status === 'IN_CONSULTATION');
    const urgentCount = waiting.filter((t) => t.triageLevel === 'URGENT').length;

    const activeDocs = snapshot.doctors.filter(
      (d) => d.departmentId === dept.id && d.status !== 'OFFLINE' && d.status !== 'ON_BREAK'
    );
    const availRooms = snapshot.rooms.filter(
      (r) => r.departmentId === dept.id && r.status === 'AVAILABLE'
    );

    const avgWait = waiting.length
      ? Math.round(waiting.reduce((acc, t) => acc + (t.estimatedWaitMinutes ?? 0), 0) / waiting.length)
      : 0;

    const longestWait = waiting.length
      ? Math.max(...waiting.map((t) => Math.round((Date.now() - new Date(t.createdAt).getTime()) / 60000)))
      : 0;

    const serving = deptTickets.find((t) => t.status === 'IN_CONSULTATION' || t.status === 'CALLED');

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

  return snapshot;
}

export function loadLocalSnapshot(): QueueSnapshot {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createSeedSnapshot();
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as QueueSnapshot;
    return recalculateLocal(parsed);
  } catch {
    const fallback = createSeedSnapshot();
    return fallback;
  }
}

type Listener = (snapshot: QueueSnapshot) => void;
const listeners: Set<Listener> = new Set();

export function subscribeQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function saveLocalSnapshot(snapshot: QueueSnapshot): void {
  try {
    const updated = recalculateLocal(snapshot);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    listeners.forEach((fn) => {
      try {
        fn(updated);
      } catch (e) {
        console.error(e);
      }
    });
  } catch {
    /* ignore storage errors */
  }
}


// ISSUE TICKET
export function issueTicketLocal(input: {
  patientId: string;
  patientName: string;
  patientPhone: string;
  departmentId: string;
  visitType: VisitType;
  reason: string;
}): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const dept = snapshot.departments.find((d) => d.id === input.departmentId);
  if (!dept) throw new Error('Invalid department');

  const existingActive = snapshot.tickets.find(
    (t) =>
      t.patientId === input.patientId &&
      t.departmentId === input.departmentId &&
      ['CREATED', 'TRIAGE_PENDING', 'WAITING', 'CALLED', 'IN_CONSULTATION'].includes(t.status)
  );
  if (existingActive) return existingActive;

  const count = snapshot.tickets.filter((t) => t.departmentId === dept.id).length;
  const tokenNumber = `${dept.code}-${100 + count + 1}`;

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

  snapshot.tickets.push(newTicket);
  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: newTicket.id,
    eventType: 'TICKET_CREATED',
    actor: 'Patient Mobile / Self-Service',
    detail: `Created ${tokenNumber} for ${input.patientName}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return newTicket;
}

// TRIAGE TICKET
export function triageTicketLocal(
  ticketId: string,
  input: {
    triageLevel: TriageLevel;
    vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
    triageNotes?: string;
    actor?: string;
  }
): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const ticket = snapshot.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error('Ticket not found');

  ticket.triageLevel = input.triageLevel;
  ticket.vitals = input.vitals;
  ticket.triageNotes = input.triageNotes;
  ticket.status = 'WAITING';
  ticket.triagedAt = new Date().toISOString();

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'TRIAGE_UPDATED',
    actor: input.actor ?? 'Triage Staff',
    detail: `Triage Level set to ${input.triageLevel}. Admitted to ${ticket.departmentName} queue.`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// CALL NEXT PATIENT
export function callNextLocal(roomId: string, actor = 'Consulting Physician'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');

  const doctor = snapshot.doctors.find((d) => d.id === room.currentDoctorId || d.assignedRoomId === room.id);
  if (!doctor) throw new Error('No doctor assigned to this room');

  const pWeight: Record<TriageLevel, number> = { URGENT: 3, NORMAL: 2, FOLLOW_UP: 1 };
  const eligible = snapshot.tickets
    .filter((t) => t.departmentId === room.departmentId && t.status === 'WAITING')
    .sort((a, b) => {
      const diff = (pWeight[b.triageLevel] ?? 0) - (pWeight[a.triageLevel] ?? 0);
      if (diff !== 0) return diff;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    })[0];

  if (!eligible) throw new Error('No waiting patients in this department queue.');

  eligible.status = 'CALLED';
  eligible.assignedDoctorId = doctor.id;
  eligible.assignedDoctorName = doctor.name;
  eligible.assignedRoomId = room.id;
  eligible.assignedRoomNumber = room.roomNumber;
  eligible.calledAt = new Date().toISOString();

  room.status = 'OCCUPIED';
  doctor.status = 'CALLING';

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: eligible.id,
    eventType: 'PATIENT_CALLED',
    actor,
    detail: `Called ${eligible.tokenNumber} to Room ${room.roomNumber} (${doctor.name})`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return eligible;
}

// START CONSULTATION
export function startConsultationLocal(roomId: string, actor = 'Doctor'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');

  const ticket = snapshot.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'CALLED');
  if (!ticket) throw new Error('No called patient in this room');

  ticket.status = 'IN_CONSULTATION';
  ticket.consultationStartedAt = new Date().toISOString();

  const doctor = snapshot.doctors.find((d) => d.id === ticket.assignedDoctorId);
  if (doctor) doctor.status = 'IN_CONSULTATION';

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'CONSULTATION_STARTED',
    actor,
    detail: `Consultation started for ${ticket.tokenNumber} in ${room.roomNumber}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// FINISH CONSULTATION
export function finishConsultationLocal(roomId: string, notes?: string, actor = 'Doctor'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');

  const ticket = snapshot.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'IN_CONSULTATION');
  if (!ticket) throw new Error('No active consultation in this room');

  ticket.status = 'COMPLETED';
  ticket.consultationCompletedAt = new Date().toISOString();

  room.status = 'AVAILABLE';
  const doctor = snapshot.doctors.find((d) => d.id === ticket.assignedDoctorId);
  if (doctor) doctor.status = 'AVAILABLE';

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'CONSULTATION_COMPLETED',
    actor,
    detail: `Completed visit for ${ticket.tokenNumber}. Notes: ${notes ?? 'Prescription issued.'}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// MARK NO SHOW
export function markNoShowLocal(roomId: string, reason?: string, actor = 'Doctor / Staff'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');

  const ticket = snapshot.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'CALLED');
  if (!ticket) throw new Error('No called ticket to mark no-show');

  ticket.status = 'NO_SHOW';
  room.status = 'AVAILABLE';
  const doctor = snapshot.doctors.find((d) => d.id === ticket.assignedDoctorId);
  if (doctor) doctor.status = 'AVAILABLE';

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'PATIENT_NO_SHOW',
    actor,
    detail: `Marked No-Show for ${ticket.tokenNumber}. Reason: ${reason ?? 'Exceeded return window'}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// RECALL PATIENT
export function recallPatientLocal(roomId: string, actor = 'Doctor'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');

  const ticket = snapshot.tickets.find(
    (t) => t.assignedRoomId === room.id && (t.status === 'CALLED' || t.status === 'NO_SHOW')
  );
  if (!ticket) throw new Error('No ticket eligible for recall');

  ticket.status = 'CALLED';
  ticket.calledAt = new Date().toISOString();
  room.status = 'OCCUPIED';

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'PATIENT_RECALLED',
    actor,
    detail: `Recalled ${ticket.tokenNumber} to Room ${room.roomNumber}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// SKIP TICKET
export function skipTicketLocal(roomId: string, actor = 'Doctor'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');

  const ticket = snapshot.tickets.find((t) => t.assignedRoomId === room.id && t.status === 'CALLED');
  if (!ticket) throw new Error('No ticket to skip');

  ticket.status = 'SKIPPED';
  room.status = 'AVAILABLE';
  const doctor = snapshot.doctors.find((d) => d.id === ticket.assignedDoctorId);
  if (doctor) doctor.status = 'AVAILABLE';

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'TICKET_SKIPPED',
    actor,
    detail: `Temporarily skipped ${ticket.tokenNumber}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// CANCEL TICKET
export function cancelTicketLocal(ticketId: string, actor = 'Patient / Staff', reason = 'Patient cancelled'): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const ticket = snapshot.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error('Ticket not found');

  ticket.status = 'CANCELLED';
  ticket.cancelledAt = new Date().toISOString();

  if (ticket.assignedRoomId) {
    const room = snapshot.rooms.find((r) => r.id === ticket.assignedRoomId);
    if (room && room.status === 'OCCUPIED') room.status = 'AVAILABLE';
  }

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'TICKET_CANCELLED',
    actor,
    detail: `Cancelled ticket: ${reason}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// UPDATE PRIORITY
export function updatePriorityLocal(
  ticketId: string,
  priority: TriageLevel,
  reason: string,
  actor = 'Operations Staff'
): PatientTicket {
  const snapshot = loadLocalSnapshot();
  const ticket = snapshot.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error('Ticket not found');

  const prev = ticket.triageLevel;
  ticket.triageLevel = priority;

  snapshot.events.unshift({
    id: `ev-${Date.now()}`,
    ticketId: ticket.id,
    eventType: 'PRIORITY_CHANGED',
    actor,
    detail: `Priority changed: ${prev} -> ${priority}. Reason: ${reason}`,
    timestamp: new Date().toISOString(),
  });

  saveLocalSnapshot(snapshot);
  return ticket;
}

// UPDATE DOCTOR STATUS
export function updateDoctorStatusLocal(doctorId: string, status: DoctorAvailability): DoctorProfile {
  const snapshot = loadLocalSnapshot();
  const doctor = snapshot.doctors.find((d) => d.id === doctorId);
  if (!doctor) throw new Error('Doctor not found');
  doctor.status = status;
  saveLocalSnapshot(snapshot);
  return doctor;
}

// UPDATE ROOM STATUS
export function updateRoomStatusLocal(roomId: string, status: RoomStatus): DoctorRoom {
  const snapshot = loadLocalSnapshot();
  const room = snapshot.rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Room not found');
  room.status = status;
  saveLocalSnapshot(snapshot);
  return room;
}
