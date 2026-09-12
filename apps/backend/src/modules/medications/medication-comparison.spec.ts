import { describe, expect, it } from 'vitest';
import { compareMedicationSources } from './medication-comparison';
import type { Medication } from './medications.types';

function medication(overrides: Partial<Medication>): Medication {
  return {
    id: 'med-1',
    patientId: 'patient-001',
    name: 'Metformin',
    genericName: 'metformin',
    strength: '500 mg',
    dose: '500',
    unit: 'mg',
    route: 'oral',
    frequency: 'once daily',
    scheduled: '09:00',
    source: 'home',
    status: 'active',
    risk: 'low',
    allergies: [],
    createdAt: '2026-09-10T00:00:00.000Z',
    updatedAt: '2026-09-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('compareMedicationSources', () => {
  it('detects a dose mismatch for the same medication', () => {
    const result = compareMedicationSources(
      [
        medication({ id: 'home-1', source: 'home', dose: '500' }),
        medication({ id: 'hospital-1', source: 'hospital', dose: '1000' }),
      ],
      'home',
      'hospital',
    );

    expect(result).toEqual([
      expect.objectContaining({ type: 'dose-mismatch', severity: 'moderate' }),
    ]);
  });

  it('detects medications missing from the current list', () => {
    const result = compareMedicationSources(
      [medication({ id: 'home-1', source: 'home' })],
      'home',
      'hospital',
    );

    expect(result).toEqual([
      expect.objectContaining({
        type: 'missing-from-current',
        severity: 'high',
      }),
    ]);
  });
});
