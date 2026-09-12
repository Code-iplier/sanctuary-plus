import type {
  Medication,
  MedicationSource,
  SafetySeverity,
} from './medications.types';

export type MedicationDiscrepancyType =
  | 'missing-from-current'
  | 'unexpected-current'
  | 'dose-mismatch'
  | 'route-mismatch'
  | 'frequency-mismatch';

export type MedicationDiscrepancy = {
  id: string;
  type: MedicationDiscrepancyType;
  severity: SafetySeverity;
  medicationIds: string[];
  medicationNames: string[];
  description: string;
  sourceMedication?: Medication;
  currentMedication?: Medication;
};

export function compareMedicationSources(
  medications: Medication[],
  source: MedicationSource,
  current: MedicationSource,
): MedicationDiscrepancy[] {
  const sourceMeds = medications.filter(
    (medication) => medication.source === source,
  );
  const currentMeds = medications.filter(
    (medication) => medication.source === current,
  );
  const discrepancies: MedicationDiscrepancy[] = [];
  const matchedCurrentIds = new Set<string>();

  for (const sourceMedication of sourceMeds) {
    const currentMedication = currentMeds.find(
      (candidate) =>
        candidate.genericName.toLowerCase() ===
          sourceMedication.genericName.toLowerCase() ||
        candidate.name.toLowerCase() === sourceMedication.name.toLowerCase(),
    );

    if (!currentMedication) {
      discrepancies.push({
        id: `missing-${sourceMedication.id}`,
        type: 'missing-from-current',
        severity: 'high',
        medicationIds: [sourceMedication.id],
        medicationNames: [sourceMedication.name],
        description: `${sourceMedication.name} is present in the ${source} list but not in the ${current} list.`,
        sourceMedication,
      });
      continue;
    }

    matchedCurrentIds.add(currentMedication.id);
    const comparisons: Array<{
      type: MedicationDiscrepancyType;
      sourceValue: string;
      currentValue: string;
      label: string;
    }> = [
      {
        type: 'dose-mismatch',
        sourceValue: `${sourceMedication.dose} ${sourceMedication.unit}`,
        currentValue: `${currentMedication.dose} ${currentMedication.unit}`,
        label: 'dose',
      },
      {
        type: 'route-mismatch',
        sourceValue: sourceMedication.route,
        currentValue: currentMedication.route,
        label: 'route',
      },
      {
        type: 'frequency-mismatch',
        sourceValue: sourceMedication.frequency,
        currentValue: currentMedication.frequency,
        label: 'frequency',
      },
    ];

    for (const comparison of comparisons) {
      if (
        comparison.sourceValue.toLowerCase() ===
        comparison.currentValue.toLowerCase()
      )
        continue;
      discrepancies.push({
        id: `${comparison.type}-${sourceMedication.id}-${currentMedication.id}`,
        type: comparison.type,
        severity: 'moderate',
        medicationIds: [sourceMedication.id, currentMedication.id],
        medicationNames: [sourceMedication.name],
        description: `${sourceMedication.name} has a ${comparison.label} difference: ${source} uses ${comparison.sourceValue}; ${current} uses ${comparison.currentValue}.`,
        sourceMedication,
        currentMedication,
      });
    }
  }

  for (const currentMedication of currentMeds) {
    if (matchedCurrentIds.has(currentMedication.id)) continue;
    discrepancies.push({
      id: `unexpected-${currentMedication.id}`,
      type: 'unexpected-current',
      severity: 'moderate',
      medicationIds: [currentMedication.id],
      medicationNames: [currentMedication.name],
      description: `${currentMedication.name} is present in the ${current} list but not in the ${source} list.`,
      currentMedication,
    });
  }

  return discrepancies;
}
