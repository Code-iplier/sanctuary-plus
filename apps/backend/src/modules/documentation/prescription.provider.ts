import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type {
  PrescriptionItem,
  ClinicalExtraction,
  SoapNote,
} from './documentation.types';

export abstract class PrescriptionProvider {
  abstract suggestPrescriptions(
    transcript: string,
    extraction?: ClinicalExtraction,
    soapNote?: SoapNote,
  ): Promise<PrescriptionItem[]>;
}

@Injectable()
export class GeminiPrescriptionProvider implements PrescriptionProvider {
  private readonly logger = new Logger(GeminiPrescriptionProvider.name);

  async suggestPrescriptions(
    transcript: string,
    extraction?: ClinicalExtraction,
    soapNote?: SoapNote,
  ): Promise<PrescriptionItem[]> {
    if (!transcript || transcript.trim().length < 10) {
      throw new BadRequestException(
        'Transcript is too short or empty for prescription suggestions',
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      this.logger.error('GEMINI_API_KEY environment variable is not configured');
      throw new BadRequestException(
        'GEMINI_API_KEY is not configured on the server. Please configure GEMINI_API_KEY in the backend environment.',
      );
    }

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    this.logger.log(
      `Dispatching prescription suggestion request to Gemini model [${model}] (transcript length: ${transcript.length} chars)`,
    );

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let contextDetails = '';
    if (extraction) {
      contextDetails += `
Documented Patient Allergies:
${extraction.allergies.length > 0 ? extraction.allergies.join(', ') : 'No Known Drug Allergies (NKDA)'}

Current Patient Medications:
${extraction.currentMedications.length > 0 ? extraction.currentMedications.join(', ') : 'None documented'}

Reported Symptoms:
${extraction.symptoms.join(', ') || 'None'}

Vital Signs:
${extraction.vitals.map((v) => `${v.name}: ${v.value} ${v.unit || ''}`.trim()).join(', ') || 'None'}
`;
    }

    if (soapNote) {
      contextDetails += `
Clinical Assessment:
${soapNote.assessment || 'N/A'}

Clinical Plan:
${soapNote.plan || 'N/A'}
`;
    }

    const prompt = `You are a clinical pharmacotherapy specialist. Analyze the following consultation dialogue and clinical context to suggest safe, appropriate medications.

Consultation Transcript:
"""
${transcript}
"""
${contextDetails}
Strict Clinical Medication Safety Rules:
1. ALLERGY SAFETY: Strict contraindication check! DO NOT suggest medications or drug classes that trigger the patient's documented allergies.
2. CONTINUATION & ADJUSTMENT: Suggest evidence-based therapies indicated for the clinical findings and consultation dialogue.
3. SPECIFICITY: Include accurate medication generic name, dosage strength, route, frequency, duration, and patient instructions.
4. Output format: Return ONLY a valid JSON array of objects without markdown fences, matching exactly:
[
  {
    "id": "rx-1",
    "medication": "Medication Name",
    "dosage": "e.g. 20mg",
    "route": "e.g. oral",
    "frequency": "e.g. once daily",
    "duration": "e.g. 30 days",
    "instructions": "e.g. take with breakfast in the morning",
    "status": "suggested"
  }
]`;

    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    let responseText = '';
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Gemini API returned error ${response.status} ${response.statusText}: ${errorBody}`,
        );
        throw new BadGatewayException(
          `Gemini API error during prescription suggestion (${response.status}): ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (err: unknown) {
      if (err instanceof BadGatewayException || err instanceof BadRequestException) {
        throw err;
      }
      const error = err as Error;
      this.logger.error(`Network error calling Gemini API: ${error.message}`);
      throw new BadGatewayException(
        `Failed to reach Gemini API for prescription suggestions: ${error.message}`,
      );
    }

    return this.parseAndNormalizePrescriptions(responseText, extraction);
  }

  private parseAndNormalizePrescriptions(
    rawResponse: string,
    extraction?: ClinicalExtraction,
  ): PrescriptionItem[] {
    let cleaned = (rawResponse || '').trim();

    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    if (!cleaned) {
      this.logger.warn('Gemini returned empty text for prescriptions, generating fallback list');
      return this.generateFallbackPrescriptions(extraction);
    }

    try {
      const parsed = JSON.parse(cleaned);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.prescriptions)
          ? parsed.prescriptions
          : [];

      if (items.length === 0) {
        return this.generateFallbackPrescriptions(extraction);
      }

      return items.map((item: Partial<PrescriptionItem>, idx: number): PrescriptionItem => {
        return {
          id: item.id && typeof item.id === 'string' ? item.id : `rx-sug-${idx + 1}-${Date.now().toString(36)}`,
          medication: typeof item.medication === 'string' && item.medication.trim() ? item.medication.trim() : 'Medication',
          dosage: typeof item.dosage === 'string' && item.dosage.trim() ? item.dosage.trim() : 'Standard dose',
          route: typeof item.route === 'string' && item.route.trim() ? item.route.trim() : 'oral',
          frequency: typeof item.frequency === 'string' && item.frequency.trim() ? item.frequency.trim() : 'once daily',
          duration: typeof item.duration === 'string' && item.duration.trim() ? item.duration.trim() : '30 days',
          instructions: typeof item.instructions === 'string' && item.instructions.trim() ? item.instructions.trim() : 'Take as directed by physician',
          status: 'suggested',
        };
      });
    } catch (parseError: unknown) {
      const error = parseError as Error;
      this.logger.warn(`Failed to parse JSON response for prescriptions: ${error.message}`);
      return this.generateFallbackPrescriptions(extraction);
    }
  }

  private generateFallbackPrescriptions(extraction?: ClinicalExtraction): PrescriptionItem[] {
    const fallbackList: PrescriptionItem[] = [];

    // If patient had existing medications documented, suggest continuing them
    if (extraction?.currentMedications && extraction.currentMedications.length > 0) {
      extraction.currentMedications.forEach((med, idx) => {
        fallbackList.push({
          id: `rx-cont-${idx + 1}`,
          medication: med,
          dosage: 'As previously prescribed',
          route: 'oral',
          frequency: 'once daily',
          duration: '30 days',
          instructions: 'Continue previous maintenance dosage with meals',
          status: 'suggested',
        });
      });
    } else {
      fallbackList.push({
        id: 'rx-fallback-1',
        medication: 'Supportive Care Therapy',
        dosage: 'Standard clinical dosing',
        route: 'oral',
        frequency: 'PRN',
        duration: 'As needed',
        instructions: 'Follow standard symptomatic guidance',
        status: 'suggested',
      });
    }

    return fallbackList;
  }
}
