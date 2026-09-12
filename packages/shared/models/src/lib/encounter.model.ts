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

export interface ClinicalVitalSign {
  name: string;
  value: string;
  unit?: string;
}

export interface ClinicalExtraction {
  symptoms: string[];
  clinicalFindings: string[];
  vitals: ClinicalVitalSign[];
  currentMedications: string[];
  allergies: string[];
  history: string[];
  rawExtractionJson?: string;
  extractedAt?: string;
}

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  generatedAt?: string;
  reviewedAt?: string;
  isReviewed?: boolean;
}

export type PrescriptionStatus = 'suggested' | 'approved' | 'rejected';

export interface PrescriptionItem {
  id: string;
  medication: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  status: PrescriptionStatus;
}

export type DiagnosisType = 'primary' | 'differential';
export type DiagnosisCertainty = 'suspected' | 'probable' | 'confirmed';
export type DiagnosisStatus = 'suggested' | 'confirmed' | 'ruled-out';

export interface DiagnosisItem {
  id: string;
  name: string;
  code?: string;
  type: DiagnosisType;
  certainty: DiagnosisCertainty;
  supportingEvidence: string[];
  status: DiagnosisStatus;
}

export interface ClinicalImpression {
  summary: string;
  diagnoses: DiagnosisItem[];
  generatedAt?: string;
  reviewedAt?: string;
  isReviewed?: boolean;
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
  extraction?: ClinicalExtraction;
  soapNote?: SoapNote;
  prescriptions?: PrescriptionItem[];
  clinicalImpression?: ClinicalImpression;
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
  extraction?: ClinicalExtraction;
  soapNote?: SoapNote;
  prescriptions?: PrescriptionItem[];
  clinicalImpression?: ClinicalImpression;
}

export interface UpdateEncounterDto {
  clinicianId?: string;
  type?: EncounterType;
  status?: EncounterStatus;
  rawTranscript?: string;
  audioDurationSeconds?: number;
  transcriptConfidence?: number;
  transcriptReviewed?: boolean;
  extraction?: ClinicalExtraction;
  soapNote?: SoapNote;
  prescriptions?: PrescriptionItem[];
  clinicalImpression?: ClinicalImpression;
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

export interface UpdateExtractionDto {
  extraction: ClinicalExtraction;
}

export interface UpdateSoapNoteDto {
  soapNote: SoapNote;
}

export interface UpdatePrescriptionsDto {
  prescriptions: PrescriptionItem[];
}

export interface UpdateClinicalImpressionDto {
  clinicalImpression: ClinicalImpression;
}


