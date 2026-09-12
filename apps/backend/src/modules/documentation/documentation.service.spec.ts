import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { TranscriptionProvider, TranscriptionResult } from './transcription.provider';
import { ExtractionProvider } from './extraction.provider';
import { SoapProvider } from './soap.provider';
import { PrescriptionProvider } from './prescription.provider';
import { DiagnosisProvider } from './diagnosis.provider';
import type {
  ClinicalExtraction,
  SoapNote,
  PrescriptionItem,
  ClinicalImpression,
} from './documentation.types';

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

class MockSoapProvider extends SoapProvider {
  async generateSoapNote(
    transcript: string,
  ): Promise<SoapNote> {
    if (!transcript || transcript.trim().length < 5) {
      throw new BadRequestException('Transcript too short');
    }
    return {
      subjective: 'Patient reports cough and fever.',
      objective: 'Mild wheezing on lung exam. BP 120/80.',
      assessment: 'Acute bronchitis vs viral upper respiratory tract infection.',
      plan: 'Hydration, rest, and antipyretics as needed.',
      generatedAt: '2026-09-13T00:00:00.000Z',
      isReviewed: false,
    };
  }
}

class MockPrescriptionProvider extends PrescriptionProvider {
  async suggestPrescriptions(
    transcript: string,
  ): Promise<PrescriptionItem[]> {
    if (!transcript || transcript.trim().length < 5) {
      throw new BadRequestException('Transcript too short');
    }
    return [
      {
        id: 'rx-mock-1',
        medication: 'Amoxicillin',
        dosage: '500 mg',
        route: 'oral',
        frequency: 'TID',
        duration: '7 days',
        instructions: 'Take with food',
        status: 'suggested',
      },
    ];
  }
}

class MockDiagnosisProvider extends DiagnosisProvider {
  async suggestDiagnoses(
    transcript: string,
  ): Promise<ClinicalImpression> {
    if (!transcript || transcript.trim().length < 5) {
      throw new BadRequestException('Transcript too short');
    }
    return {
      summary: 'Mock clinical impression summary.',
      diagnoses: [
        {
          id: 'diag-mock-1',
          name: 'Acute Bronchitis',
          code: 'J20.9',
          type: 'primary',
          certainty: 'probable',
          supportingEvidence: ['Cough', 'Fever'],
          status: 'suggested',
        },
        {
          id: 'diag-mock-2',
          name: 'Viral Syndrome',
          code: 'B34.9',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Mild fever'],
          status: 'suggested',
        },
      ],
      generatedAt: '2026-09-13T00:00:00.000Z',
      isReviewed: false,
    };
  }
}

describe('DocumentationService (Phase 1, 2, 3, 4, 5 & 6)', () => {
  let service: DocumentationService;
  let mockTranscriptionProvider: MockTranscriptionProvider;
  let mockExtractionProvider: MockExtractionProvider;
  let mockSoapProvider: MockSoapProvider;
  let mockPrescriptionProvider: MockPrescriptionProvider;
  let mockDiagnosisProvider: MockDiagnosisProvider;

  beforeEach(() => {
    mockTranscriptionProvider = new MockTranscriptionProvider();
    mockExtractionProvider = new MockExtractionProvider();
    mockSoapProvider = new MockSoapProvider();
    mockPrescriptionProvider = new MockPrescriptionProvider();
    mockDiagnosisProvider = new MockDiagnosisProvider();
    service = new DocumentationService(
      mockTranscriptionProvider,
      mockExtractionProvider,
      mockSoapProvider,
      mockPrescriptionProvider,
      mockDiagnosisProvider,
    );
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

  describe('generateSoapNote (Phase 4)', () => {
    it('should generate a structured SOAP note for an encounter with a transcript', async () => {
      const note = await service.generateSoapNote('enc-101');
      expect(note).toBeDefined();
      expect(note.subjective).toContain('Patient reports cough and fever.');
      expect(note.objective).toContain('Mild wheezing');
      expect(note.assessment).toBeDefined();
      expect(note.plan).toBeDefined();
      expect(note.isReviewed).toBe(false);

      const encounter = await service.getEncounterById('enc-101');
      expect(encounter.soapNote).toBeDefined();
      expect(encounter.soapNote?.subjective).toBe(note.subjective);
    });

    it('should throw BadRequestException when encounter has empty transcript', async () => {
      // enc-103 has no transcript
      await expect(service.generateSoapNote('enc-103')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for unknown encounter', async () => {
      await expect(service.generateSoapNote('unknown-enc-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSoapNote (Phase 4)', () => {
    it('should update SOAP note and mark it reviewed', async () => {
      const updatedEncounter = await service.updateSoapNote('enc-101', {
        subjective: 'Reviewed subjective info.',
        objective: 'Reviewed objective findings.',
        assessment: 'Reviewed assessment.',
        plan: 'Reviewed plan.',
      });

      expect(updatedEncounter.soapNote?.subjective).toBe('Reviewed subjective info.');
      expect(updatedEncounter.soapNote?.isReviewed).toBe(true);
      expect(updatedEncounter.soapNote?.reviewedAt).toBeDefined();
    });

    it('should throw NotFoundException when updating SOAP note for non-existent encounter', async () => {
      await expect(
        service.updateSoapNote('unknown-enc', {
          subjective: 'Test',
          objective: 'Test',
          assessment: 'Test',
          plan: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suggestPrescriptions (Phase 5)', () => {
    it('should suggest prescriptions for an encounter with a transcript', async () => {
      const suggestions = await service.suggestPrescriptions('enc-101');
      expect(suggestions).toBeDefined();
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].medication).toBe('Amoxicillin');
      expect(suggestions[0].status).toBe('suggested');

      const encounter = await service.getEncounterById('enc-101');
      expect(encounter.prescriptions).toBeDefined();
      expect(encounter.prescriptions?.some((p) => p.medication === 'Amoxicillin')).toBe(true);
    });

    it('should throw BadRequestException when encounter has empty transcript', async () => {
      // enc-103 has no transcript
      await expect(service.suggestPrescriptions('enc-103')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for unknown encounter', async () => {
      await expect(service.suggestPrescriptions('unknown-enc-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updatePrescriptions (Phase 5)', () => {
    it('should update prescriptions for an encounter', async () => {
      const newPrescriptions = [
        {
          id: 'rx-updated-1',
          medication: 'Metoprolol Succinate',
          dosage: '25 mg',
          route: 'oral',
          frequency: 'once daily',
          duration: '30 days',
          instructions: 'Take in the morning with food',
          status: 'approved' as const,
        },
      ];

      const updatedEncounter = await service.updatePrescriptions('enc-101', newPrescriptions);
      expect(updatedEncounter.prescriptions).toBeDefined();
      expect(updatedEncounter.prescriptions?.length).toBe(1);
      expect(updatedEncounter.prescriptions?.[0].medication).toBe('Metoprolol Succinate');
      expect(updatedEncounter.prescriptions?.[0].status).toBe('approved');
    });

    it('should throw NotFoundException when updating prescriptions for non-existent encounter', async () => {
      await expect(
        service.updatePrescriptions('unknown-enc', []),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('suggestDiagnoses (Phase 6)', () => {
    it('should synthesize clinical impression and diagnoses for encounter with transcript', async () => {
      const impression = await service.suggestDiagnoses('enc-101');
      expect(impression).toBeDefined();
      expect(impression.summary).toBe('Mock clinical impression summary.');
      expect(impression.diagnoses.length).toBe(2);
      expect(impression.diagnoses[0].name).toBe('Acute Bronchitis');
      expect(impression.diagnoses[0].type).toBe('primary');

      const encounter = await service.getEncounterById('enc-101');
      expect(encounter.clinicalImpression).toBeDefined();
      expect(encounter.clinicalImpression?.diagnoses.length).toBe(2);
    });

    it('should throw BadRequestException when encounter has empty transcript', async () => {
      await expect(service.suggestDiagnoses('enc-103')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for unknown encounter', async () => {
      await expect(service.suggestDiagnoses('unknown-enc-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDiagnoses (Phase 6)', () => {
    it('should update clinical impression and mark it reviewed', async () => {
      const updatedImpression = {
        summary: 'Clinician updated impression summary.',
        diagnoses: [
          {
            id: 'diag-rev-1',
            name: 'Acute Bronchitis',
            code: 'J20.9',
            type: 'primary' as const,
            certainty: 'confirmed' as const,
            supportingEvidence: ['Wheezing', 'Productive cough'],
            status: 'confirmed' as const,
          },
        ],
      };

      const updatedEncounter = await service.updateDiagnoses('enc-101', updatedImpression);
      expect(updatedEncounter.clinicalImpression).toBeDefined();
      expect(updatedEncounter.clinicalImpression?.summary).toBe('Clinician updated impression summary.');
      expect(updatedEncounter.clinicalImpression?.diagnoses[0].status).toBe('confirmed');
      expect(updatedEncounter.clinicalImpression?.isReviewed).toBe(true);
      expect(updatedEncounter.clinicalImpression?.reviewedAt).toBeDefined();
    });

    it('should throw NotFoundException when updating diagnoses for non-existent encounter', async () => {
      await expect(
        service.updateDiagnoses('unknown-enc', {
          summary: 'Test',
          diagnoses: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateFhirBundle (Phase 7)', () => {
    it('should generate a deterministic FHIR R4 bundle for an existing encounter', async () => {
      const bundle = await service.generateFhirBundle('enc-101');
      expect(bundle).toBeDefined();
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
      expect(bundle.total).toBeGreaterThan(0);
      expect(bundle.entry.length).toBe(bundle.total);

      const encounter = await service.getEncounterById('enc-101');
      expect(encounter.fhirBundle).toBeDefined();
      expect(encounter.fhirBundle?.total).toBe(bundle.total);
    });

    it('should throw NotFoundException when encounter is not found', async () => {
      await expect(service.generateFhirBundle('unknown-enc-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFhirBundle (Phase 7)', () => {
    it('should retrieve existing or auto-generate FHIR bundle for encounter', async () => {
      const bundle = await service.getFhirBundle('enc-101');
      expect(bundle).toBeDefined();
      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.total).toBeGreaterThan(0);
    });

    it('should auto-generate and cache FHIR bundle if not already present', async () => {
      const encounter = await service.getEncounterById('enc-103');
      encounter.fhirBundle = undefined;

      const bundle = await service.getFhirBundle('enc-103');
      expect(bundle).toBeDefined();
      expect(bundle.resourceType).toBe('Bundle');
      expect(encounter.fhirBundle).toBeDefined();
    });

    it('should throw NotFoundException for unknown encounter', async () => {
      await expect(service.getFhirBundle('unknown-enc-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});



