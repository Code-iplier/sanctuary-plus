import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { TranscriptionProvider, TranscriptionResult } from './transcription.provider';
import { ExtractionProvider } from './extraction.provider';
import type { ClinicalExtraction } from './documentation.types';

class MockTranscriptionProvider extends TranscriptionProvider {
  async transcribe(): Promise<TranscriptionResult> {
    return {
      transcript: '[Doctor]: Test dialogue.',
      language: 'en-US',
      durationSeconds: 15,
      confidence: 0.99,
    };
  }
}

class MockExtractionProvider extends ExtractionProvider {
  async extractClinicalInformation(transcript: string): Promise<ClinicalExtraction> {
    if (!transcript || transcript.trim().length < 5) {
      throw new BadRequestException('Transcript too short');
    }
    return {
      symptoms: ['Cough', 'Fever'],
      clinicalFindings: ['Mild wheezing on auscultation'],
      vitals: [{ name: 'BP', value: '120/80', unit: 'mmHg' }],
      currentMedications: ['Acetaminophen 500mg'],
      allergies: ['Penicillin'],
      history: ['Asthma'],
      extractedAt: '2026-09-13T00:00:00.000Z',
    };
  }
}

describe('DocumentationService (Phase 1, 2 & 3)', () => {
  let service: DocumentationService;
  let mockTranscriptionProvider: MockTranscriptionProvider;
  let mockExtractionProvider: MockExtractionProvider;

  beforeEach(() => {
    mockTranscriptionProvider = new MockTranscriptionProvider();
    mockExtractionProvider = new MockExtractionProvider();
    service = new DocumentationService(mockTranscriptionProvider, mockExtractionProvider);
  });

  describe('initial seed data', () => {
    it('should have initial seeded encounters for demo patients', async () => {
      const encounters = await service.getEncounters();
      expect(encounters.length).toBeGreaterThanOrEqual(3);
      expect(encounters.some((e) => e.patientId === '1')).toBe(true);
      expect(encounters.some((e) => e.patientId === '2')).toBe(true);
      expect(encounters.some((e) => e.patientId === '3')).toBe(true);
    });
  });

  describe('getEncounters', () => {
    it('should filter encounters by patientId', async () => {
      const patient1Encounters = await service.getEncounters('1');
      expect(patient1Encounters.length).toBeGreaterThan(0);
      patient1Encounters.forEach((enc) => {
        expect(enc.patientId).toBe('1');
      });
    });

    it('should return empty list for non-existent patient', async () => {
      const result = await service.getEncounters('non-existent-patient-999');
      expect(result).toEqual([]);
    });
  });

  describe('getEncounterById', () => {
    it('should return an encounter by ID', async () => {
      const enc = await service.getEncounterById('enc-101');
      expect(enc).toBeDefined();
      expect(enc.id).toBe('enc-101');
      expect(enc.patientId).toBe('1');
    });

    it('should throw NotFoundException when ID does not exist', async () => {
      await expect(service.getEncounterById('invalid-id-xyz')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEncounter', () => {
    it('should create an encounter with draft status by default', async () => {
      const created = await service.createEncounter({
        patientId: '4',
        clinicianId: 'doc-smith',
        type: 'outpatient',
      });

      expect(created.id).toBeDefined();
      expect(created.patientId).toBe('4');
      expect(created.clinicianId).toBe('doc-smith');
      expect(created.status).toBe('draft');
      expect(created.type).toBe('outpatient');
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();

      const fetched = await service.getEncounterById(created.id);
      expect(fetched).toEqual(created);
    });

    it('should reject creation without patientId', async () => {
      await expect(
        service.createEncounter({
          patientId: '',
          clinicianId: 'doc-smith',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEncounter and status lifecycle', () => {
    it('should update encounter fields and progress status from draft to reviewed to finalized', async () => {
      const created = await service.createEncounter({
        patientId: '4',
        clinicianId: 'doc-smith',
      });

      expect(created.status).toBe('draft');

      const reviewed = await service.updateEncounter(created.id, {
        rawTranscript: 'Patient discussion recorded.',
        status: 'reviewed',
        transcriptReviewed: true,
      });

      expect(reviewed.status).toBe('reviewed');
      expect(reviewed.rawTranscript).toBe('Patient discussion recorded.');
      expect(reviewed.transcriptReviewed).toBe(true);

      const finalized = await service.updateEncounter(created.id, {
        status: 'finalized',
      });

      expect(finalized.status).toBe('finalized');
    });

    it('should throw NotFoundException when updating non-existent encounter', async () => {
      await expect(
        service.updateEncounter('non-existent', { status: 'reviewed' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteEncounter', () => {
    it('should delete existing encounter', async () => {
      const created = await service.createEncounter({
        patientId: '1',
        clinicianId: 'doc-smith',
      });

      await service.deleteEncounter(created.id);

      await expect(service.getEncounterById(created.id)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for unknown encounter deletion', async () => {
      await expect(service.deleteEncounter('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('extractClinicalInformation (Phase 3)', () => {
    it('should extract clinical information and attach to encounter', async () => {
      const result = await service.extractClinicalInformation('enc-101');
      expect(result).toBeDefined();
      expect(result.symptoms).toContain('Cough');
      expect(result.clinicalFindings).toContain('Mild wheezing on auscultation');
      expect(result.vitals).toEqual([{ name: 'BP', value: '120/80', unit: 'mmHg' }]);
      expect(result.allergies).toContain('Penicillin');
      expect(result.history).toContain('Asthma');

      const updated = await service.getEncounterById('enc-101');
      expect(updated.extraction).toBeDefined();
      expect(updated.extraction?.symptoms).toContain('Cough');
    });

    it('should throw BadRequestException when transcript is empty or too short', async () => {
      // enc-103 has empty rawTranscript
      await expect(
        service.extractClinicalInformation('enc-103'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      await expect(
        service.extractClinicalInformation('non-existent-enc'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateExtraction (Phase 3)', () => {
    it('should update extracted entities on existing encounter', async () => {
      const updated = await service.updateExtraction('enc-101', {
        symptoms: ['Sore throat', 'Fever'],
        clinicalFindings: ['Pharyngeal erythema'],
        vitals: [{ name: 'Temp', value: '38.5', unit: 'C' }],
        currentMedications: ['Ibuprofen 400mg'],
        allergies: ['Sulfa'],
        history: ['Tonsillitis'],
      });

      expect(updated.extraction?.symptoms).toEqual(['Sore throat', 'Fever']);
      expect(updated.extraction?.clinicalFindings).toEqual(['Pharyngeal erythema']);
      expect(updated.extraction?.vitals).toEqual([{ name: 'Temp', value: '38.5', unit: 'C' }]);
      expect(updated.extraction?.allergies).toEqual(['Sulfa']);
    });

    it('should throw NotFoundException when updating extraction on non-existent encounter', async () => {
      await expect(
        service.updateExtraction('non-existent-enc', {
          symptoms: ['Cough'],
          clinicalFindings: [],
          vitals: [],
          currentMedications: [],
          allergies: [],
          history: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

