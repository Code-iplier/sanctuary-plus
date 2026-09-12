import type { SafetySeverity } from '../medications.types';

export type InteractionRule = {
  id: string;
  classPair: [string, string];
  severity: SafetySeverity;
  description: string;
  recommendation: string;
};

export const INTERACTION_RULES: InteractionRule[] = [
  {
    id: 'opioid-opioid',
    classPair: ['opioid', 'opioid'],
    severity: 'high',
    description:
      'Concurrent opioid therapy may increase respiratory depression risk.',
    recommendation: 'Review indication, dose, timing, and monitoring plan.',
  },
  {
    id: 'anticoagulant-antiplatelet',
    classPair: ['anticoagulant', 'antiplatelet'],
    severity: 'moderate',
    description: 'Concurrent therapy may increase bleeding risk.',
    recommendation: 'Review indication, timing, and bleeding precautions.',
  },
];

export const DUPLICATE_THERAPY_RULES: InteractionRule[] = [
  {
    id: 'duplicate-insulin',
    classPair: ['insulin', 'insulin'],
    severity: 'high',
    description:
      'Multiple insulin therapies may cause unintended duplicate treatment.',
    recommendation: 'Confirm the intended basal and prandial insulin regimen.',
  },
];
