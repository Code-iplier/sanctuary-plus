import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MedicationRisk as DbMedicationRisk,
  MedicationSource as DbMedicationSource,
  MedicationStatus as DbMedicationStatus,
  MedicationVerificationStatus as DbMedicationVerificationStatus,
  SafetySeverity as DbSafetySeverity,
  Prisma,
  ReconciliationDecision as DbReconciliationDecision,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  Allergy,
  CreateAllergyInput,
  CreateMedicationInput,
  MedicationAuditEvent,
  Medication,
  MedicationRisk,
  MedicationSource,
  MedicationStatus,
  MedicationVerificationStatus,
  ReconcileMedicationInput,
  ReconciliationRecord,
} from './medications.types';

const DEFAULT_PATIENT_ID = 'patient-001';

@Injectable()
export class MedicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(patientId: string): Promise<Medication[]> {
    await this.ensureDemoData(patientId);
    const records = await this.prisma.medication.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => this.toMedication(record));
  }

  async listAllergies(patientId: string): Promise<Allergy[]> {
    await this.ensureDemoData(patientId);
    const records = await this.prisma.allergy.findMany({
      where: { patientId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((record) => ({
      id: record.id,
      patientId: record.patientId,
      substance: record.substance,
      reaction: record.reaction,
      severity: record.severity?.toLowerCase() as Allergy['severity'],
      status: record.status.toLowerCase() as Allergy['status'],
    }));
  }

  async createAllergy(
    patientId: string,
    input: CreateAllergyInput,
  ): Promise<Allergy> {
    await this.ensurePatient(patientId);
    const substance = input.substance.trim();
    const record = await this.prisma.allergy.create({
      data: {
        patientId,
        substance,
        normalizedSubstance: substance.toLowerCase(),
        reaction: input.reaction.trim(),
        severity: input.severity
          ? DbSafetySeverity[
              input.severity.toUpperCase() as keyof typeof DbSafetySeverity
            ]
          : undefined,
        status: 'UNVERIFIED',
      },
    });
    return {
      id: record.id,
      patientId: record.patientId,
      substance: record.substance,
      reaction: record.reaction,
      severity: record.severity?.toLowerCase() as Allergy['severity'],
      status: record.status.toLowerCase() as Allergy['status'],
    };
  }

  async create(
    patientId: string,
    input: CreateMedicationInput,
  ): Promise<Medication> {
    await this.ensurePatient(patientId);
    const record = await this.prisma.$transaction(async (transaction) => {
      const medication = await transaction.medication.create({
        data: {
          patientId,
          name: input.name.trim(),
          dose: input.dose.trim(),
          unit: input.unit.trim(),
          strength: input.strength.trim(),
          route: input.route.trim(),
          frequency: input.frequency.trim(),
          scheduled: input.scheduled.trim(),
          source: this.source(input.source),
          status: DbMedicationStatus.REVIEW,
          risk: this.risk(input.risk ?? 'moderate'),
          verificationStatus:
            input.source === 'home'
              ? DbMedicationVerificationStatus.UNVERIFIED
              : DbMedicationVerificationStatus.VERIFIED,
        },
      });
      await transaction.auditEvent.create({
        data: {
          patientId,
          actorId: 'demo-clinician',
          actorRole: 'clinician',
          action: 'medication.created',
          entityType: 'Medication',
          entityId: medication.id,
          afterJson: medication,
        },
      });
      return medication;
    });
    return this.toMedication(record);
  }

  async reconcile(
    medicationId: string,
    input: ReconcileMedicationInput,
  ): Promise<ReconciliationRecord> {
    const medication = await this.prisma.medication.findUnique({
      where: { id: medicationId },
    });
    if (!medication)
      throw new NotFoundException(`Medication ${medicationId} was not found`);

    const nextStatus = this.statusForDecision(input.decision);
    const changedAt = new Date();
    const record = await this.prisma.$transaction(async (transaction) => {
      await transaction.medication.update({
        where: { id: medicationId },
        data: { status: nextStatus, updatedAt: changedAt },
      });
      const reconciliation = await transaction.reconciliationRecord.create({
        data: {
          medicationId,
          patientId: medication.patientId,
          previousStatus: medication.status,
          decision: this.decision(input.decision),
          reason: input.reason.trim(),
          changedBy: input.changedBy.trim(),
          changedAt,
        },
      });
      await transaction.auditEvent.create({
        data: {
          patientId: medication.patientId,
          actorId: input.changedBy.trim(),
          actorRole: 'clinician',
          action: 'medication.reconciled',
          entityType: 'Medication',
          entityId: medicationId,
          beforeJson: { status: medication.status },
          afterJson: { status: nextStatus, decision: input.decision },
          reason: input.reason.trim(),
        },
      });
      return reconciliation;
    });

    return {
      id: record.id,
      medicationId: record.medicationId,
      patientId: record.patientId,
      previousStatus: record.previousStatus.toLowerCase() as MedicationStatus,
      decision:
        record.decision.toLowerCase() as ReconcileMedicationInput['decision'],
      reason: record.reason,
      changedBy: record.changedBy,
      changedAt: record.changedAt.toISOString(),
    };
  }

  async verify(
    medicationId: string,
    verificationStatus: MedicationVerificationStatus,
    changedBy: string,
    reason: string,
  ): Promise<Medication> {
    const current = await this.prisma.medication.findUnique({
      where: { id: medicationId },
    });
    if (!current)
      throw new NotFoundException(`Medication ${medicationId} was not found`);
    const updated = await this.prisma.$transaction(async (transaction) => {
      const medication = await transaction.medication.update({
        where: { id: medicationId },
        data: {
          verificationStatus:
            DbMedicationVerificationStatus[
              verificationStatus.toUpperCase() as keyof typeof DbMedicationVerificationStatus
            ],
        },
      });
      await transaction.auditEvent.create({
        data: {
          patientId: current.patientId,
          actorId: changedBy.trim(),
          actorRole: 'staff',
          action: `medication.${verificationStatus}`,
          entityType: 'Medication',
          entityId: medicationId,
          beforeJson: { verificationStatus: current.verificationStatus },
          afterJson: { verificationStatus: medication.verificationStatus },
          reason: reason.trim(),
        },
      });
      return medication;
    });
    return this.toMedication(updated);
  }

  async listHistory(patientId: string): Promise<ReconciliationRecord[]> {
    const records = await this.prisma.reconciliationRecord.findMany({
      where: { patientId },
      orderBy: { changedAt: 'desc' },
    });
    return records.map((record) => ({
      id: record.id,
      medicationId: record.medicationId,
      patientId: record.patientId,
      previousStatus: record.previousStatus.toLowerCase() as MedicationStatus,
      decision:
        record.decision.toLowerCase() as ReconcileMedicationInput['decision'],
      reason: record.reason,
      changedBy: record.changedBy,
      changedAt: record.changedAt.toISOString(),
    }));
  }

  async listAuditEvents(patientId: string): Promise<MedicationAuditEvent[]> {
    const records = await this.prisma.auditEvent.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => ({
      id: record.id,
      patientId: record.patientId,
      actorId: record.actorId,
      actorRole: record.actorRole,
      action: record.action,
      entityType: record.entityType,
      entityId: record.entityId,
      reason: record.reason ?? undefined,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  private async ensureDemoData(patientId: string): Promise<void> {
    await this.ensurePatient(patientId);
    if (patientId !== DEFAULT_PATIENT_ID) return;
    const count = await this.prisma.medication.count({ where: { patientId } });
    if (count > 0) return;

    const seeds = [
      [
        'Morphine',
        '5',
        'mg',
        'IV',
        'every 4 hours',
        '09:00',
        DbMedicationSource.HOSPITAL,
        DbMedicationRisk.HIGH,
        DbMedicationStatus.FLAGGED,
      ],
      [
        'Morphine',
        '10',
        'mg',
        'oral',
        'every 6 hours',
        '08:00',
        DbMedicationSource.HOME,
        DbMedicationRisk.HIGH,
        DbMedicationStatus.ACTIVE,
      ],
      [
        'Fentanyl',
        '100',
        'mcg',
        'IV',
        'as needed',
        '11:00',
        DbMedicationSource.HOSPITAL,
        DbMedicationRisk.MODERATE,
        DbMedicationStatus.REVIEW,
      ],
      [
        'Heparin',
        '5000',
        'units',
        'SubQ',
        'every 8 hours',
        '18:00',
        DbMedicationSource.HOSPITAL,
        DbMedicationRisk.HIGH,
        DbMedicationStatus.FLAGGED,
      ],
      [
        'Insulin',
        '10',
        'units',
        'SubQ',
        'before meals',
        '08:00',
        DbMedicationSource.HOSPITAL,
        DbMedicationRisk.LOW,
        DbMedicationStatus.ACTIVE,
      ],
      [
        'Metformin',
        '500',
        'mg',
        'oral',
        'twice daily',
        '08:00',
        DbMedicationSource.HOME,
        DbMedicationRisk.MODERATE,
        DbMedicationStatus.ACTIVE,
      ],
    ] as const;
    await this.prisma.medication.createMany({
      data: seeds.map(
        ([
          name,
          dose,
          unit,
          route,
          frequency,
          scheduled,
          source,
          risk,
          status,
        ]) => ({
          patientId,
          name,
          dose,
          unit,
          strength: `${dose} ${unit}`,
          route,
          frequency,
          scheduled,
          source,
          status,
          risk,
        }),
      ),
    });
    await this.prisma.allergy.createMany({
      data: [
        {
          patientId,
          substance: 'Penicillin',
          normalizedSubstance: 'penicillin',
          reaction: 'Rash',
          severity: 'MODERATE',
        },
        {
          patientId,
          substance: 'Sulfa',
          normalizedSubstance: 'sulfa',
          reaction: 'Anaphylaxis',
          severity: 'CRITICAL',
        },
        {
          patientId,
          substance: 'Latex',
          normalizedSubstance: 'latex',
          reaction: 'Contact dermatitis',
          severity: 'LOW',
        },
      ],
    });
  }

  private async ensurePatient(patientId: string): Promise<void> {
    await this.prisma.patient.upsert({
      where: { id: patientId },
      update: {},
      create: {
        id: patientId,
        displayName:
          patientId === DEFAULT_PATIENT_ID ? 'Demo Patient' : patientId,
      },
    });
  }

  private toMedication(
    record: Prisma.MedicationGetPayload<object>,
  ): Medication {
    return {
      id: record.id,
      patientId: record.patientId,
      name: record.name,
      genericName: record.name.toLowerCase(),
      strength: record.strength,
      dose: record.dose,
      unit: record.unit,
      route: record.route,
      frequency: record.frequency,
      scheduled: record.scheduled,
      source: record.source.toLowerCase() as MedicationSource,
      status: record.status.toLowerCase() as MedicationStatus,
      risk: record.risk.toLowerCase() as MedicationRisk,
      verificationStatus:
        record.verificationStatus.toLowerCase() as MedicationVerificationStatus,
      allergies: [],
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private source(value: MedicationSource): DbMedicationSource {
    return DbMedicationSource[
      value.toUpperCase() as keyof typeof DbMedicationSource
    ];
  }

  private risk(value: MedicationRisk): DbMedicationRisk {
    return DbMedicationRisk[
      value.toUpperCase() as keyof typeof DbMedicationRisk
    ];
  }

  private statusForDecision(
    decision: ReconcileMedicationInput['decision'],
  ): DbMedicationStatus {
    const statuses: Record<
      ReconcileMedicationInput['decision'],
      DbMedicationStatus
    > = {
      continue: DbMedicationStatus.ACTIVE,
      modify: DbMedicationStatus.REVIEW,
      hold: DbMedicationStatus.HELD,
      discontinue: DbMedicationStatus.DISCONTINUED,
      replace: DbMedicationStatus.REVIEW,
      review: DbMedicationStatus.REVIEW,
    };
    return statuses[decision];
  }

  private decision(
    value: ReconcileMedicationInput['decision'],
  ): DbReconciliationDecision {
    return DbReconciliationDecision[
      value.toUpperCase() as keyof typeof DbReconciliationDecision
    ];
  }
}
