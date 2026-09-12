import { describe, expect, it } from 'vitest';
import {
  filterMedications,
  summarizeMedications,
  type Medication,
} from './lib/medication-utils';

const meds: Medication[] = [
  {
    id: 'med-1',
    name: 'Morphine',
    dose: '5 mg',
    status: 'active',
    route: 'IV',
    scheduled: '09:00',
    allergies: ['Penicillin'],
    risk: 'high',
  },
  {
    id: 'med-2',
    name: 'Fentanyl',
    dose: '100 mcg',
    status: 'review',
    route: 'IV',
    scheduled: '11:00',
    allergies: [],
    risk: 'moderate',
  },
  {
    id: 'med-3',
    name: 'Heparin',
    dose: '5000 units',
    status: 'flagged',
    route: 'SubQ',
    scheduled: '18:00',
    allergies: ['Sulfa'],
    risk: 'high',
  },
];

describe('medication utilities', () => {
  it('filters medications by search and status', () => {
    expect(filterMedications(meds, '', 'all')).toHaveLength(3);
    expect(filterMedications(meds, 'fent', 'all')).toHaveLength(1);
    expect(filterMedications(meds, '', 'flagged')).toHaveLength(1);
    expect(filterMedications(meds, 'morph', 'active')).toHaveLength(1);
  });

  it('summarizes medication safety counts', () => {
    expect(summarizeMedications(meds)).toEqual({
      active: 1,
      review: 1,
      flagged: 1,
      highRisk: 2,
      total: 3,
    });
  });
});
