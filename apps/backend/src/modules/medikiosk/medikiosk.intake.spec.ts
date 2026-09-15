import { describe, expect, it } from 'vitest';
import { coreAnswerComplete, hasOnsetEvidence, isLanguagePreferenceRequest, missingCoreDetail, onsetStateFromPatientText, supplementStateFromPatientText } from './medikiosk.intake';

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
});
