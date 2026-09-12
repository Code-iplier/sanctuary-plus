import { BadRequestException, Injectable } from '@nestjs/common';
import {
  type Allergy,
  type CreateMedicationInput,
  type CreateAllergyInput,
  type Medication,
  type MedicationAuditEvent,
  type MedicationSafety,
  type MedicationVerificationStatus,
  type ReconcileMedicationInput,
  type ReconciliationRecord,
} from './medications.types';
import { MedicationsRepository } from './medications.repository';
import { MedicationRulesEngine } from './rules/medication-rules.engine';
import { compareMedicationSources } from './medication-comparison';

@Injectable()
export class MedicationsService {
  constructor(
    private readonly repository: MedicationsRepository,
    private readonly rulesEngine: MedicationRulesEngine,
  ) {}

  async list(patientId: string): Promise<Medication[]> {
    return this.repository.list(patientId);
  }

  async listPatients() {
    return this.repository.listPatients();
  }

  async listAllergies(patientId: string): Promise<Allergy[]> {
    return this.repository.listAllergies(patientId);
  }

  async createAllergy(
    patientId: string,
    input: CreateAllergyInput,
  ): Promise<Allergy> {
    this.assertRequired(input, ['substance', 'reaction']);
    return this.repository.createAllergy(patientId, input);
  }

  async listInteractions(patientId: string) {
    return (await this.getSafety(patientId)).interactions;
  }

  async getSafety(patientId: string): Promise<MedicationSafety> {
    const medications = await this.repository.list(patientId);
    const allergies = await this.repository.listAllergies(patientId);
    const safety = this.rulesEngine.evaluate(medications, allergies);
    return {
      ...safety,
      interactions: safety.interactions.map((interaction) => ({
        ...interaction,
        patientId,
      })),
    };
  }

  async listHistory(patientId: string): Promise<ReconciliationRecord[]> {
    return this.repository.listHistory(patientId);
  }

  async verify(
    medicationId: string,
    verificationStatus: MedicationVerificationStatus,
    changedBy: string,
    reason: string,
  ): Promise<Medication> {
    this.assertRequired({ changedBy, reason }, ['changedBy', 'reason']);
    return this.repository.verify(
      medicationId,
      verificationStatus,
      changedBy,
      reason,
    );
  }

  async listAuditEvents(patientId: string): Promise<MedicationAuditEvent[]> {
    return this.repository.listAuditEvents(patientId);
  }

  async compareSources(
    patientId: string,
    source: CreateMedicationInput['source'],
    current: CreateMedicationInput['source'],
  ) {
    return compareMedicationSources(
      await this.repository.list(patientId),
      source,
      current,
    );
  }

  async create(
    patientId: string,
    input: CreateMedicationInput,
  ): Promise<Medication> {
    this.assertRequired(input, [
      'name',
      'strength',
      'dose',
      'unit',
      'route',
      'frequency',
      'scheduled',
      'source',
    ]);
    return this.repository.create(patientId, input);
  }

  async reconcile(
    medicationId: string,
    input: ReconcileMedicationInput,
  ): Promise<ReconciliationRecord> {
    this.assertRequired(input, ['decision', 'reason', 'changedBy']);
    return this.repository.reconcile(medicationId, input);
  }

  private assertRequired(input: object, fields: string[]): void {
    const record = input as Record<string, unknown>;
    const missing = fields.filter(
      (field) => typeof record[field] !== 'string' || !record[field]?.trim(),
    );
    if (missing.length > 0)
      throw new BadRequestException(
        `Missing required fields: ${missing.join(', ')}`,
      );
  }
}
