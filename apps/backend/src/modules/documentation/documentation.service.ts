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
} from './documentation.types';
import { TranscriptionProvider } from './transcription.provider';

@Injectable()
export class DocumentationService {
  private readonly logger = new Logger(DocumentationService.name);

  // In-memory clinical encounters repository
  private encounters: Map<string, ClinicalEncounter> = new Map();

  constructor(
    private readonly transcriptionProvider: TranscriptionProvider,
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
      rawTranscript: dto.rawTranscript !== undefined ? dto.rawTranscript : encounter.rawTranscript,
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
}
