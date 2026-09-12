export type EncounterStatus = 'draft' | 'reviewed' | 'finalized';

export type EncounterType =
  | 'inpatient'
  | 'outpatient'
  | 'emergency'
  | 'telehealth'
  | 'ambulatory';

export interface TranscriptionSegment {
  start?: number;
  end?: number;
  speaker?: string;
  text: string;
}

export interface ClinicalEncounter {
  id: string;
  patientId: string;
  clinicianId?: string;
  dateTime: string;
  type: EncounterType;
  status: EncounterStatus;
  rawTranscript?: string;
  audioDurationSeconds?: number;
  transcriptConfidence?: number;
  transcriptReviewed?: boolean;
  reviewedAt?: string;
  reviewedByClinicianId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEncounterDto {
  patientId: string;
  clinicianId?: string;
  type?: EncounterType;
  rawTranscript?: string;
  audioDurationSeconds?: number;
  transcriptConfidence?: number;
}

export interface UpdateEncounterDto {
  clinicianId?: string;
  type?: EncounterType;
  status?: EncounterStatus;
  rawTranscript?: string;
  audioDurationSeconds?: number;
  transcriptConfidence?: number;
  transcriptReviewed?: boolean;
}

export interface TranscribeAudioDto {
  audioBase64?: string;
  filename?: string;
  mimeType?: string;
  durationSeconds?: number;
}

export interface TranscriptionResponseDto {
  encounterId: string;
  transcript: string;
  language: string;
  durationSeconds: number;
  confidence: number;
  segments?: TranscriptionSegment[];
}

export interface UpdateTranscriptDto {
  transcript: string;
  clinicianId?: string;
}
