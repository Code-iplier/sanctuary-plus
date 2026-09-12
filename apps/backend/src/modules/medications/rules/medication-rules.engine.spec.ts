import { describe, expect, it } from 'vitest';
import { MedicationRulesEngine } from './medication-rules.engine';
import type { Allergy, Medication } from '../medications.types';

function medication(id: string, name: string, genericName = name): Medication {
  return {
    id,
    patientId: 'patient-001',
    name,
    genericName,
    strength: '1',
    dose: '1',
    unit: 'unit',
    route: 'oral',
    frequency: 'once daily',
    scheduled: '09:00',
    source: 'hospital',
    status: 'active',
    risk: 'low',
    allergies: [],
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
  };
}

const penicillinAllergy: Allergy = {
  id: 'allergy-1',
  patientId: 'patient-001',
  substance: 'Penicillin',
  reaction: 'Anaphylaxis',
  severity: 'critical',
  status: 'active',
};

describe('MedicationRulesEngine', () => {
  const engine = new MedicationRulesEngine();

  it('detects an allergy by ingredient', () => {
    const result = engine.evaluate(
      [medication('med-1', 'Amoxicillin')],
      [penicillinAllergy],
    );

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: 'allergy',
        severity: 'critical',
        medicationIds: ['med-1'],
      }),
    ]);
  });

  it('detects concurrent opioid therapy', () => {
    const result = engine.evaluate(
      [medication('med-1', 'Morphine'), medication('med-2', 'Fentanyl')],
      [],
    );

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: 'interaction',
        severity: 'high',
        medicationNames: ['Morphine', 'Fentanyl'],
      }),
    ]);
  });

  it('detects duplicate insulin therapy', () => {
    const result = engine.evaluate(
      [
        medication('med-1', 'Insulin glargine'),
        medication('med-2', 'Insulin detemir'),
      ],
      [],
    );

    expect(result.alerts).toEqual([
      expect.objectContaining({
        type: 'duplicate-therapy',
        severity: 'high',
      }),
    ]);
  });

  it('returns no alert for a safe medication combination', () => {
    const result = engine.evaluate([medication('med-1', 'Insulin')], []);

    expect(result.alerts).toHaveLength(0);
    expect(result.source).toBe('Internal medication rules');
    expect(result.ruleVersion).toBe('prototype-1.0.0');
  });
});
