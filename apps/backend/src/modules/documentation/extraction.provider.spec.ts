import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { GeminiExtractionProvider } from './extraction.provider';

describe('GeminiExtractionProvider (Phase 3)', () => {
  let provider: GeminiExtractionProvider;
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-extraction';
    provider = new GeminiExtractionProvider();
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
    await expect(provider.extractClinicalInformation('')).rejects.toThrow(
      BadRequestException,
    );
    await expect(provider.extractClinicalInformation('too short')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      provider.extractClinicalInformation('Patient presents with severe chest pain and nausea.'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should extract structured clinical entities from Gemini API response', async () => {
    const mockGeminiJson = {
      symptoms: ['Substernal chest pressure', 'Shortness of breath'],
      clinicalFindings: ['Diaphoretic', 'Clear lungs'],
      vitals: [
        { name: 'Blood Pressure', value: '160/95', unit: 'mmHg' },
        { name: 'Heart Rate', value: '98', unit: 'bpm' },
      ],
      currentMedications: ['Lisinopril 20mg daily'],
      allergies: ['Penicillin'],
      history: ['Hypertension for 5 years'],
    };

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(mockGeminiJson),
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

    const result = await provider.extractClinicalInformation(
      '[Doctor]: What brings you in? [Patient]: Severe chest pressure and shortness of breath.',
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.symptoms).toEqual(['Substernal chest pressure', 'Shortness of breath']);
    expect(result.clinicalFindings).toEqual(['Diaphoretic', 'Clear lungs']);
    expect(result.vitals.length).toBe(2);
    expect(result.vitals[0]).toEqual({ name: 'Blood Pressure', value: '160/95', unit: 'mmHg' });
    expect(result.currentMedications).toEqual(['Lisinopril 20mg daily']);
    expect(result.allergies).toEqual(['Penicillin']);
    expect(result.history).toEqual(['Hypertension for 5 years']);
    expect(result.extractedAt).toBeDefined();
  });

  it('should handle markdown code fences in Gemini output cleanly', async () => {
    const mockOutput = '```json\n{\n  "symptoms": ["Dry cough"],\n  "clinicalFindings": [],\n  "vitals": [],\n  "currentMedications": [],\n  "allergies": [],\n  "history": []\n}\n```';

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

    const result = await provider.extractClinicalInformation(
      'Patient reports a dry cough that began 3 days ago.',
    );

    expect(result.symptoms).toEqual(['Dry cough']);
    expect(result.allergies).toEqual([]);
  });

  it('should gracefully handle malformed JSON output without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'This is not valid JSON content at all.' }],
            },
          },
        ],
      }),
    } as Response);

    const result = await provider.extractClinicalInformation(
      'Patient reports chronic fatigue and headaches.',
    );

    expect(result).toBeDefined();
    expect(result.symptoms).toEqual([]);
    expect(result.rawExtractionJson).toBe('This is not valid JSON content at all.');
  });

  it('should throw BadGatewayException when Gemini API returns HTTP error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limit exceeded',
    } as Response);

    await expect(
      provider.extractClinicalInformation('Patient consultation dialogue to extract.'),
    ).rejects.toThrow(BadGatewayException);
  });
});
