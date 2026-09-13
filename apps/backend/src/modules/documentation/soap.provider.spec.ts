import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { GeminiSoapProvider } from './soap.provider';
import type { ClinicalExtraction } from './documentation.types';

describe('GeminiSoapProvider (Phase 4)', () => {
  let provider: GeminiSoapProvider;
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-soap';
    provider = new GeminiSoapProvider();
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
    await expect(provider.generateSoapNote('')).rejects.toThrow(
      BadRequestException,
    );
    await expect(provider.generateSoapNote('short')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when GEMINI_API_KEY is not set', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      provider.generateSoapNote('Patient presents with severe chest pressure and shortness of breath.'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should synthesize four-quadrant SOAP note from Gemini response', async () => {
    const mockSoapJson = {
      subjective: 'Patient reports severe chest pressure and dyspnea.',
      objective: 'BP 160/95 mmHg, HR 98 bpm. Diaphoretic on exam.',
      assessment: 'Acute coronary syndrome presentation.',
      plan: 'Immediate ECG and cardiac troponin markers. Continue telemetry.',
    };

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(mockSoapJson),
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
      symptoms: ['Chest pressure'],
      clinicalFindings: ['Diaphoretic'],
      vitals: [{ name: 'BP', value: '160/95', unit: 'mmHg' }],
      currentMedications: ['Aspirin 81mg'],
      allergies: ['Penicillin'],
      history: ['Hypertension'],
    };

    const result = await provider.generateSoapNote(
      '[Doctor]: What brings you in? [Patient]: Severe chest pressure and shortness of breath.',
      extraction,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.subjective).toBe(mockSoapJson.subjective);
    expect(result.objective).toBe(mockSoapJson.objective);
    expect(result.assessment).toBe(mockSoapJson.assessment);
    expect(result.plan).toBe(mockSoapJson.plan);
    expect(result.generatedAt).toBeDefined();
    expect(result.isReviewed).toBe(false);
  });

  it('should strip markdown code fences from Gemini JSON output', async () => {
    const mockOutput = '```json\n{\n  "subjective": "Headache for 2 days",\n  "objective": "Normotensive",\n  "assessment": "Tension headache",\n  "plan": "Hydration and rest"\n}\n```';

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

    const result = await provider.generateSoapNote(
      '[Doctor]: How long have you had the headache? [Patient]: For the past two days.',
    );

    expect(result.subjective).toBe('Headache for 2 days');
    expect(result.objective).toBe('Normotensive');
    expect(result.assessment).toBe('Tension headache');
    expect(result.plan).toBe('Hydration and rest');
  });

  it('should provide normalized fallback note if Gemini returns malformed output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'NOT VALID JSON OUTPUT AT ALL' }],
            },
          },
        ],
      }),
    } as Response);

    const extraction: ClinicalExtraction = {
      symptoms: ['Fever', 'Cough'],
      clinicalFindings: ['Wheezing'],
      vitals: [{ name: 'Temp', value: '38.5', unit: 'C' }],
      currentMedications: ['Acetaminophen'],
      allergies: [],
      history: [],
    };

    const result = await provider.generateSoapNote(
      '[Doctor]: You have fever? [Patient]: Yes, running high fever and coughing.',
      extraction,
    );

    expect(result.subjective).toContain('Fever, Cough');
    expect(result.objective).toContain('38.5 C');
    expect(result.assessment).toBeDefined();
    expect(result.plan).toBeDefined();
    expect(result.isReviewed).toBe(false);
  });

  it('should throw BadGatewayException when Gemini API returns 429 quota error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Quota exceeded for resource',
    } as Response);

    await expect(
      provider.generateSoapNote('[Doctor]: Hello there. [Patient]: Hello doctor, checking in.'),
    ).rejects.toThrow(BadGatewayException);
  });
});
