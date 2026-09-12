import type { Medication } from '../lib/medication-utils';

export const medicationSeed: Medication[] = [
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
  {
    id: 'med-4',
    name: 'Insulin',
    dose: '10 units',
    status: 'active',
    route: 'SubQ',
    scheduled: '08:00',
    allergies: [],
    risk: 'low',
  },
];

export const allergySeed = ['Penicillin', 'Sulfa', 'Latex'];

export const interactionSeed = [
  {
    title: 'Morphine + Fentanyl',
    detail: 'Additive respiratory depression risk',
    severity: 'high',
  },
  {
    title: 'Heparin + Aspirin',
    detail: 'Bleeding risk elevated, review timing',
    severity: 'moderate',
  },
  {
    title: 'Insulin + Metformin',
    detail: 'No clinically significant interaction detected',
    severity: 'low',
  },
];
