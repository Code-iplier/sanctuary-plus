import type { DepartmentExtension } from './medikiosk.extensions';

export type ClinicianTriage = {
  mode: 'SHADOW' | 'ACTIVE';
  priority: 'URGENT' | 'NORMAL' | 'FOLLOW_UP';
  score: number;
  possibleConditions: string[];
  reason: string;
  redFlags: string[];
  possibleDiagnoses: Array<{ name: string; certainty: string; supportingEvidence: string[] }>;
  departmentExtension?: DepartmentExtension;
  disclaimer: string;
};

export function assessMediKioskReport(report: Record<string, unknown>): ClinicianTriage {
  const text = JSON.stringify(report).toLowerCase();
  const isNegated = (pattern: string): boolean => {
    let start = text.indexOf(pattern);
    while (start >= 0) {
      const prefix = text.slice(Math.max(0, start - 64), start)
        .split(/\b(?:but|however|except|although)\b/)
        .pop() ?? '';
      if (!/(?:\bno\b|\bnot\b|\bwithout\b|\bdenies?\b|\bdenied\b|\bnegative for\b|\bfree of\b|\babsent\b)[^.!?;:]{0,48}$/.test(prefix)) return false;
      start = text.indexOf(pattern, start + pattern.length);
    }
    return true;
  };
  const matches = (patterns: string[]) => patterns.some((pattern) => text.includes(pattern) && !isNegated(pattern));
  const redFlags: string[] = [];
  const possibleConditions: string[] = [];
  let score = 20;

  if (matches(['facial droop', 'one-sided weakness', 'slurred speech', 'sudden confusion', 'cannot speak'])) {
    score = 100;
    redFlags.push('Possible acute neurologic deficit');
    possibleConditions.push('Possible stroke-like presentation');
  }
  if (matches(['chest pain', 'chest pressure', 'crushing chest', 'severe shortness of breath', 'difficulty breathing', 'severe breathing problem', 'breathing problem has become severe', "can't breathe", 'cannot breathe', 'blue lips'])) {
    score = Math.max(score, 99);
    redFlags.push('Chest or breathing red flag');
    possibleConditions.push('Possible acute cardiopulmonary condition');
  }
  if (matches(['severe allergic reaction', 'swelling of the throat', 'throat swelling', 'wheezing after'])) {
    score = Math.max(score, 100);
    redFlags.push('Possible airway or allergic emergency');
    possibleConditions.push('Possible anaphylaxis or airway emergency');
  }
  if (matches(['uncontrolled bleeding', 'vomiting blood', 'blood in vomit', 'black stool', 'fainted', 'loss of consciousness', 'seizure'])) {
    score = Math.max(score, 98);
    redFlags.push('Possible major bleeding or altered consciousness');
    possibleConditions.push('Possible bleeding or neurologic emergency');
  }
  if (matches(['right lower abdominal', 'right lower belly', 'pain moved to the right', 'severe abdominal pain']) && matches(['fever', 'vomit', 'vomiting', 'worsening', 'tender'])) {
    score = Math.max(score, 96);
    redFlags.push('Worsening abdominal pain with systemic symptoms');
    possibleConditions.push('Possible acute appendicitis or acute abdomen');
  }
  if (matches(['severe pain', 'sudden severe', 'rapidly worsening', 'cannot keep fluids down'])) {
    score = Math.max(score, 82);
    redFlags.push('Severe or rapidly worsening symptom');
  }

  const priority = score >= 80 ? 'URGENT' : (matches(['routine follow-up', 'medication review', 'review results', 'ongoing stable']) ? 'FOLLOW_UP' : 'NORMAL');
  return {
    mode: 'SHADOW',
    priority,
    score,
    possibleConditions: possibleConditions.length ? possibleConditions : ['No high-risk condition pattern identified by automated screen'],
    reason: redFlags.length ? redFlags.join('; ') : 'No automated emergency red flag was identified; clinician review remains required.',
    redFlags,
    possibleDiagnoses: [],
    disclaimer: 'Clinician decision support only. This is not a diagnosis and must be confirmed by the treating clinician.',
  };
}
