import { Injectable } from '@nestjs/common';
import { calculateNews2 } from './wardwatch.scoring';
import type {
  AuditEvent,
  CorrelationFlag,
  DeviceConnection,
  News2Score,
  PatientDevice,
  VitalsReading,
  WardPatient,
} from './wardwatch.types';

@Injectable()
export class WardWatchStore {
  private readonly patients = new Map<string, WardPatient>();
  private readonly devices = new Map<string, PatientDevice>();
  private readonly connections = new Map<string, DeviceConnection>();
  private readonly vitals = new Map<string, VitalsReading[]>();
  private readonly scores = new Map<string, News2Score[]>();
  private readonly flags = new Map<string, CorrelationFlag>();
  private readonly audit: AuditEvent[] = [];

  constructor() {
    seedWard(this);
  }

  listPatients(): WardPatient[] {
    return [...this.patients.values()];
  }

  getPatient(id: string): WardPatient | undefined {
    return this.patients.get(id);
  }

  savePatient(patient: WardPatient): void {
    this.patients.set(patient.id, patient);
  }

  listDevices(patientId?: string): PatientDevice[] {
    return [...this.devices.values()].filter(
      (device) => !patientId || device.patientId === patientId,
    );
  }

  getDevice(id: string): PatientDevice | undefined {
    return this.devices.get(id);
  }

  saveDevice(device: PatientDevice): void {
    this.devices.set(device.id, device);
  }

  listConnections(deviceId?: string): DeviceConnection[] {
    return [...this.connections.values()].filter(
      (connection) => !deviceId || connection.deviceId === deviceId,
    );
  }

  getConnection(id: string): DeviceConnection | undefined {
    return this.connections.get(id);
  }

  saveConnection(connection: DeviceConnection): void {
    this.connections.set(connection.id, connection);
  }

  addVital(reading: VitalsReading): void {
    const list = this.vitals.get(reading.patientId) ?? [];
    list.push(reading);
    list.sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
    this.vitals.set(reading.patientId, list);
  }

  listVitals(patientId: string): VitalsReading[] {
    return this.vitals.get(patientId) ?? [];
  }

  addScore(score: News2Score): void {
    const list = this.scores.get(score.patientId) ?? [];
    list.push(score);
    this.scores.set(score.patientId, list);
  }

  listScores(patientId: string): News2Score[] {
    return this.scores.get(patientId) ?? [];
  }

  listLatestScores(): News2Score[] {
    return [...this.scores.values()]
      .map((list) => list.at(-1))
      .filter((score): score is News2Score => Boolean(score));
  }

  saveFlag(flag: CorrelationFlag): void {
    this.flags.set(flag.id, flag);
  }

  getFlag(id: string): CorrelationFlag | undefined {
    return this.flags.get(id);
  }

  listFlags(patientId?: string): CorrelationFlag[] {
    return [...this.flags.values()].filter(
      (flag) => !patientId || flag.patientId === patientId,
    );
  }

  addAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    this.audit.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      ...event,
    });
    this.audit.splice(25);
  }

  listAudit(): AuditEvent[] {
    return this.audit;
  }
}

function seedWard(store: WardWatchStore): void {
  const now = Date.now();
  const iso = (minutesAgo: number) => new Date(now - minutesAgo * 60000).toISOString();

  // 9 diverse patients across multiple wards
  [
    {
      id: 'P-1024',
      name: 'Aarav Mehta',
      ward: 'General Ward',
      bed: '14',
      age: 64,
      sex: 'M' as const,
      mrn: 'MRN-84920',
      consultant: 'Dr. Sarah Chen, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 3,
      pressureUlcerRisk: 'Moderate',
      infectionAlerts: ['MRSA Screened Negative'],
      allergies: ['Penicillin (Anaphylaxis)'],
      admittedAt: iso(72 * 60),
      primaryDiagnosis: 'Post-op Laparotomy & Sepsis Protocol',
    },
    {
      id: 'P-1230',
      name: 'Fatima Al-Mansoor',
      ward: 'Step-down',
      bed: '16',
      age: 58,
      sex: 'F' as const,
      mrn: 'MRN-61849',
      consultant: 'Dr. A. Rivera, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 4,
      pressureUlcerRisk: 'High',
      infectionAlerts: ['Contact Precautions'],
      allergies: ['Sulfa drugs'],
      admittedAt: iso(120 * 60),
      primaryDiagnosis: 'Septic Shock step-down / Vasopressor taper',
    },
    {
      id: 'P-1088',
      name: 'Maya Rao',
      ward: 'General Ward',
      bed: '21',
      age: 71,
      sex: 'F' as const,
      mrn: 'MRN-72301',
      consultant: 'Dr. Sarah Chen, MD',
      resuscitationStatus: 'DNACPR (Confirmed)',
      fallRiskScore: 5,
      pressureUlcerRisk: 'Moderate',
      infectionAlerts: [],
      allergies: ['No Known Drug Allergies (NKDA)'],
      admittedAt: iso(96 * 60),
      primaryDiagnosis: 'Short Bowel Syndrome / TPN Support',
    },
    {
      id: 'P-1205',
      name: 'David Chen',
      ward: 'Respiratory Ward',
      bed: '05',
      age: 69,
      sex: 'M' as const,
      mrn: 'MRN-55912',
      consultant: 'Dr. K. Williams, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 2,
      pressureUlcerRisk: 'Low',
      infectionAlerts: ['Airborne Precautions'],
      allergies: ['Ciprofloxacin'],
      admittedAt: iso(48 * 60),
      primaryDiagnosis: 'COPD Exacerbation (NEWS2 Scale 2)',
    },
    {
      id: 'P-1140',
      name: 'Elena Torres',
      ward: 'General Ward',
      bed: '03',
      age: 45,
      sex: 'F' as const,
      mrn: 'MRN-90214',
      consultant: 'Dr. Sarah Chen, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 1,
      pressureUlcerRisk: 'Low',
      infectionAlerts: [],
      allergies: ['NKDA'],
      admittedAt: iso(36 * 60),
      primaryDiagnosis: 'Elective Cholecystectomy Post-Op Day 1',
    },
    {
      id: 'P-1270',
      name: 'Marcus Vance',
      ward: 'General Ward',
      bed: '11',
      age: 52,
      sex: 'M' as const,
      mrn: 'MRN-33418',
      consultant: 'Dr. T. Patel, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 2,
      pressureUlcerRisk: 'Low',
      infectionAlerts: [],
      allergies: ['Aspirin'],
      admittedAt: iso(28 * 60),
      primaryDiagnosis: 'Cellulitis resolving on IV antibiotics',
    },
    {
      id: 'P-1102',
      name: 'Jordan Lee',
      ward: 'Step-down',
      bed: '08',
      age: 62,
      sex: 'OTHER' as const,
      mrn: 'MRN-44910',
      consultant: 'Dr. A. Rivera, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 3,
      pressureUlcerRisk: 'Low',
      infectionAlerts: [],
      allergies: ['Codeine'],
      admittedAt: iso(60 * 60),
      primaryDiagnosis: 'Post-CABG Step-down Day 3',
    },
    {
      id: 'P-1184',
      name: 'Samir Khan',
      ward: 'Surgical Ward',
      bed: '12',
      age: 38,
      sex: 'M' as const,
      mrn: 'MRN-88125',
      consultant: 'Dr. L. O\'Neill, MD',
      resuscitationStatus: 'Full Resuscitation',
      fallRiskScore: 1,
      pressureUlcerRisk: 'Low',
      infectionAlerts: [],
      allergies: ['NKDA'],
      admittedAt: iso(24 * 60),
      primaryDiagnosis: 'Partial Hepatectomy Post-Op',
    },
    {
      id: 'P-1255',
      name: 'Grace O\'Connor',
      ward: 'Orthopedic Ward',
      bed: '09',
      age: 79,
      sex: 'F' as const,
      mrn: 'MRN-19482',
      consultant: 'Dr. T. Brooks, MD',
      resuscitationStatus: 'DNACPR (Confirmed)',
      fallRiskScore: 6,
      pressureUlcerRisk: 'High',
      infectionAlerts: ['Fall Risk Protocol'],
      allergies: ['Morphine (Severe Nausea)'],
      admittedAt: iso(16 * 60),
      primaryDiagnosis: 'Total Hip Arthroplasty Post-Op',
    },
  ].forEach((patient) => store.savePatient(patient));

  // Invasive devices
  [
    // P-1024: Aarav Mehta
    {
      id: 'DEV-441',
      patientId: 'P-1024',
      type: 'URINARY_CATHETER' as const,
      location: 'Urethral',
      indication: 'Accurate urine output monitoring',
      currentUse: 'Gravity drainage',
      insertedAt: iso(72 * 60),
      insertedBy: 'Dr. Sarah Chen, MD',
      status: 'REVIEW_DUE' as const,
      indicationResolvedAt: iso(13 * 60),
      reviewReason: 'Documented post-op indication resolved 13h ago. Review due.',
      events: [
        {
          id: 'EVT-441-1',
          deviceId: 'DEV-441',
          timestamp: iso(72 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Urinary Catheter · Urethral (Indication: Post-op accurate urine monitoring)',
          performedBy: 'Dr. Sarah Chen, MD',
        },
        {
          id: 'EVT-441-2',
          deviceId: 'DEV-441',
          timestamp: iso(48 * 60),
          type: 'REVIEWED' as const,
          title: 'Device reviewed',
          description: 'Outcome: Retained — post-op monitoring active',
          performedBy: 'Staff Nurse J. Miller, RN',
        },
      ],
    },
    {
      id: 'DEV-442',
      patientId: 'P-1024',
      type: 'PERIPHERAL_IV' as const,
      location: 'Right forearm',
      indication: 'IV hydration & antibiotics',
      currentUse: 'Antibiotic infusion',
      insertedAt: iso(24 * 60),
      insertedBy: 'Nurse R. Vance, RN',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(4 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-442-1',
          deviceId: 'DEV-442',
          timestamp: iso(24 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Right forearm (Indication: IV hydration & antibiotics)',
          performedBy: 'Nurse R. Vance, RN',
        },
        {
          id: 'EVT-442-2',
          deviceId: 'DEV-442',
          timestamp: iso(4 * 60),
          type: 'REVIEWED' as const,
          title: 'Device reviewed',
          description: 'Outcome: Retained — indication still present',
          performedBy: 'Dr. Sarah Chen, MD',
        },
      ],
    },
    {
      id: 'DEV-440',
      patientId: 'P-1024',
      type: 'PERIPHERAL_IV' as const,
      location: 'Left hand',
      indication: 'Initial ED fluid resuscitation',
      insertedAt: iso(96 * 60),
      insertedBy: 'ED Access Team',
      removedAt: iso(28 * 60),
      removalReason: 'Therapy completed',
      removedBy: 'Staff Nurse J. Miller, RN',
      status: 'REMOVED' as const,
      reviewReason: 'Device removed: Therapy completed',
      events: [
        {
          id: 'EVT-440-1',
          deviceId: 'DEV-440',
          timestamp: iso(96 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Left hand (Indication: Initial ED fluid resuscitation)',
          performedBy: 'ED Access Team',
        },
        {
          id: 'EVT-440-2',
          deviceId: 'DEV-440',
          timestamp: iso(28 * 60),
          type: 'REMOVED' as const,
          title: 'Device removed',
          description: 'Reason: Therapy completed — line saline locked and discontinued',
          performedBy: 'Staff Nurse J. Miller, RN',
        },
      ],
    },

    // P-1230: Fatima Al-Mansoor
    {
      id: 'DEV-810',
      patientId: 'P-1230',
      type: 'CENTRAL_LINE' as const,
      location: 'Right IJ',
      indication: 'Vasopressor infusion & CVP monitoring',
      currentUse: 'Norepinephrine infusion',
      insertedAt: iso(4 * 24 * 60),
      insertedBy: 'Dr. A. Rivera, MD',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(12 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-810-1',
          deviceId: 'DEV-810',
          timestamp: iso(4 * 24 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Central Line · Right IJ (Indication: Vasopressor infusion & CVP monitoring)',
          performedBy: 'Dr. A. Rivera, MD',
        },
        {
          id: 'EVT-810-2',
          deviceId: 'DEV-810',
          timestamp: iso(12 * 60),
          type: 'REVIEWED' as const,
          title: 'Device reviewed',
          description: 'Outcome: Retained — indication still present',
          performedBy: 'Dr. Sarah Chen, MD',
        },
      ],
    },
    {
      id: 'DEV-811',
      patientId: 'P-1230',
      type: 'URINARY_CATHETER' as const,
      location: 'Urethral',
      indication: 'Strict I/O fluid balance in shock management',
      currentUse: 'Closed drainage system',
      insertedAt: iso(5 * 24 * 60),
      insertedBy: 'Staff Nurse K. Patel, RN',
      status: 'REVIEW_DUE' as const,
      reviewReason: 'Device review is overdue for this ward interval.',
      events: [
        {
          id: 'EVT-811-1',
          deviceId: 'DEV-811',
          timestamp: iso(5 * 24 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Urinary Catheter · Urethral (Indication: Strict I/O fluid balance)',
          performedBy: 'Staff Nurse K. Patel, RN',
        },
      ],
    },

    // P-1088: Maya Rao
    {
      id: 'DEV-512',
      patientId: 'P-1088',
      type: 'CENTRAL_LINE' as const,
      location: 'Right Subclavian',
      indication: 'Total Parenteral Nutrition',
      currentUse: 'Total Parenteral Nutrition',
      insertedAt: iso(5 * 24 * 60),
      insertedBy: 'Surgical Team',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(9 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-512-1',
          deviceId: 'DEV-512',
          timestamp: iso(5 * 24 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Central Line · Right Subclavian (Indication: Total Parenteral Nutrition)',
          performedBy: 'Surgical Team',
        },
      ],
    },

    // P-1205: David Chen
    {
      id: 'DEV-750',
      patientId: 'P-1205',
      type: 'PERIPHERAL_IV' as const,
      location: 'Left hand',
      indication: 'Difficult peripheral access & PRN bronchodilators',
      currentUse: 'PRN IV medications',
      insertedAt: iso(20 * 60),
      insertedBy: 'Vascular Access Team',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(4 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-750-1',
          deviceId: 'DEV-750',
          timestamp: iso(20 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Left hand (Indication: Difficult access & PRN medications)',
          performedBy: 'Vascular Access Team',
        },
      ],
    },

    // P-1140: Elena Torres
    {
      id: 'DEV-610',
      patientId: 'P-1140',
      type: 'PERIPHERAL_IV' as const,
      location: 'Left forearm',
      indication: 'IV hydration access',
      currentUse: 'Currently unused',
      insertedAt: iso(30 * 60),
      insertedBy: 'Ward Nurse T. Brooks, RN',
      status: 'REVIEW_DUE' as const,
      reviewReason: 'Peripheral IV has no active connection or other documented purpose.',
      events: [
        {
          id: 'EVT-610-1',
          deviceId: 'DEV-610',
          timestamp: iso(30 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Left forearm (Indication: IV hydration access)',
          performedBy: 'Ward Nurse T. Brooks, RN',
        },
      ],
    },

    // P-1270: Marcus Vance
    {
      id: 'DEV-860',
      patientId: 'P-1270',
      type: 'PERIPHERAL_IV' as const,
      location: 'Right antecubital',
      indication: 'IV hydration & antiemetics',
      currentUse: 'IV fluids',
      insertedAt: iso(14 * 60),
      insertedBy: 'Ward Nurse M. Scott, RN',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(6 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-860-1',
          deviceId: 'DEV-860',
          timestamp: iso(14 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Right antecubital (Indication: IV hydration & antiemetics)',
          performedBy: 'Ward Nurse M. Scott, RN',
        },
      ],
    },

    // P-1102: Jordan Lee
    {
      id: 'DEV-650',
      patientId: 'P-1102',
      type: 'PERIPHERAL_IV' as const,
      location: 'Right forearm',
      indication: 'Maintenance IV fluids',
      currentUse: 'IV fluids',
      insertedAt: iso(18 * 60),
      insertedBy: 'Ward Nurse S. Gomez, RN',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(3 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-650-1',
          deviceId: 'DEV-650',
          timestamp: iso(18 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Right forearm (Indication: Maintenance IV fluids)',
          performedBy: 'Ward Nurse S. Gomez, RN',
        },
      ],
    },

    // P-1184: Samir Khan
    {
      id: 'DEV-702',
      patientId: 'P-1184',
      type: 'SURGICAL_DRAIN' as const,
      location: 'Sub-hepatic space',
      indication: 'Post-operative drainage',
      currentUse: 'Closed suction drainage',
      insertedAt: iso(24 * 60),
      insertedBy: 'Dr. L. O\'Neill, MD',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(2 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-702-1',
          deviceId: 'DEV-702',
          timestamp: iso(24 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Surgical Drain · Sub-hepatic space (Indication: Post-operative drainage)',
          performedBy: 'Dr. L. O\'Neill, MD',
        },
      ],
    },
    {
      id: 'DEV-703',
      patientId: 'P-1184',
      type: 'PERIPHERAL_IV' as const,
      location: 'Left wrist',
      indication: 'Post-op analgesia',
      currentUse: 'Patient-controlled analgesia',
      insertedAt: iso(24 * 60),
      insertedBy: 'Ward Nurse M. Scott, RN',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(5 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-703-1',
          deviceId: 'DEV-703',
          timestamp: iso(24 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Left wrist (Indication: Post-op analgesia)',
          performedBy: 'Ward Nurse M. Scott, RN',
        },
      ],
    },

    // P-1255: Grace O'Connor
    {
      id: 'DEV-780',
      patientId: 'P-1255',
      type: 'PERIPHERAL_IV' as const,
      location: 'Right forearm',
      indication: 'Antibiotic prophylaxis',
      currentUse: 'IV fluids',
      insertedAt: iso(16 * 60),
      insertedBy: 'Ward Nurse T. Brooks, RN',
      status: 'ACTIVE' as const,
      lastReviewedAt: iso(4 * 60),
      lastReviewOutcome: 'Retained — indication still present',
      lastReviewedBy: 'Dr. Sarah Chen, MD',
      events: [
        {
          id: 'EVT-780-1',
          deviceId: 'DEV-780',
          timestamp: iso(16 * 60),
          type: 'INSERTED' as const,
          title: 'Device inserted',
          description: 'Peripheral IV · Right forearm (Indication: Antibiotic prophylaxis)',
          performedBy: 'Ward Nurse T. Brooks, RN',
        },
      ],
    },
  ].forEach((device) => store.saveDevice(device));

  // Active line connections
  [
    {
      id: 'CON-1',
      deviceId: 'DEV-512',
      type: 'NUTRITION' as const,
      referenceId: 'TPN-FORMULA-A',
      startedAt: iso(10 * 60),
    },
    {
      id: 'CON-2',
      deviceId: 'DEV-610',
      type: 'FLUID' as const,
      referenceId: 'SALINE-0.9',
      startedAt: iso(28 * 60),
      endedAt: iso(3 * 60),
    },
    {
      id: 'CON-10',
      deviceId: 'DEV-442',
      type: 'FLUID' as const,
      referenceId: 'NS-100ML-HR',
      startedAt: iso(20 * 60),
    },
    {
      id: 'CON-11',
      deviceId: 'DEV-810',
      type: 'MEDICATION' as const,
      referenceId: 'NOREPINEPHRINE-INF',
      startedAt: iso(36 * 60),
    },
    {
      id: 'CON-12',
      deviceId: 'DEV-811',
      type: 'DRAINAGE' as const,
      referenceId: 'FOLEY-BAG-CLOSED',
      startedAt: iso(5 * 24 * 60),
    },
    {
      id: 'CON-14',
      deviceId: 'DEV-860',
      type: 'FLUID' as const,
      referenceId: 'D5-HALF-NS',
      startedAt: iso(12 * 60),
    },
    {
      id: 'CON-15',
      deviceId: 'DEV-650',
      type: 'FLUID' as const,
      referenceId: 'PLASMALYTE-A',
      startedAt: iso(16 * 60),
    },
    {
      id: 'CON-16',
      deviceId: 'DEV-702',
      type: 'DRAINAGE' as const,
      referenceId: 'JP-BULB-VACUUM',
      startedAt: iso(24 * 60),
    },
    {
      id: 'CON-17',
      deviceId: 'DEV-780',
      type: 'MEDICATION' as const,
      referenceId: 'CEFAZOLIN-2G',
      startedAt: iso(8 * 60),
    },
  ].forEach((connection) => store.saveConnection(connection));

  // Sequential historical vitals readings for all patients
  const readings = [
    {
      patientId: 'P-1024',
      rows: [
        { respiratoryRate: 18, spo2: 97, temperature: 37.6, systolicBP: 126, heartRate: 88, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(8 * 60) },
        { respiratoryRate: 21, spo2: 96, temperature: 37.9, systolicBP: 118, heartRate: 96, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(4 * 60) },
        { respiratoryRate: 23, spo2: 94, temperature: 38.4, systolicBP: 112, heartRate: 108, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(25) },
      ],
    },
    {
      patientId: 'P-1230',
      rows: [
        { respiratoryRate: 20, spo2: 96, temperature: 37.8, systolicBP: 105, heartRate: 92, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(6 * 60) },
        { respiratoryRate: 24, spo2: 93, temperature: 38.6, systolicBP: 94, heartRate: 112, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(3 * 60) },
        { respiratoryRate: 26, spo2: 91, temperature: 39.2, systolicBP: 88, heartRate: 122, consciousness: 'CONFUSION' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(15) },
      ],
    },
    {
      patientId: 'P-1088',
      rows: [
        { respiratoryRate: 18, spo2: 96, temperature: 37.4, systolicBP: 122, heartRate: 88, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(80) },
        { respiratoryRate: 20, spo2: 95, temperature: 37.8, systolicBP: 118, heartRate: 93, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(53) },
      ],
    },
    {
      patientId: 'P-1205',
      rows: [
        { respiratoryRate: 20, spo2: 88, temperature: 36.9, systolicBP: 132, heartRate: 82, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 2 as const, takenAt: iso(8 * 60) },
        { respiratoryRate: 22, spo2: 89, temperature: 37.2, systolicBP: 128, heartRate: 86, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 2 as const, takenAt: iso(6 * 60) },
        { respiratoryRate: 21, spo2: 90, temperature: 37.1, systolicBP: 130, heartRate: 84, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 2 as const, takenAt: iso(4 * 60 + 12) },
      ],
    },
    {
      patientId: 'P-1140',
      rows: [
        { respiratoryRate: 16, spo2: 98, temperature: 36.8, systolicBP: 124, heartRate: 76, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(18 * 60) },
        { respiratoryRate: 16, spo2: 97, temperature: 37.2, systolicBP: 128, heartRate: 84, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(12 * 60 + 5) },
      ],
    },
    {
      patientId: 'P-1270',
      rows: [
        { respiratoryRate: 18, spo2: 96, temperature: 37.4, systolicBP: 134, heartRate: 80, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(28 * 60) },
      ],
    },
    {
      patientId: 'P-1102',
      rows: [
        { respiratoryRate: 23, spo2: 94, temperature: 38.2, systolicBP: 110, heartRate: 102, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(36 * 60) },
        { respiratoryRate: 20, spo2: 96, temperature: 37.5, systolicBP: 118, heartRate: 90, consciousness: 'ALERT' as const, supplementalOxygen: true, spo2Scale: 1 as const, takenAt: iso(30 * 60) },
        { respiratoryRate: 17, spo2: 98, temperature: 36.9, systolicBP: 122, heartRate: 74, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(24 * 60) },
      ],
    },
    {
      patientId: 'P-1184',
      rows: [
        { respiratoryRate: 18, spo2: 97, temperature: 37.4, systolicBP: 126, heartRate: 82, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(8 * 60) },
        { respiratoryRate: 19, spo2: 96, temperature: 37.7, systolicBP: 122, heartRate: 86, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(4 * 60) },
        { respiratoryRate: 18, spo2: 97, temperature: 37.3, systolicBP: 124, heartRate: 80, consciousness: 'ALERT' as const, supplementalOxygen: false, spo2Scale: 1 as const, takenAt: iso(60) },
      ],
    },
    {
      patientId: 'P-1255',
      rows: [],
    },
  ];

  readings.forEach(({ patientId, rows }) => {
    rows.forEach((row, index) => {
      const reading = {
        id: `VIT-SEED-${patientId}-${index + 1}`,
        patientId,
        ...row,
      };
      store.addVital(reading);
      store.addScore(calculateNews2(reading, store.listScores(patientId)));
    });
  });
}
