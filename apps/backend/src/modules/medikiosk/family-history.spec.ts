import { describe, expect, it } from 'vitest';
import { buildFamilyHistorySummary } from './family-history';

describe('family member health summary', () => {
  it('combines verified visits and reports without exposing triage', () => {
    const summary = buildFamilyHistorySummary({
      patientId: 'family-member-1',
      sessions: [
        {
          id: 'session-1',
          clinicalState: {},
          facts: [],
          report: {
            status: 'PATIENT_VERIFIED',
            updatedAt: new Date('2026-09-15T10:00:00Z'),
            report: {
              symptoms: ['Fever'],
              history: { medical: ['Hypertension'], family: [], lifestyle: [] },
              clinicianTriage: { priority: 'URGENT', possibleDiagnoses: ['Hidden from patient family view'] },
            },
          },
        },
        {
          id: 'session-2',
          clinicalState: {},
          facts: [],
          report: {
            status: 'CLINICIAN_CONFIRMED',
            updatedAt: new Date('2026-08-15T10:00:00Z'),
            report: { history: { medical: ['Type 2 diabetes'], family: [], lifestyle: [] } },
          },
        },
      ],
      documents: [{ id: 'document-1', title: 'Blood test', documentType: 'LAB_REPORT', originalFilename: 'blood-test.pdf', extractedData: { impression: 'Kidney disease' }, status: 'CLINICIAN_VERIFIED' }],
    });

    expect(summary.importantProblems.map((problem) => problem.name)).toEqual(expect.arrayContaining(['Fever', 'Hypertension', 'Diabetes', 'Kidney disease']));
    expect(summary.importantProblems.some((problem) => problem.name === 'Hidden from patient family view')).toBe(false);
  });
});

