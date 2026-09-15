export type KioskSessionStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'ERROR';
export type ClinicalInterviewStage =
  | 'CHIEF_COMPLAINT'
  | 'CURRENT_PROBLEM'
  | 'MEDICAL_HISTORY'
  | 'MEDICATIONS_ALLERGIES'
  | 'FAMILY_LIFESTYLE'
  | 'VERIFICATION'
  | 'COMPLETED';
export type TranscriptSpeaker = 'PATIENT' | 'ASSISTANT' | 'DOCTOR';
