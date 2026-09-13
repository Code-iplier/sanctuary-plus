import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, BadGatewayException } from '@nestjs/common';
import { GeminiDiagnosisProvider } from './diagnosis.provider';
import type { ClinicalExtraction, SoapNote } from './documentation.types';

describe('GeminiDiagnosisProvider (Phase 6)', () => {
  let provider: GeminiDiagnosisProvider;
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-diagnosis';
    provider = new GeminiDiagnosisProvider();
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
    await expect(provider.suggestDiagnoses('')).rejects.toThrow(
      BadRequestException,
    );
    await expect(provider.suggestDiagnoses('short')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should throw BadRequestException when GEMINI_API_KEY is not configured', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      provider.suggestDiagnoses(
        'Patient presents with severe retrosternal pressure and shortness of breath.',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should synthesize clinical impression and primary/differential diagnoses from Gemini JSON response', async () => {
    const mockOutput = {
      summary: 'Presentation consistent with acute myocardial ischemia vs atypical chest pain.',
      diagnoses: [
        {
          name: 'Acute Coronary Syndrome',
          code: 'I21.9',
          type: 'primary',
          certainty: 'probable',
          supportingEvidence: [
            'Substernal crushing pressure',
            'Radiation to left arm',
            'Diaphoresis',
          ],
          status: 'suggested',
        },
        {
          name: 'Gastroesophageal Reflux Disease',
          code: 'K21.9',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Retrosternal discomfort'],
          status: 'suggested',
        },
      ],
    };

    const mockResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify(mockOutput),
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
      symptoms: ['Chest pressure', 'Shortness of breath'],
      clinicalFindings: ['Diaphoretic'],
      vitals: [{ name: 'BP', value: '150/90', unit: 'mmHg' }],
      currentMedications: ['Aspirin'],
      allergies: [],
      history: ['Hypertension'],
    };

    const soapNote: SoapNote = {
      subjective: 'Reports severe chest pressure.',
      objective: 'BP 150/90, HR 92.',
      assessment: 'Suspected ACS.',
      plan: 'Stat ECG and troponin markers.',
    };

    const result = await provider.suggestDiagnoses(
      '[Doctor]: What is going on? [Patient]: Crushing chest pressure going down my left arm.',
      extraction,
      soapNote,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.summary).toBe(mockOutput.summary);
    expect(result.diagnoses.length).toBe(2);
    expect(result.diagnoses[0].name).toBe('Acute Coronary Syndrome');
    expect(result.diagnoses[0].type).toBe('primary');
    expect(result.diagnoses[0].code).toBe('I21.9');
    expect(result.diagnoses[0].status).toBe('suggested');
    expect(result.diagnoses[1].type).toBe('differential');
  });

  it('should strip markdown code fences from Gemini JSON output', async () => {
    const mockJson = {
      summary: 'Patient has acute bronchitis.',
      diagnoses: [
        {
          name: 'Acute Bronchitis',
          code: 'J20.9',
          type: 'primary',
          certainty: 'probable',
          supportingEvidence: ['Productive cough', 'Rhonchi on exam'],
          status: 'suggested',
        },
      ],
    };

    const fencedOutput = `\`\`\`json\n${JSON.stringify(mockJson)}\n\`\`\``;

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: fencedOutput }],
            },
          },
        ],
      }),
    } as Response);

    const result = await provider.suggestDiagnoses(
      '[Doctor]: Tell me about your cough. [Patient]: Productive cough with yellowish sputum for 5 days.',
    );

    expect(result.diagnoses.length).toBe(1);
    expect(result.diagnoses[0].name).toBe('Acute Bronchitis');
    expect(result.diagnoses[0].code).toBe('J20.9');
  });

  it('should provide normalized fallback impression if Gemini returns malformed output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: 'NON_JSON_MALFORMED_OUTPUT' }],
            },
          },
        ],
      }),
    } as Response);

    const extraction: ClinicalExtraction = {
      symptoms: ['Chest pressure', 'Diaphoresis'],
      clinicalFindings: ['Tachypneic'],
      vitals: [{ name: 'BP', value: '145/90', unit: 'mmHg' }],
      currentMedications: [],
      allergies: [],
      history: ['CAD'],
    };

    const result = await provider.suggestDiagnoses(
      '[Doctor]: Are you experiencing chest pressure? [Patient]: Yes, severe pressure.',
      extraction,
    );

    expect(result.summary).toBeDefined();
    expect(result.diagnoses.length).toBeGreaterThanOrEqual(1);
    expect(result.diagnoses[0].type).toBe('primary');
    expect(result.diagnoses[0].status).toBe('suggested');
  });

  it('should throw BadGatewayException when Gemini API returns 429 quota error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Resource exhausted',
    } as Response);

    await expect(
      provider.suggestDiagnoses(
        '[Doctor]: Hello there. [Patient]: Hello doctor, checking in for routine review.',
      ),
    ).rejects.toThrow(BadGatewayException);
  });
});
