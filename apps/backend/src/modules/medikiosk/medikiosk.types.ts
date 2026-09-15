import type {
  ClinicalInterviewStage,
  KioskSessionStatus,
  TranscriptSpeaker,
} from '@prisma/client';

export type CreateKioskSessionInput = {
  encounterId: string;
  patientId?: string;
  /** Start a new blank conversation instead of resuming an interrupted one. */
  fresh?: boolean;
};

export type TranscriptInput = {
  speaker: TranscriptSpeaker;
  text: string;
  occurredAt?: string;
};

export type StateUpdateInput = {
  currentStage?: ClinicalInterviewStage;
  questionIndex?: number;
  answerAccepted?: boolean;
  missingDetail?: string;
  factEvidence?: Record<string, { language?: string; confidence?: number }>;
  clinicalState?: Record<string, unknown>;
  safetySignals?: unknown[];
  status?: KioskSessionStatus;
};

export type ClinicalFactReviewInput = {
  status: 'ACCEPTED' | 'REJECTED' | 'UNCERTAIN';
  correctedValue?: unknown;
};

export type UploadPatientDocumentInput = {
  filename: string;
  mimeType: string;
  dataBase64: string;
  documentType?: 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'IMAGING_REPORT' | 'REFERRAL';
  encounterId?: string;
};

export type DocumentExtractionUpdateInput = { extractedData: Record<string, unknown> };

export type ConsultationUpdateInput = {
  transcript?: unknown[];
  decisions?: Record<string, unknown>;
};

export type FinalizeConsultationInput = ConsultationUpdateInput & {
  prescriptions?: Array<{
    medicationName: string;
    strength: string;
    dose: string;
    unit: string;
    route: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }>;
  nextSteps?: Array<{
    type: 'LAB_TEST' | 'IMAGING' | 'REFERRAL' | 'PHARMACY' | 'FOLLOW_UP' | 'OTHER';
    title: string;
    destinationName?: string;
    destinationDepartment?: string;
    destinationFloor?: string;
    destinationRoom?: string;
    instructions?: string;
    preparation?: string;
    fastingRequired?: boolean | null;
    fastingInstructions?: string;
    timing?: string;
    dependencies?: string[];
  }>;
};

export type ReportUpdateInput = { report: Record<string, unknown> };
export type FinalizePatientReportInput = { report: Record<string, unknown> };

export type TranscribeConsultationInput = {
  audioBase64: string;
  mimeType?: string;
  filename?: string;
  durationSeconds?: number;
};
