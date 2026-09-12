import {
  ConflictException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  buildRecheckPriority,
  selectOpenFlags,
  selectReviewDueDevices,
  selectRisingTrends,
} from './wardwatch.analytics';
import { calculateNews2 } from './wardwatch.scoring';
import {
  buildCorrelationFlag,
  evaluateDevice,
} from './wardwatch.rules';
import { WardWatchStore } from './wardwatch.store';
import type {
  CorrelationFlag,
  DeviceConnection,
  FlagResolution,
  PatientCombinedView,
  PatientDevice,
  VitalsReading,
  WardDashboard,
} from './wardwatch.types';

@Injectable()
export class WardWatchService {
  constructor(private readonly store: WardWatchStore) {}

  getDashboard(): WardDashboard {
    this.refreshAllPatients();
    const patients = this.store.listPatients();
    const devices = this.store.listDevices();
    const flags = this.store.listFlags();
    const latestScores = this.store.listLatestScores();
    const latestObservationAt = new Map(
      patients.map((patient) => [
        patient.id,
        this.store.listVitals(patient.id).at(-1)?.takenAt ?? '',
      ]),
    );

    return {
      patients,
      openFlags: selectOpenFlags(flags),
      reviewDueDevices: selectReviewDueDevices(devices),
      risingTrends: selectRisingTrends(latestScores),
      recheckPriority: buildRecheckPriority({
        patients,
        latestScores,
        latestObservationAt,
      }),
      auditTrail: this.store.listAudit(),
    };
  }

  getReviewDueDevices() {
    return this.getDashboard().reviewDueDevices;
  }

  getRisingTrends() {
    return this.getDashboard().risingTrends;
  }

  getRecheckPriority() {
    return this.getDashboard().recheckPriority;
  }

  getPatientCombinedView(patientId: string): PatientCombinedView {
    const patient = this.store.getPatient(patientId);
    if (!patient) throw new NotFoundException(`Patient ${patientId} not found.`);
    this.refreshPatient(patientId);

    return {
      patient,
      devices: this.store.listDevices(patientId),
      connections: this.store
        .listDevices(patientId)
        .flatMap((device) => this.store.listConnections(device.id)),
      vitals: this.store.listVitals(patientId),
      news2: this.store.listScores(patientId),
      flags: this.store.listFlags(patientId),
    };
  }

  createDevice(payload: Partial<PatientDevice>): PatientDevice {
    if (!payload.patientId || !this.store.getPatient(payload.patientId)) {
      throw new NotFoundException('Valid patientId is required.');
    }
    if (!payload.type) throw new BadRequestException('Device type is required.');

    const deviceId = payload.id ?? `DEV-${Math.floor(Math.random() * 9000 + 1000)}`;
    const insertedAt = payload.insertedAt ?? new Date().toISOString();
    const performer = payload.insertedBy ?? 'Dr. Sarah Chen, MD';

    const device: PatientDevice = {
      id: deviceId,
      patientId: payload.patientId,
      type: payload.type,
      location: payload.location,
      indication: payload.indication,
      currentUse: payload.currentUse,
      notes: payload.notes,
      insertedAt,
      insertedBy: performer,
      status: 'ACTIVE',
      lastReviewedAt: payload.lastReviewedAt,
      events: [
        {
          id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          deviceId,
          timestamp: insertedAt,
          type: 'INSERTED',
          title: 'Device inserted',
          description: `${payload.type.replace(/_/g, ' ')} · ${payload.location ?? 'Site not specified'} (Indication: ${payload.indication ?? 'None'})`,
          performedBy: performer,
        },
      ],
    };

    const evaluated = evaluateDevice(device, []);
    device.status = evaluated.status;
    device.reviewReason = evaluated.reason;
    this.store.saveDevice(device);
    this.store.addAudit({
      patientId: device.patientId,
      action: 'DEVICE_CREATED',
      after: device,
    });
    this.refreshPatient(device.patientId);
    return device;
  }

  updateDevice(id: string, payload: Partial<PatientDevice>): PatientDevice {
    const current = this.getDeviceOrThrow(id);
    if (current.status === 'REMOVED') {
      throw new ConflictException('Removed devices cannot be reactivated.');
    }
    const next: PatientDevice = { ...current, ...payload, id: current.id };
    const evaluated = evaluateDevice(next, this.store.listConnections(id));
    next.status = evaluated.status;
    next.reviewReason = evaluated.reason;
    this.store.saveDevice(next);
    this.store.addAudit({
      patientId: next.patientId,
      action: 'DEVICE_UPDATED',
      before: current,
      after: next,
    });
    this.refreshPatient(next.patientId);
    return next;
  }

  reviewDevice(
    id: string,
    payload: {
      outcome?: string;
      indication?: string;
      reviewedBy?: string;
      notes?: string;
    } = {},
  ): PatientDevice {
    const current = this.getDeviceOrThrow(id);
    if (current.status === 'REMOVED') {
      throw new ConflictException('Removed devices cannot be reviewed.');
    }

    const reviewedAt = new Date().toISOString();
    const outcome = payload.outcome ?? 'Retained — indication still present';
    const reviewer = payload.reviewedBy ?? 'Dr. Sarah Chen, MD';
    const updatedEvents = [...(current.events ?? [])];

    // If indication changed during review, record that event
    if (payload.indication && payload.indication !== current.indication) {
      updatedEvents.push({
        id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        deviceId: id,
        timestamp: reviewedAt,
        type: 'INDICATION_UPDATED',
        title: 'Indication updated',
        description: `Indication updated to: ${payload.indication}`,
        performedBy: reviewer,
      });
    }

    // Record review event
    updatedEvents.push({
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      deviceId: id,
      timestamp: reviewedAt,
      type: 'REVIEWED',
      title: 'Device reviewed',
      description: `Outcome: ${outcome}${payload.notes ? ` (${payload.notes})` : ''}`,
      performedBy: reviewer,
    });

    const next: PatientDevice = {
      ...current,
      indication: payload.indication ?? current.indication,
      indicationResolvedAt: undefined,
      lastReviewedAt: reviewedAt,
      lastReviewOutcome: outcome,
      lastReviewedBy: reviewer,
      status: 'ACTIVE',
      reviewReason: undefined,
      events: updatedEvents,
    };
    this.store.saveDevice(next);
    this.store.addAudit({
      patientId: next.patientId,
      action: 'DEVICE_REVIEWED',
      before: current,
      after: next,
    });
    this.refreshPatient(next.patientId);

    const remainingReviewDue = this.store
      .listDevices(next.patientId)
      .filter((device) => device.status === 'REVIEW_DUE');
    if (remainingReviewDue.length === 0) {
      this.resolvePatientFlags(
        next.patientId,
        'CLINICAL_REVIEW_COMPLETE',
        'Device reviewed and cleared.',
      );
    }
    return next;
  }

  removeDevice(
    id: string,
    payload: {
      removalReason?: string;
      removedAt?: string;
      removedBy?: string;
      notes?: string;
    } = {},
  ): PatientDevice {
    const current = this.getDeviceOrThrow(id);
    if (current.status === 'REMOVED') return current;

    const removedAt = payload.removedAt ?? new Date().toISOString();
    const reason = payload.removalReason ?? 'No longer clinically required';
    const remover = payload.removedBy ?? 'Dr. Sarah Chen, MD';
    const updatedEvents = [...(current.events ?? [])];

    updatedEvents.push({
      id: `EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      deviceId: id,
      timestamp: removedAt,
      type: 'REMOVED',
      title: 'Device removed',
      description: `Reason: ${reason}${payload.notes ? ` (${payload.notes})` : ''}`,
      performedBy: remover,
    });

    const next: PatientDevice = {
      ...current,
      status: 'REMOVED',
      removedAt,
      removalReason: reason,
      removedBy: remover,
      reviewReason: `Device removed: ${reason}`,
      events: updatedEvents,
    };
    this.store.saveDevice(next);
    this.store.addAudit({
      patientId: next.patientId,
      action: 'DEVICE_REMOVED',
      before: current,
      after: next,
    });
    this.resolvePatientFlags(next.patientId, 'DEVICE_REMOVED', 'Device removed.');
    return next;
  }

  createConnection(payload: Partial<DeviceConnection>): DeviceConnection {
    if (!payload.deviceId || !this.store.getDevice(payload.deviceId)) {
      throw new NotFoundException('Valid deviceId is required.');
    }
    if (!payload.type) throw new BadRequestException('Connection type is required.');
    const connection: DeviceConnection = {
      id: payload.id ?? `CON-${Math.floor(Math.random() * 9000 + 1000)}`,
      deviceId: payload.deviceId,
      type: payload.type,
      referenceId: payload.referenceId,
      startedAt: payload.startedAt ?? new Date().toISOString(),
      endedAt: payload.endedAt,
    };
    this.store.saveConnection(connection);
    const device = this.getDeviceOrThrow(connection.deviceId);
    this.store.addAudit({
      patientId: device.patientId,
      action: 'CONNECTION_ADDED',
      after: connection,
    });
    this.refreshPatient(device.patientId);
    return connection;
  }

  endConnection(
    id: string,
    payload?: { endedAt?: string },
  ): DeviceConnection {
    const current = this.store.getConnection(id);
    if (!current) {
      throw new NotFoundException(`Connection ${id} not found.`);
    }
    if (current.endedAt) return current;

    const endedAt = payload?.endedAt ?? new Date().toISOString();
    const updated: DeviceConnection = { ...current, endedAt };
    this.store.saveConnection(updated);

    const device = this.getDeviceOrThrow(updated.deviceId);
    this.store.addAudit({
      patientId: device.patientId,
      action: 'CONNECTION_ENDED',
      before: current,
      after: updated,
    });

    this.refreshPatient(device.patientId);
    return updated;
  }

  recordVitals(payload: Partial<VitalsReading>): PatientCombinedView {
    validateVitals(payload);
    const patientId = payload.patientId;
    if (!patientId || !this.store.getPatient(patientId)) {
      throw new NotFoundException('Valid patientId is required.');
    }

    const reading: VitalsReading = {
      id: payload.id ?? `VIT-${Math.floor(Math.random() * 9000 + 1000)}`,
      patientId,
      takenAt: payload.takenAt ?? new Date().toISOString(),
      respiratoryRate: payload.respiratoryRate,
      spo2: payload.spo2,
      spo2Scale: payload.spo2Scale ?? 1,
      temperature: payload.temperature,
      systolicBP: payload.systolicBP,
      heartRate: payload.heartRate,
      consciousness: payload.consciousness ?? 'ALERT',
      supplementalOxygen: payload.supplementalOxygen ?? false,
    } as VitalsReading;

    this.store.addVital(reading);
    const score = calculateNews2(reading, this.store.listScores(patientId));
    this.store.addScore(score);
    this.store.addAudit({
      patientId,
      action: 'VITAL_RECORDED',
      after: { reading, score },
    });
    this.refreshPatient(patientId);

    if (score.trend !== 'RISING' || score.totalScore <= 2) {
      this.resolvePatientFlags(
        patientId,
        'CLINICAL_REVIEW_COMPLETE',
        `Physiological trend normalized (NEWS2 ${score.totalScore}, trend ${score.trend}).`,
      );
    }

    return this.getPatientCombinedView(patientId);
  }

  listFlags(patientId?: string): CorrelationFlag[] {
    return this.store.listFlags(patientId);
  }

  acknowledgeFlag(id: string): CorrelationFlag {
    const current = this.getFlagOrThrow(id);
    if (current.status === 'RESOLVED') {
      throw new ConflictException('Resolved flags cannot be acknowledged.');
    }
    if (current.status === 'ACKNOWLEDGED') {
      throw new ConflictException('Flag is already acknowledged.');
    }
    const next: CorrelationFlag = {
      ...current,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date().toISOString(),
    };
    this.store.saveFlag(next);
    this.store.addAudit({
      patientId: next.patientId,
      action: 'FLAG_ACKNOWLEDGED',
      before: current,
      after: next,
    });
    return next;
  }

  resolveFlag(
    id: string,
    payload: { resolution?: FlagResolution; note?: string } = {},
  ): CorrelationFlag {
    const current = this.getFlagOrThrow(id);
    if (current.status === 'RESOLVED') {
      throw new ConflictException('Flag is already resolved.');
    }
    const latestScore = this.store.listScores(current.patientId).at(-1);
    const next: CorrelationFlag = {
      ...current,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolvedReadingId: latestScore?.readingId,
      resolution: payload.resolution ?? 'CLINICAL_REVIEW_COMPLETE',
      resolutionNote: payload.note,
    };
    this.store.saveFlag(next);
    this.store.addAudit({
      patientId: next.patientId,
      action: 'FLAG_RESOLVED',
      before: current,
      after: next,
    });
    return next;
  }

  refreshAllPatients(): void {
    this.store.listPatients().forEach((patient) => this.refreshPatient(patient.id));
  }

  private refreshPatient(patientId: string): void {
    const devices = this.store.listDevices(patientId);
    devices.forEach((device) => {
      const evaluated = evaluateDevice(device, this.store.listConnections(device.id));
      const next = {
        ...device,
        status: evaluated.status,
        reviewReason: evaluated.reason,
      };
      this.store.saveDevice(next);
    });

    const scores = this.store.listScores(patientId);
    const latest = scores.at(-1);
    const reviewDue = this.store
      .listDevices(patientId)
      .filter((device) => device.status === 'REVIEW_DUE');
    const existingOpen = this.store
      .listFlags(patientId)
      .some((flag) => flag.status !== 'RESOLVED');

    const hasConvergence = Boolean(latest && latest.trend === 'RISING' && reviewDue.length > 0);

    if (existingOpen && !hasConvergence) {
      const resolutionReason =
        latest && latest.trend !== 'RISING'
          ? `Physiological trend normalized (NEWS2 ${latest.totalScore}, trend ${latest.trend}).`
          : 'Underlying device reviewed or removed.';
      const resolutionType: FlagResolution =
        latest && latest.trend !== 'RISING'
          ? 'CLINICAL_REVIEW_COMPLETE'
          : 'DEVICE_RETAINED';
      this.resolvePatientFlags(patientId, resolutionType, resolutionReason);
    }

    const resolvedFlags = this.store
      .listFlags(patientId)
      .filter((flag) => flag.status === 'RESOLVED');
    const isAlreadyResolvedForCurrentState = resolvedFlags.some(
      (f) =>
        (f.resolvedReadingId && f.resolvedReadingId === latest?.readingId) ||
        (f.resolvedAt && latest && new Date(f.resolvedAt).getTime() >= new Date(latest.createdAt).getTime()),
    );

    const flag = buildCorrelationFlag(patientId, latest, scores, reviewDue);
    const updatedExistingOpen = this.store
      .listFlags(patientId)
      .some((flag) => flag.status !== 'RESOLVED');

    if (flag && !updatedExistingOpen && !isAlreadyResolvedForCurrentState) {
      this.store.saveFlag(flag);
      this.store.addAudit({
        patientId,
        action: 'FLAG_CREATED',
        after: flag,
      });
    }
  }

  private resolvePatientFlags(
    patientId: string,
    resolution: FlagResolution,
    note: string,
  ): void {
    this.store
      .listFlags(patientId)
      .filter((flag) => flag.status !== 'RESOLVED')
      .forEach((flag) => this.resolveFlag(flag.id, { resolution, note }));
  }

  private getDeviceOrThrow(id: string): PatientDevice {
    const device = this.store.getDevice(id);
    if (!device) throw new NotFoundException(`Device ${id} not found.`);
    return device;
  }

  private getFlagOrThrow(id: string): CorrelationFlag {
    const flag = this.store.getFlag(id);
    if (!flag) throw new NotFoundException(`Flag ${id} not found.`);
    return flag;
  }
}

function validateVitals(payload: Partial<VitalsReading>): void {
  const required: Array<keyof VitalsReading> = [
    'respiratoryRate',
    'spo2',
    'temperature',
    'systolicBP',
    'heartRate',
  ];
  const missing = required.filter((key) => payload[key] == null || Number.isNaN(Number(payload[key])));
  if (missing.length) {
    throw new BadRequestException(`Missing required vital fields: ${missing.join(', ')}.`);
  }
  if ((payload.respiratoryRate ?? 0) <= 0) {
    throw new BadRequestException('Respiratory rate: value must be a valid positive clinical measurement (breaths/min).');
  }
  if ((payload.spo2 ?? 0) < 0 || (payload.spo2 ?? 0) > 100) {
    throw new BadRequestException('SpO₂: value must be between 0 and 100%.');
  }
  if ((payload.temperature ?? 0) < 25 || (payload.temperature ?? 0) > 45) {
    throw new BadRequestException('Temperature: value is outside the accepted clinical range (25.0–45.0 °C).');
  }
  if ((payload.systolicBP ?? 0) <= 0) {
    throw new BadRequestException('Systolic BP: value must be a valid positive measurement (mmHg).');
  }
  if ((payload.heartRate ?? 0) <= 0) {
    throw new BadRequestException('Heart rate: value must be a valid positive measurement (bpm).');
  }
}
