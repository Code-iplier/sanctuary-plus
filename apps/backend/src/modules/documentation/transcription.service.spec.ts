import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, BadGatewayException, NotFoundException } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { GeminiTranscriptionProvider } from './transcription.provider';

describe('AI-Assisted Transcription (Phase 2)', () => {
  let provider: GeminiTranscriptionProvider;
  let service: DocumentationService;
  const originalEnvKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-gemini-key-12345';
    provider = new GeminiTranscriptionProvider();
    service = new DocumentationService(provider);
  });

  afterEach(() => {
    if (originalEnvKey !== undefined) {
      process.env.GEMINI_API_KEY = originalEnvKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    vi.restoreAllMocks();
  });

  describe('GeminiTranscriptionProvider', () => {
    it('should throw BadRequestException when audio payload is empty', async () => {
      await expect(provider.transcribe({})).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when audioBase64 is too short or corrupted', async () => {
      await expect(
        provider.transcribe({ audioBase64: 'abc' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when GEMINI_API_KEY is not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      await expect(
        provider.transcribe({
          audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAA',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should call Gemini Flash API and return real transcription with speaker segments', async () => {
      const mockGeminiResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '[Doctor]: Good morning, can you tell me what happened?\n[Patient]: I had sudden chest pain 2 hours ago.',
                },
              ],
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockGeminiResponse,
      } as Response);

      const result = await provider.transcribe({
        filename: 'consultation.webm',
        audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAA',
        mimeType: 'audio/webm',
        durationSeconds: 42,
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('generativelanguage.googleapis.com');
      expect(calledUrl).toContain('gemini-2.0-flash');
      expect(calledUrl).toContain('key=test-gemini-key-12345');

      expect(result).toBeDefined();
      expect(result.transcript).toContain('[Doctor]: Good morning');
      expect(result.transcript).toContain('[Patient]: I had sudden chest pain');
      expect(result.confidence).toBe(0.95);
      expect(result.durationSeconds).toBe(42);
      expect(result.segments?.length).toBe(2);
      expect(result.segments?.[0].speaker).toBe('Doctor');
      expect(result.segments?.[1].speaker).toBe('Patient');
    });

    it('should throw BadGatewayException when Gemini API returns an HTTP error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => 'API key invalid',
      } as Response);

      await expect(
        provider.transcribe({
          audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAA',
        }),
      ).rejects.toThrow(BadGatewayException);
    });
  });

  describe('DocumentationService transcription workflow', () => {
    it('should transcribe audio and update active encounter with transcript', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: '[Doctor]: Hello, how are you feeling?\n[Patient]: Much better today.',
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

      const response = await service.transcribeAudio('enc-103', {
        filename: 'ed_recording.webm',
        audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAA',
        mimeType: 'audio/webm',
        durationSeconds: 30,
      });

      expect(response.encounterId).toBe('enc-103');
      expect(response.transcript).toContain('[Doctor]: Hello');

      const updatedEncounter = await service.getEncounterById('enc-103');
      expect(updatedEncounter.rawTranscript).toBe(response.transcript);
      expect(updatedEncounter.audioDurationSeconds).toBe(30);
      expect(updatedEncounter.transcriptConfidence).toBe(0.95);
    });

    it('should throw NotFoundException when transcribing a non-existent encounter', async () => {
      await expect(
        service.transcribeAudio('invalid-enc-id', {
          audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAA',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow clinician to edit, review, and persist the transcript', async () => {
      const reviewed = 'Clinician edited note: Confirmed chest pain with left arm radiation.';
      const updated = await service.updateTranscript('enc-101', reviewed, 'doc-jones');

      expect(updated.rawTranscript).toBe(reviewed);
      expect(updated.transcriptReviewed).toBe(true);
      expect(updated.reviewedByClinicianId).toBe('doc-jones');
      expect(updated.status).toBe('reviewed');

      const fetched = await service.getEncounterById('enc-101');
      expect(fetched.rawTranscript).toBe(reviewed);
    });
  });
});
