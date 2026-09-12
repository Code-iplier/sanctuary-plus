import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { GeminiPrescriptionProvider } from './prescription.provider';
import type { ClinicalExtraction, SoapNote } from './documentation.types';

describe('GeminiPrescriptionProvider (Phase 5)', () => {
  let provider: GeminiPrescriptionProvider;
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-prescriptions';
    provider = new GeminiPrescriptionProvider();
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    vi.restoreAllMocks();
  });

  it('should throw BadRequestException when transcript is empty or too short', async () => {
    await expect(provider.suggestPrescriptions('')).rejects.toThrow(
      BadRequestException,
    );
    await expect(provider.suggestPrescriptions('short')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      provider.suggestPrescriptions(
        'Patient presents with severe persistent cough and low grade fever for 4 days.',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should synthesize suggested prescriptions from Gemini JSON response', async () => {
    const mockPrescriptions = [
      {
        medication: 'Amoxicillin',
        dosage: '500 mg',
        route: 'oral',
        frequency: 'every 8 hours',
        duration: '7 days',
        instructions: 'Take with food and full glass of water',
      },
      {
        medication: 'Albuterol Inhaler',
        dosage: '90 mcg/actuation',
        route: 'inhalation',
        frequency: '1-2 puffs every 4-6 hours PRN',
        duration: '30 days',
        instructions: 'Rinse mouth after inhalation',
      },
    ];

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(mockPrescriptions),
              },
            ],
          },
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const extraction: ClinicalExtraction = {
      symptoms: ['Productive cough', 'Wheezing'],
      clinicalFindings: ['Bilateral expiratory wheezes'],
      vitals: [{ name: 'SpO2', value: '96', unit: '%' }],
      currentMedications: ['Loratadine 10mg daily'],
      allergies: ['Sulfa drugs'],
      history: ['Mild intermittent asthma'],
    };

    const soapNote: SoapNote = {
      subjective: 'Patient reports productive cough and mild wheezing.',
      objective: 'Lungs show mild wheezing. SpO2 96%.',
      assessment: 'Acute bronchitis with mild bronchospasm.',
      plan: 'Start bronchodilator and antibiotic therapy.',
    };

    const result = await provider.suggestPrescriptions(
      '[Doctor]: How can I help you? [Patient]: I have had this chest cough and wheezing for a week.',
      extraction,
      soapNote,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(2);
    expect(result[0].medication).toBe('Amoxicillin');
    expect(result[0].status).toBe('suggested');
    expect(result[0].id).toBeDefined();
    expect(result[1].medication).toBe('Albuterol Inhaler');
    expect(result[1].status).toBe('suggested');
  });

  it('should strip markdown code fences from Gemini JSON output', async () => {
    const mockOutput = '```json\n[\n  {\n    "medication": "Cetirizine",\n    "dosage": "10 mg",\n    "route": "oral",\n    "frequency": "once daily",\n    "duration": "14 days",\n    "instructions": "Take at bedtime"\n  }\n]\n```';

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: mockOutput }],
            },
          },
        ],
      }),
    } as Response);

    const result = await provider.suggestPrescriptions(
      '[Doctor]: Any seasonal allergies? [Patient]: Yes, severe sneezing and runny nose.',
    );

    expect(result.length).toBe(1);
    expect(result[0].medication).toBe('Cetirizine');
    expect(result[0].dosage).toBe('10 mg');
    expect(result[0].status).toBe('suggested');
  });

  it('should provide normalized fallback suggestions if Gemini returns malformed output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'NOT VALID JSON ARRAY' }],
            },
          },
        ],
      }),
    } as Response);

    const extraction: ClinicalExtraction = {
      symptoms: ['Chest pain', 'Shortness of breath'],
      clinicalFindings: ['Diaphoresis'],
      vitals: [{ name: 'BP', value: '150/90', unit: 'mmHg' }],
      currentMedications: [],
      allergies: [],
      history: ['CAD'],
    };

    const result = await provider.suggestPrescriptions(
      '[Doctor]: Are you having chest pain? [Patient]: Yes, radiating pressure.',
      extraction,
    );

    expect(result.length).toBeGreaterThan(0);
    expect(result[0].status).toBe('suggested');
    expect(result[0].id).toBeDefined();
  });

  it('should throw BadGatewayException when Gemini API returns 429 quota error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Quota exceeded for resource',
    } as Response);

    await expect(
      provider.suggestPrescriptions(
        '[Doctor]: Hello there. [Patient]: Hello doctor, checking in for prescription refill.',
      ),
    ).rejects.toThrow(BadGatewayException);
  });
});
