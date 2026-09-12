import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { TranscriptionProvider, TranscriptionResult } from './transcription.provider';

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

describe('DocumentationService (Phase 1 & 2)', () => {
  let service: DocumentationService;
  let mockProvider: MockTranscriptionProvider;

  beforeEach(() => {
    mockProvider = new MockTranscriptionProvider();
    service = new DocumentationService(mockProvider);
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
});
