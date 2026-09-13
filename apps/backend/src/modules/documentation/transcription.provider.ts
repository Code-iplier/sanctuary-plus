import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type { TranscriptionSegment } from './documentation.types';

export interface TranscriptionResult {
  transcript: string;
  language: string;
  durationSeconds: number;
  confidence: number;
  segments?: TranscriptionSegment[];
}

export interface TranscribeOptions {
  audioBase64?: string;
  filename?: string;
  mimeType?: string;
  durationSeconds?: number;
  encounterType?: string;
  patientId?: string;
}

export abstract class TranscriptionProvider {
  abstract transcribe(options: TranscribeOptions): Promise<TranscriptionResult>;
}

@Injectable()
export class GeminiTranscriptionProvider implements TranscriptionProvider {
  private readonly logger = new Logger(GeminiTranscriptionProvider.name);

  async transcribe(options: TranscribeOptions): Promise<TranscriptionResult> {
    if (!options.audioBase64 || options.audioBase64.trim().length === 0) {
      throw new BadRequestException('Empty audio payload provided for transcription');
    }

    let cleanBase64 = options.audioBase64.trim();
    // Strip data URI prefix if present (e.g., data:audio/webm;base64,...)
    if (cleanBase64.startsWith('data:')) {
      const commaIndex = cleanBase64.indexOf(',');
      if (commaIndex !== -1) {
        cleanBase64 = cleanBase64.substring(commaIndex + 1);
      }
    }

    if (cleanBase64.length < 32) {
      throw new BadRequestException(
        'Audio file contains no playable data (empty or corrupted)',
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY environment variable is not configured');
      throw new BadRequestException(
        'GEMINI_API_KEY is not configured on the server. Please configure GEMINI_API_KEY in the backend environment to enable real AI transcription.',
      );
    }

    const mimeType = (options.mimeType || 'audio/webm').split(';')[0].trim();
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const duration = options.durationSeconds && options.durationSeconds > 0
      ? Math.round(options.durationSeconds)
      : Math.max(1, Math.round((cleanBase64.length * 3) / 4 / 16000));

    this.logger.log(
      `Dispatching audio to Gemini model [${model}] for clinical transcription (mime: ${mimeType}, duration: ~${duration}s)`,
    );

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are an expert clinical medical transcriptionist. Listen carefully to this clinical consultation audio and provide an accurate, verbatim transcription.
Distinguish speakers using the format:
[Doctor]: <dialogue>
[Patient]: <dialogue>
If additional speakers are present (e.g. [Nurse], [Family]), label them accurately.
Preserve exact medical terminology, symptoms, dosages, and drug names.
Do not include conversational preamble, introductory remarks, or markdown code fences; output only the transcript dialogue.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
      },
    };

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (networkError: unknown) {
      const err = networkError as Error;
      this.logger.error(`Network error contacting Gemini API: ${err.message}`, err.stack);
      throw new BadGatewayException(`Failed to contact Gemini transcription service: ${err.message}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Gemini API returned error ${response.status} ${response.statusText}: ${errorText}`,
      );
      throw new BadGatewayException(
        `Gemini API transcription error (${response.status}): ${errorText || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        finishReason?: string;
      }>;
    };

    const textCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!textCandidate) {
      this.logger.warn('Gemini returned an empty candidate or audio could not be transcribed');
      throw new BadGatewayException(
        'Gemini returned an empty response. Audio could not be transcribed or was inaudible.',
      );
    }

    // Parse into speaker segments if [Speaker]: tags are present
    const segments: TranscriptionSegment[] = [];
    const lines = textCandidate.split(/\r?\n+/);
    let currentSpeaker = 'Speaker';
    let currentText = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const speakerMatch = trimmed.match(/^\[([A-Za-z0-9_\s]+)\]:\s*(.*)$/);
      if (speakerMatch) {
        if (currentText) {
          segments.push({ speaker: currentSpeaker, text: currentText.trim() });
        }
        currentSpeaker = speakerMatch[1];
        currentText = speakerMatch[2];
      } else {
        currentText = currentText ? `${currentText} ${trimmed}` : trimmed;
      }
    }
    if (currentText) {
      segments.push({ speaker: currentSpeaker, text: currentText.trim() });
    }

    return {
      transcript: textCandidate,
      language: 'en-US',
      durationSeconds: duration,
      confidence: 0.95,
      segments: segments.length > 0 ? segments : undefined,
    };
  }
}
