import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import type {
  ClinicalEncounter,
  ClinicalExtraction,
  CreateEncounterDto,
  UpdateEncounterDto,
  TranscribeAudioDto,
  UpdateTranscriptDto,
  UpdateExtractionDto,
  SoapNote,
  UpdateSoapNoteDto,
} from './documentation.types';

describe('DocumentationController', () => {
  let controller: DocumentationController;
  let service: DocumentationService;

  const mockEncounter: ClinicalEncounter = {
    id: 'enc-101',
    patientId: '1',
    clinicianId: 'doc-smith',
    type: 'outpatient',
    status: 'reviewed',
    createdAt: '2026-09-13T00:00:00.000Z',
    updatedAt: '2026-09-13T00:00:00.000Z',
    rawTranscript: '[Doctor]: Patient has cough and fever.',
    transcriptReviewed: true,
  };

  const mockExtraction: ClinicalExtraction = {
    symptoms: ['Cough', 'Fever'],
    clinicalFindings: ['Wheezing'],
    vitals: [{ name: 'BP', value: '120/80', unit: 'mmHg' }],
    currentMedications: ['Albuterol'],
    allergies: ['Penicillin'],
    history: ['Asthma'],
    extractedAt: '2026-09-13T00:00:00.000Z',
  };

  const mockSoapNote: SoapNote = {
    subjective: 'Patient reports cough and fever.',
    objective: 'Mild wheezing on lung auscultation. BP 120/80.',
    assessment: 'Acute bronchitis vs viral URI.',
    plan: 'Rest and hydration.',
    generatedAt: '2026-09-13T00:00:00.000Z',
    isReviewed: false,
  };

  beforeEach(() => {
    service = {
      getEncounters: vi.fn().mockResolvedValue([mockEncounter]),
      getEncounterById: vi.fn().mockResolvedValue(mockEncounter),
      createEncounter: vi.fn().mockResolvedValue(mockEncounter),
      updateEncounter: vi.fn().mockResolvedValue(mockEncounter),
      deleteEncounter: vi.fn().mockResolvedValue(undefined),
      transcribeAudio: vi.fn().mockResolvedValue({
        encounterId: 'enc-101',
        transcript: 'Test transcript',
        language: 'en-US',
        durationSeconds: 10,
        status: 'success',
      }),
      updateTranscript: vi.fn().mockResolvedValue({
        ...mockEncounter,
        rawTranscript: 'Updated transcript',
      }),
      extractClinicalInformation: vi.fn().mockResolvedValue(mockExtraction),
      updateExtraction: vi.fn().mockResolvedValue({
        ...mockEncounter,
        extraction: mockExtraction,
      }),
      generateSoapNote: vi.fn().mockResolvedValue(mockSoapNote),
      updateSoapNote: vi.fn().mockResolvedValue({
        ...mockEncounter,
        soapNote: mockSoapNote,
      }),
    } as unknown as DocumentationService;

    controller = new DocumentationController(service);
  });

  it('should get all encounters', async () => {
    const result = await controller.getEncounters();
    expect(result).toEqual([mockEncounter]);
    expect(service.getEncounters).toHaveBeenCalledWith(undefined);
  });

  it('should get encounter by ID', async () => {
    const result = await controller.getEncounterById('enc-101');
    expect(result).toEqual(mockEncounter);
    expect(service.getEncounterById).toHaveBeenCalledWith('enc-101');
  });

  it('should create an encounter', async () => {
    const dto: CreateEncounterDto = { patientId: '1', clinicianId: 'doc-smith' };
    const result = await controller.createEncounter(dto);
    expect(result).toEqual(mockEncounter);
    expect(service.createEncounter).toHaveBeenCalledWith(dto);
  });

  it('should update an encounter', async () => {
    const dto: UpdateEncounterDto = { status: 'reviewed' };
    const result = await controller.updateEncounter('enc-101', dto);
    expect(result).toEqual(mockEncounter);
    expect(service.updateEncounter).toHaveBeenCalledWith('enc-101', dto);
  });

  it('should delete an encounter', async () => {
    await controller.deleteEncounter('enc-101');
    expect(service.deleteEncounter).toHaveBeenCalledWith('enc-101');
  });

  it('should transcribe audio', async () => {
    const dto: TranscribeAudioDto = { audioBase64: 'dGVzdA==', mimeType: 'audio/webm' };
    const result = await controller.transcribeAudio('enc-101', dto);
    expect(result.transcript).toBe('Test transcript');
    expect(service.transcribeAudio).toHaveBeenCalledWith('enc-101', dto);
  });

  it('should update transcript', async () => {
    const dto: UpdateTranscriptDto = { transcript: 'Updated transcript' };
    const result = await controller.updateTranscript('enc-101', dto);
    expect(result.rawTranscript).toBe('Updated transcript');
    expect(service.updateTranscript).toHaveBeenCalledWith('enc-101', 'Updated transcript', undefined);
  });

  it('should extract clinical information (Phase 3)', async () => {
    const result = await controller.extractClinicalInformation('enc-101');
    expect(result).toEqual(mockExtraction);
    expect(service.extractClinicalInformation).toHaveBeenCalledWith('enc-101');
  });

  it('should update extraction entities (Phase 3)', async () => {
    const dto: UpdateExtractionDto = { extraction: mockExtraction };
    const result = await controller.updateExtraction('enc-101', dto);
    expect(result.extraction).toEqual(mockExtraction);
    expect(service.updateExtraction).toHaveBeenCalledWith('enc-101', mockExtraction);
  });

  it('should generate SOAP note (Phase 4)', async () => {
    const result = await controller.generateSoapNote('enc-101');
    expect(result).toEqual(mockSoapNote);
    expect(service.generateSoapNote).toHaveBeenCalledWith('enc-101');
  });

  it('should update SOAP note (Phase 4)', async () => {
    const dto: UpdateSoapNoteDto = { soapNote: mockSoapNote };
    const result = await controller.updateSoapNote('enc-101', dto);
    expect(result.soapNote).toEqual(mockSoapNote);
    expect(service.updateSoapNote).toHaveBeenCalledWith('enc-101', mockSoapNote);
  });
});

