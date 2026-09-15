import { describe, expect, it } from 'vitest';
import { coreAnswerComplete, hasOnsetEvidence, isLanguagePreferenceRequest, missingCoreDetail, onsetStateFromPatientText, supplementStateFromPatientText } from './medikiosk.intake';
import { buildHistorySummary } from './history-summary';

describe('MediKiosk fixed-question completion', () => {
  it('recognizes common Indian-language onset wording', () => {
    expect(hasOnsetEvidence('Teen din se bukhar hai')).toBe(true);
    expect(hasOnsetEvidence('कल से दर्द है')).toBe(true);
    expect(hasOnsetEvidence('গতকাল থেকে জ্বর')).toBe(true);
    expect(hasOnsetEvidence('the problem is severe')).toBe(false);
  });

  it('does not treat a request to change language as a medical follow-up', () => {
    expect(isLanguagePreferenceRequest('Hello, mujhe English samajh nahin aati. Hindi mein bol sakti hain?')).toBe(true);
    expect(isLanguagePreferenceRequest('I have had fever for three days')).toBe(false);
  });

  it('does not repeat onset after the patient already supplied it', () => {
    const state = onsetStateFromPatientText({ symptoms: ['fever'] }, 'I have had fever for three days');

    expect(state.problemStarted).toEqual(['I have had fever for three days']);
    expect(missingCoreDetail(1, state)).toBeNull();
    expect(coreAnswerComplete(1, state)).toBe(true);
  });

  it('requires both medicine and allergy information for question four', () => {
    expect(missingCoreDetail(3, { medications: ['paracetamol'] })).toBe('medicine or food allergies or reactions');
    expect(missingCoreDetail(3, { allergies: ['none'] })).toBe('current or recently taken medicines');
    expect(missingCoreDetail(3, { medications: ['none'], allergies: ['none'] })).toBeNull();
  });

  it('treats explicit no or unknown history as a complete response', () => {
    expect(missingCoreDetail(2, { medicalHistory: ['no known conditions'] })).toBeNull();
    expect(missingCoreDetail(4, { familyHistory: ['unknown'], lifestyle: ['none'] })).toBeNull();
  });

  it('preserves clear medication and allergy denials when the model omits classifications', () => {
    const state = supplementStateFromPatientText({}, 3, 'I do not take any medicines and I have no allergies');

    expect(state.currentMedications).toEqual(['I do not take any medicines and I have no allergies']);
    expect(state.allergies).toEqual(['I do not take any medicines and I have no allergies']);
    expect(missingCoreDetail(3, state)).toBeNull();
  });

  it('builds a problem-centric family origin and evidence chain', () => {
    const summary = buildHistorySummary({
      patientId: 'patient-1',
      sessionId: 'session-1',
      report: {
        symptoms: ['Chest pain', 'Breathing difficulty'],
        problemStarted: ['2 days ago'],
        medications: ['BP medicine: Amlodipine 5 mg'],
        history: { medical: [], family: ['Mother has diabetes'], lifestyle: [] },
        extractionEvidence: {
          symptoms: [{ sourceQuote: 'Mujhe do din se chest mein pain hai' }],
          medications: [{ sourceQuote: 'BP ki medicine leta hoon, amlodipine 5 mg' }],
          family_history: [{ sourceQuote: 'Meri mother ko diabetes thi' }],
        },
      },
      facts: [{ id: 'fact-family', key: 'family_history', value: ['Mother has diabetes'], transcriptEntry: { id: 'transcript-family', text: 'Meri mother ko diabetes thi' } }],
      documents: [],
    });

    expect(summary.importantProblems.map((problem) => problem.name)).toEqual(expect.arrayContaining(['Chest pain', 'Breathing difficulty', 'Hypertension / treatment', 'Diabetes']));
    const diabetes = summary.family.problems.find((problem) => problem.name === 'Diabetes');
    expect(diabetes?.origins[0]).toMatchObject({ type: 'FAMILY_HISTORY', relationship: 'Mother', side: 'Maternal' });
    expect(diabetes?.evidence.some((evidence) => evidence.excerpt?.includes('Meri mother'))).toBe(true);
  });

  it('normalizes conversational symptom wording and flags source differences', () => {
    const summary = buildHistorySummary({
      patientId: 'patient-1',
      sessionId: 'session-1',
      report: {
        symptoms: ['Mujhe do din se chest mein pain hai'],
        problemStarted: ['2 days'],
        extractionEvidence: { symptoms: [{ sourceQuote: 'Mujhe do din se chest mein pain hai' }] },
      },
      facts: [{ id: 'fact-symptom', key: 'symptoms', value: ['Mujhe do din se chest mein pain hai'], transcriptEntry: { id: 'transcript-symptom', text: 'Mujhe do din se chest mein pain hai' } }],
      documents: [{ id: 'doc-1', title: 'Previous report', documentType: 'IMAGING_REPORT', originalFilename: 'previous-report.pdf', extractedData: { impression: 'No chest pain reported at previous visit' } }],
    });

    const chestPain = summary.importantProblems.find((problem) => problem.name === 'Chest pain');
    expect(chestPain?.status).toBe('REVIEW_REQUIRED');
    expect(chestPain?.evidence.some((evidence) => evidence.originalFileAvailable)).toBe(true);
    expect(summary.conflicts[0]).toMatchObject({ problemName: 'Chest pain' });
  });

  it('keeps negative intake answers out of important problem cards', () => {
    const summary = buildHistorySummary({
      patientId: 'patient-1',
      sessionId: 'session-1',
      report: {
        symptoms: ['Fever'],
        history: {
          medical: ['No known chronic illness', 'No previous surgery or hospital admission'],
          family: ['No relevant family history'],
          lifestyle: ['No smoking or alcohol'],
        },
        medications: ['Not taking any regular medicines'],
        allergies: ['No known allergies'],
      },
    });

    expect(summary.importantProblems.map((problem) => problem.name)).toEqual(['Fever']);
    expect(summary.personal.pastConditions).toHaveLength(0);
    expect(summary.personal.medications).toHaveLength(0);
    expect(summary.personal.allergies).toHaveLength(0);
    expect(summary.family.problems).toHaveLength(0);
  });

  it('groups medication strengths under one problem and preserves a dose conflict', () => {
    const summary = buildHistorySummary({
      patientId: 'patient-1',
      sessionId: 'session-1',
      report: {
        medications: ['BP ki medicine leta hoon, amlodipine 5 mg'],
        extractionEvidence: { medications: [{ sourceQuote: 'BP ki medicine leta hoon, amlodipine 5 mg' }] },
      },
      facts: [{ id: 'fact-medication', key: 'medications', value: ['BP ki medicine leta hoon, amlodipine 5 mg'], transcriptEntry: { id: 'transcript-medication', text: 'BP ki medicine leta hoon, amlodipine 5 mg' } }],
      documents: [{ id: 'doc-rx', title: 'Prescription', documentType: 'PRESCRIPTION', originalFilename: 'prescription.pdf', extractedData: { medications: ['Amlodipine 10 mg'] } }],
    });

    const hypertension = summary.importantProblems.find((problem) => problem.name === 'Hypertension / treatment');
    expect(hypertension?.origins.map((origin) => origin.type)).toEqual(['PATIENT_HISTORY', 'DOCUMENT']);
    expect(hypertension?.status).toBe('REVIEW_REQUIRED');
    expect(summary.conflicts[0]).toMatchObject({ problemName: 'Hypertension / treatment' });
  });
});
