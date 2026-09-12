import { Injectable } from '@nestjs/common';
import {
  type Allergy,
  type Medication,
  type MedicationInteraction,
  type MedicationSafetyAlert,
  type MedicationSafety,
} from '../medications.types';
import {
  resolveMedicationConcept,
  type MedicationConcept,
  normalizeMedicationName,
} from './medication-catalog';
import {
  DUPLICATE_THERAPY_RULES,
  INTERACTION_RULES,
  type InteractionRule,
} from './safety-rules';

export const MEDICATION_RULE_VERSION = 'prototype-1.0.0';

@Injectable()
export class MedicationRulesEngine {
  evaluate(medications: Medication[], allergies: Allergy[]): MedicationSafety {
    const resolved = medications.map((medication) => ({
      medication,
      concept: resolveMedicationConcept(medication),
    }));
    const activeAllergies = allergies.filter(
      (allergy) => allergy.status === 'active',
    );
    const alerts = [
      ...this.evaluateAllergies(resolved, activeAllergies),
      ...this.evaluateInteractions(resolved, INTERACTION_RULES, 'interaction'),
      ...this.evaluateInteractions(
        resolved,
        DUPLICATE_THERAPY_RULES,
        'duplicate-therapy',
      ),
    ];

    return {
      allergies,
      interactions: alerts
        .filter((alert) => alert.type !== 'allergy')
        .map((alert) => this.toInteraction(alert)),
      alerts,
      source: 'Internal medication rules',
      ruleVersion: MEDICATION_RULE_VERSION,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateAllergies(
    resolved: Array<{ medication: Medication; concept?: MedicationConcept }>,
    allergies: Allergy[],
  ): MedicationSafetyAlert[] {
    const alerts: MedicationSafetyAlert[] = [];
    for (const { medication, concept } of resolved) {
      if (!concept) continue;
      for (const allergy of allergies) {
        const matches = concept.ingredients.some(
          (ingredient) =>
            normalizeMedicationName(ingredient) ===
            normalizeMedicationName(allergy.substance),
        );
        if (!matches) continue;
        alerts.push({
          id: `allergy-${medication.id}-${allergy.id}`,
          type: 'allergy',
          severity:
            allergy.severity === 'unknown' ? 'moderate' : allergy.severity,
          medicationIds: [medication.id],
          medicationNames: [medication.name],
          description: `${medication.name} contains or matches ${allergy.substance}; reported reaction: ${allergy.reaction}.`,
          recommendation:
            'Stop and review the medication before administration.',
          source: 'Internal medication rules',
          ruleVersion: MEDICATION_RULE_VERSION,
        });
      }
    }
    return alerts;
  }

  private evaluateInteractions(
    resolved: Array<{ medication: Medication; concept?: MedicationConcept }>,
    rules: InteractionRule[],
    type: 'interaction' | 'duplicate-therapy',
  ): MedicationSafetyAlert[] {
    const alerts: MedicationSafetyAlert[] = [];
    for (let firstIndex = 0; firstIndex < resolved.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < resolved.length;
        secondIndex += 1
      ) {
        const first = resolved[firstIndex];
        const second = resolved[secondIndex];
        if (!first.concept || !second.concept) continue;
        const rule = rules.find((candidate) =>
          this.matchesPair(
            candidate.classPair,
            first.concept!,
            second.concept!,
          ),
        );
        if (!rule) continue;
        alerts.push({
          id: `${rule.id}-${first.medication.id}-${second.medication.id}`,
          type,
          severity: rule.severity,
          medicationIds: [first.medication.id, second.medication.id],
          medicationNames: [first.medication.name, second.medication.name],
          description: rule.description,
          recommendation: rule.recommendation,
          source: 'Internal medication rules',
          ruleVersion: MEDICATION_RULE_VERSION,
        });
      }
    }
    return alerts;
  }

  private matchesPair(
    pair: [string, string],
    first: MedicationConcept,
    second: MedicationConcept,
  ): boolean {
    return (
      (first.therapeuticClass === pair[0] &&
        second.therapeuticClass === pair[1]) ||
      (first.therapeuticClass === pair[1] &&
        second.therapeuticClass === pair[0])
    );
  }

  private toInteraction(alert: MedicationSafetyAlert): MedicationInteraction {
    return {
      id: alert.id,
      patientId: '',
      medications: alert.medicationNames,
      severity: alert.severity,
      description: alert.description,
      recommendation: alert.recommendation,
      source: alert.source,
      ruleId: alert.id.split('-')[0],
    };
  }
}
