import { describe, expect, it } from 'vitest';
import { assessMediKioskReport } from './medikiosk.triage';

describe('MediKiosk clinician triage support', () => {
  it('ranks chest/breathing red flags above an acute-abdomen pattern', () => {
    const chest = assessMediKioskReport({ symptoms: ['Chest pressure and severe shortness of breath'] });
    const abdomen = assessMediKioskReport({ symptoms: ['Right lower abdominal pain, fever, vomiting, worsening'] });

    expect(chest.priority).toBe('URGENT');
    expect(abdomen.priority).toBe('URGENT');
    expect(chest.score).toBeGreaterThan(abdomen.score);
  });

  it('keeps routine follow-up as follow-up without inventing a condition', () => {
    const result = assessMediKioskReport({ symptoms: ['Routine follow-up and medication review'] });

    expect(result.priority).toBe('FOLLOW_UP');
    expect(result.possibleConditions).toEqual(['No high-risk condition pattern identified by automated screen']);
    expect(result.disclaimer).toContain('not a diagnosis');
  });

  it('does not elevate a symptom that is explicitly denied', () => {
    const result = assessMediKioskReport({
      symptoms: ['No chest pain, no breathing difficulty, and no fainting reported'],
    });

    expect(result.priority).toBe('NORMAL');
    expect(result.redFlags).toEqual([]);
  });

  it('still detects a positive symptom after a separate negated symptom', () => {
    const result = assessMediKioskReport({
      symptoms: ['No chest pain but severe shortness of breath'],
    });

    expect(result.priority).toBe('URGENT');
    expect(result.redFlags).toContain('Chest or breathing red flag');
  });
});
