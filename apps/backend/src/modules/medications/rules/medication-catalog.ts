import type { Medication } from '../medications.types';

export type MedicationConcept = {
  id: string;
  aliases: string[];
  ingredients: string[];
  therapeuticClass: string;
};

export const MEDICATION_CATALOG: MedicationConcept[] = [
  {
    id: 'morphine',
    aliases: ['morphine', 'morphine sulfate'],
    ingredients: ['morphine'],
    therapeuticClass: 'opioid',
  },
  {
    id: 'fentanyl',
    aliases: ['fentanyl', 'fentanyl citrate'],
    ingredients: ['fentanyl'],
    therapeuticClass: 'opioid',
  },
  {
    id: 'heparin',
    aliases: ['heparin', 'unfractionated heparin'],
    ingredients: ['heparin'],
    therapeuticClass: 'anticoagulant',
  },
  {
    id: 'aspirin',
    aliases: ['aspirin', 'acetylsalicylic acid'],
    ingredients: ['aspirin'],
    therapeuticClass: 'antiplatelet',
  },
  {
    id: 'insulin',
    aliases: ['insulin', 'insulin glargine', 'insulin detemir'],
    ingredients: ['insulin'],
    therapeuticClass: 'insulin',
  },
  {
    id: 'amoxicillin',
    aliases: ['amoxicillin'],
    ingredients: ['amoxicillin', 'penicillin'],
    therapeuticClass: 'penicillin antibiotic',
  },
];

export function normalizeMedicationName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveMedicationConcept(
  medication: Medication,
): MedicationConcept | undefined {
  const values = [medication.name, medication.genericName].map(
    normalizeMedicationName,
  );
  return MEDICATION_CATALOG.find((concept) =>
    concept.aliases.some((alias) =>
      values.includes(normalizeMedicationName(alias)),
    ),
  );
}
