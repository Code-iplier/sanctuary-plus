import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type {
  ClinicalEncounter,
  CreateEncounterDto,
  UpdateEncounterDto,
  TranscribeAudioDto,
  TranscriptionResponseDto,
  ClinicalExtraction,
  SoapNote,
  PrescriptionItem,
} from './documentation.types';
import { TranscriptionProvider } from './transcription.provider';
import { ExtractionProvider } from './extraction.provider';
import { SoapProvider } from './soap.provider';
import { PrescriptionProvider } from './prescription.provider';

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

  // In-memory clinical encounters repository
  private encounters: Map<string, ClinicalEncounter> = new Map();

  constructor(
    private readonly transcriptionProvider: TranscriptionProvider,
    private readonly extractionProvider: ExtractionProvider,
    private readonly soapProvider: SoapProvider,
    private readonly prescriptionProvider: PrescriptionProvider,
  ) {
    this.seedInitialEncounters();
  }

  private seedInitialEncounters(): void {
    const initialList: ClinicalEncounter[] = [
      {
        id: 'enc-101',
        patientId: '1',
        clinicianId: 'doc-smith',
        dateTime: new Date(Date.now() - 7200000).toISOString(),
        type: 'inpatient',
        status: 'reviewed',
        rawTranscript: `[Doctor]: Good morning, Mr. Doe. Can you tell me what brought you in today?
[Patient]: I was walking up the stairs and suddenly had this intense crushing chest pressure going into my left arm.
[Doctor]: Did you have any shortness of breath or cold sweats?
[Patient]: Yes, lots of sweating and difficulty breathing.
[Doctor]: Any drug allergies?
[Patient]: Allergic to Penicillin, gives me hives.`,
        audioDurationSeconds: 45,
        transcriptConfidence: 0.96,
        transcriptReviewed: true,
        reviewedAt: new Date(Date.now() - 3600000).toISOString(),
        reviewedByClinicianId: 'doc-smith',
        extraction: {
          symptoms: [
            'Intense crushing chest pressure',
            'Pain radiating to left arm',
            'Shortness of breath',
            'Cold sweats',
          ],
          clinicalFindings: ['Diaphoresis', 'Respiratory distress'],
          vitals: [
            { name: 'Blood Pressure', value: '164/98', unit: 'mmHg' },
            { name: 'Heart Rate', value: '102', unit: 'bpm' },
            { name: 'SpO2', value: '94', unit: '%' },
          ],
          currentMedications: ['Lisinopril 20mg daily', 'Atorvastatin 40mg'],
          allergies: ['Penicillin (hives)'],
          history: ['Hypertension for 5 years'],
          extractedAt: new Date(Date.now() - 3500000).toISOString(),
        },
        soapNote: {
          subjective:
            'Patient is a 58-year-old male who presents with sudden onset crushing substernal chest pressure while walking up stairs, radiating to the left arm. Associated with diaphoresis and acute shortness of breath. Reports allergy to Penicillin (hives).',
          objective:
            'Alert, visibly diaphoretic and in moderate distress. Vitals: BP 164/98 mmHg, HR 102 bpm, SpO2 94% on room air. Cardiopulmonary exam notable for tachypnea without focal rales.',
          assessment:
            'Acute coronary syndrome presentation vs acute myocardial ischemia with exertional onset and autonomic symptoms in a patient with hypertension.',
          plan:
            'Immediate 12-lead ECG and stat cardiac troponin markers. Administer chewed aspirin 324mg and establish IV access. Continuous cardiac telemetry monitoring. Cardiology consult requested.',
          generatedAt: new Date(Date.now() - 3400000).toISOString(),
          reviewedAt: new Date(Date.now() - 3300000).toISOString(),
          isReviewed: true,
        },
        prescriptions: [
          {
            id: 'rx-101-1',
            medication: 'Aspirin (Chewable)',
            dosage: '324mg',
            route: 'oral',
            frequency: 'Stat (once)',
            duration: 'Immediate',
            instructions: 'Chew immediately for acute chest discomfort',
            status: 'approved',
          },
          {
            id: 'rx-101-2',
            medication: 'Nitroglycerin Sublingual',
            dosage: '0.4mg',
            route: 'sublingual',
            frequency: 'every 5 minutes PRN',
            duration: 'Up to 3 doses',
            instructions: 'Dissolve under tongue for active chest pressure. Call EMS if unresolved.',
            status: 'approved',
          },
          {
            id: 'rx-101-3',
            medication: 'Atorvastatin',
            dosage: '80mg',
            route: 'oral',
            frequency: 'once daily',
            duration: '30 days',
            instructions: 'Take in the evening at bedtime',
            status: 'approved',
          },
          {
            id: 'rx-101-4',
            medication: 'Metoprolol Tartrate',
            dosage: '25mg',
            route: 'oral',
            frequency: 'twice daily',
            duration: '30 days',
            instructions: 'Take with or immediately after meals',
            status: 'suggested',
          },
        ],
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'enc-102',
        patientId: '2',
        clinicianId: 'doc-smith',
        dateTime: new Date(Date.now() - 86400000).toISOString(),
        type: 'outpatient',
        status: 'reviewed',
        rawTranscript: `[Doctor]: Hello Jane, how has your blood pressure been this past month?
[Patient]: It has been stable around 125 over 80. No dizziness or headaches.
[Doctor]: Excellent. Are you continuing your Lisinopril 20mg daily?
[Patient]: Yes, every morning with breakfast.`,
        audioDurationSeconds: 30,
        transcriptConfidence: 0.98,
        transcriptReviewed: true,
        reviewedAt: new Date(Date.now() - 82800000).toISOString(),
        reviewedByClinicianId: 'doc-smith',
        extraction: {
          symptoms: ['No dizziness', 'No headaches'],
          clinicalFindings: ['Stable clinical course'],
          vitals: [
            { name: 'Blood Pressure', value: '125/80', unit: 'mmHg' },
          ],
          currentMedications: ['Lisinopril 20mg daily'],
          allergies: [],
          history: ['Essential hypertension'],
          extractedAt: new Date(Date.now() - 82700000).toISOString(),
        },
        soapNote: {
          subjective:
            'Patient is a 45-year-old female presenting for routine outpatient follow-up of essential hypertension. Reports feeling well with no headaches, visual disturbances, chest discomfort, or dizziness.',
          objective:
            'Well-appearing, resting comfortably. Vitals: BP 125/80 mmHg, HR 72 bpm regular. Physical examination unremarkable.',
          assessment:
            'Essential hypertension, well-controlled on current medical therapy without end-organ symptoms.',
          plan:
            'Continue Lisinopril 20mg orally once daily with morning meal. Encourage low-sodium diet and regular aerobic exercise. Routine metabolic panel in 6 months. Follow-up clinic visit in 6 months.',
          generatedAt: new Date(Date.now() - 82600000).toISOString(),
          reviewedAt: new Date(Date.now() - 82500000).toISOString(),
          isReviewed: true,
        },
        prescriptions: [
          {
            id: 'rx-102-1',
            medication: 'Lisinopril',
            dosage: '20mg',
            route: 'oral',
            frequency: 'once daily',
            duration: '90 days',
            instructions: 'Take in the morning with breakfast',
            status: 'approved',
          },
          {
            id: 'rx-102-2',
            medication: 'Hydrochlorothiazide',
            dosage: '12.5mg',
            route: 'oral',
            frequency: 'once daily',
            duration: '30 days',
            instructions: 'Take in the morning to prevent nocturnal diuresis',
            status: 'suggested',
          },
        ],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 82800000).toISOString(),
      },
      {
        id: 'enc-103',
        patientId: '3',
        clinicianId: 'doc-smith',
        dateTime: new Date().toISOString(),
        type: 'emergency',
        status: 'draft',
        rawTranscript: '',
        audioDurationSeconds: 0,
        transcriptConfidence: 0,
        transcriptReviewed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const enc of initialList) {
      this.encounters.set(enc.id, enc);
    }
    this.logger.log(`Initialized DocumentationService with ${initialList.length} encounters`);
  }

  async getEncounters(patientId?: string): Promise<ClinicalEncounter[]> {
    const list = Array.from(this.encounters.values());
    if (patientId) {
      return list.filter((e) => e.patientId === patientId);
    }
    return list.sort(
      (a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime(),
    );
  }

  async getEncounterById(id: string): Promise<ClinicalEncounter> {
    const encounter = this.encounters.get(id);
    if (!encounter) {
      throw new NotFoundException(`Clinical encounter with ID "${id}" not found`);
    }
    return encounter;
  }

  async createEncounter(dto: CreateEncounterDto): Promise<ClinicalEncounter> {
    if (!dto.patientId) {
      throw new BadRequestException('patientId is required to create an encounter');
    }

    const id = `enc-${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const encounter: ClinicalEncounter = {
      id,
      patientId: dto.patientId,
      clinicianId: dto.clinicianId || 'doc-smith',
      dateTime: now,
      type: dto.type || 'inpatient',
      status: 'draft',
      rawTranscript: dto.rawTranscript || '',
      audioDurationSeconds: dto.audioDurationSeconds || 0,
      transcriptConfidence: dto.transcriptConfidence || 0,
      transcriptReviewed: false,
      extraction: dto.extraction,
      soapNote: dto.soapNote,
      prescriptions: dto.prescriptions,
      createdAt: now,
      updatedAt: now,
    };

    this.encounters.set(id, encounter);
    this.logger.log(`Created encounter ${id} for patient ${dto.patientId}`);
    return encounter;
  }

  async updateEncounter(
    id: string,
    dto: UpdateEncounterDto,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    const updated: ClinicalEncounter = {
      ...encounter,
      clinicianId: dto.clinicianId || encounter.clinicianId,
      type: dto.type || encounter.type,
      status: dto.status || encounter.status,
      rawTranscript:
        dto.rawTranscript !== undefined ? dto.rawTranscript : encounter.rawTranscript,
      audioDurationSeconds:
        dto.audioDurationSeconds !== undefined
          ? dto.audioDurationSeconds
          : encounter.audioDurationSeconds,
      transcriptConfidence:
        dto.transcriptConfidence !== undefined
          ? dto.transcriptConfidence
          : encounter.transcriptConfidence,
      transcriptReviewed:
        dto.transcriptReviewed !== undefined
          ? dto.transcriptReviewed
          : encounter.transcriptReviewed,
      extraction: dto.extraction !== undefined ? dto.extraction : encounter.extraction,
      soapNote: dto.soapNote !== undefined ? dto.soapNote : encounter.soapNote,
      prescriptions:
        dto.prescriptions !== undefined ? dto.prescriptions : encounter.prescriptions,
      updatedAt: now,
    };

    this.encounters.set(id, updated);
    return updated;
  }

  async deleteEncounter(id: string): Promise<void> {
    if (!this.encounters.has(id)) {
      throw new NotFoundException(`Clinical encounter with ID "${id}" not found`);
    }
    this.encounters.delete(id);
    this.logger.log(`Deleted encounter ${id}`);
  }

  async transcribeAudio(
    id: string,
    dto: TranscribeAudioDto,
  ): Promise<TranscriptionResponseDto> {
    const encounter = await this.getEncounterById(id);

    this.logger.log(`Running real AI audio transcription for encounter ${id}`);
    const result = await this.transcriptionProvider.transcribe({
      audioBase64: dto.audioBase64,
      filename: dto.filename,
      mimeType: dto.mimeType,
      durationSeconds: dto.durationSeconds,
      encounterType: encounter.type,
      patientId: encounter.patientId,
    });

    const now = new Date().toISOString();
    encounter.rawTranscript = result.transcript;
    encounter.audioDurationSeconds = result.durationSeconds;
    encounter.transcriptConfidence = result.confidence;
    encounter.transcriptReviewed = false;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with transcript (${result.transcript.length} chars, duration: ${result.durationSeconds}s)`,
    );

    return {
      encounterId: id,
      transcript: result.transcript,
      language: result.language,
      durationSeconds: result.durationSeconds,
      confidence: result.confidence,
      segments: result.segments,
    };
  }

  async updateTranscript(
    id: string,
    transcript: string,
    clinicianId?: string,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.rawTranscript = transcript;
    encounter.transcriptReviewed = true;
    encounter.reviewedAt = now;
    encounter.reviewedByClinicianId = clinicianId || encounter.clinicianId || 'doc-smith';
    encounter.status = 'reviewed';
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Updated and reviewed transcript for encounter ${id}`);
    return encounter;
  }

  async extractClinicalInformation(id: string): Promise<ClinicalExtraction> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for extraction. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Extracting clinical information for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const extraction = await this.extractionProvider.extractClinicalInformation(
      encounter.rawTranscript,
    );

    const now = new Date().toISOString();
    encounter.extraction = extraction;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with extraction: ${extraction.symptoms.length} symptoms, ${extraction.clinicalFindings.length} findings, ${extraction.vitals.length} vitals`,
    );

    return extraction;
  }

  async updateExtraction(
    id: string,
    extraction: ClinicalExtraction,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.extraction = {
      ...extraction,
      extractedAt: extraction.extractedAt || now,
    };
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Updated clinical extraction for encounter ${id}`);
    return encounter;
  }

  async generateSoapNote(id: string): Promise<SoapNote> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for SOAP note generation. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Synthesizing SOAP note for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const soapNote = await this.soapProvider.generateSoapNote(
      encounter.rawTranscript,
      encounter.extraction,
    );

    const now = new Date().toISOString();
    encounter.soapNote = soapNote;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Encounter ${id} updated with generated SOAP note`);

    return soapNote;
  }

  async updateSoapNote(
    id: string,
    soapNote: SoapNote,
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.soapNote = {
      ...soapNote,
      reviewedAt: now,
      isReviewed: true,
    };
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(`Updated and reviewed SOAP note for encounter ${id}`);
    return encounter;
  }

  async suggestPrescriptions(id: string): Promise<PrescriptionItem[]> {
    const encounter = await this.getEncounterById(id);

    if (!encounter.rawTranscript || encounter.rawTranscript.trim().length < 10) {
      throw new BadRequestException(
        'Encounter transcript is empty or too short for prescription suggestions. Please transcribe consultation audio first.',
      );
    }

    this.logger.log(
      `Suggesting prescriptions for encounter ${id} (transcript length: ${encounter.rawTranscript.length})`,
    );

    const suggestions = await this.prescriptionProvider.suggestPrescriptions(
      encounter.rawTranscript,
      encounter.extraction,
      encounter.soapNote,
    );

    const now = new Date().toISOString();
    encounter.prescriptions = suggestions;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Encounter ${id} updated with ${suggestions.length} suggested prescriptions`,
    );

    return suggestions;
  }

  async updatePrescriptions(
    id: string,
    prescriptions: PrescriptionItem[],
  ): Promise<ClinicalEncounter> {
    const encounter = await this.getEncounterById(id);
    const now = new Date().toISOString();

    encounter.prescriptions = prescriptions;
    encounter.updatedAt = now;

    this.encounters.set(id, encounter);
    this.logger.log(
      `Updated prescriptions for encounter ${id} (${prescriptions.length} items)`,
    );
    return encounter;
  }
}
