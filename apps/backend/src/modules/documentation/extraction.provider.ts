import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type { ClinicalExtraction, ClinicalVitalSign } from './documentation.types';

export abstract class ExtractionProvider {
  abstract extractClinicalInformation(transcript: string): Promise<ClinicalExtraction>;
}

@Injectable()
export class GeminiExtractionProvider implements ExtractionProvider {
  private readonly logger = new Logger(GeminiExtractionProvider.name);

  async extractClinicalInformation(transcript: string): Promise<ClinicalExtraction> {
    if (!transcript || transcript.trim().length < 10) {
      throw new BadRequestException(
        'Transcript is too short or empty for clinical information extraction',
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
      `Dispatching clinical extraction to Gemini model [${model}] (transcript length: ${transcript.length} chars)`,
    );

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are a clinical NLP extraction specialist. Analyze the following clinical doctor-patient consultation transcript and extract ONLY the clinical facts explicitly mentioned into a structured JSON object.

Transcript:
"""
${transcript}
"""

Strict Rules:
1. Extract ONLY information explicitly present or directly stated in the consultation.
2. Do NOT infer or invent new diagnoses, differential diagnoses, or clinical impressions.
3. Do NOT suggest new prescriptions or medical treatments.
4. Do NOT format as a SOAP note.
5. Return ONLY a valid JSON object with the following schema:
{
  "symptoms": ["string"],
  "clinicalFindings": ["string"],
  "vitals": [
    { "name": "string", "value": "string", "unit": "string" }
  ],
  "currentMedications": ["string"],
  "allergies": ["string"],
  "history": ["string"]
}

Guidelines for fields:
- "symptoms": Patient-reported complaints, pain descriptions, onset, duration (e.g. "severe chest tightness", "dyspnea on exertion").
- "clinicalFindings": Objective clinical signs, physician physical examination observations, or laboratory/diagnostic results mentioned (e.g. "diaphoretic", "rales in lung bases").
- "vitals": Extracted vital signs with name, value, and unit (e.g. name: "Blood Pressure", value: "164/98", unit: "mmHg"; name: "Heart Rate", value: "102", unit: "bpm").
- "currentMedications": Medications the patient is ALREADY taking prior to this encounter (e.g. "Lisinopril 20mg daily").
- "allergies": Documented allergies and reactions (e.g. "Penicillin (severe hives)").
- "history": Past medical conditions, chronic illnesses, or surgical history (e.g. "Hypertension for 5 years").

Output strictly valid JSON. Do not include preamble or conversational remarks.`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
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
      throw new BadGatewayException(
        `Failed to contact Gemini extraction service: ${err.message}`,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `Gemini API returned error ${response.status} ${response.statusText}: ${errorText}`,
      );
      throw new BadGatewayException(
        `Gemini API extraction error (${response.status}): ${errorText || response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
      }>;
    };

    const textCandidate = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!textCandidate) {
      this.logger.warn('Gemini returned an empty candidate for clinical extraction');
      throw new BadGatewayException(
        'Gemini returned an empty response. Clinical entities could not be extracted.',
      );
    }

    // Clean any markdown fences if present
    let rawJson = textCandidate.trim();
    if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawJson);
    } catch (parseError: unknown) {
      const err = parseError as Error;
      this.logger.warn(
        `Failed to parse JSON from Gemini extraction response: ${err.message}. Raw: ${rawJson}`,
      );
      return {
        symptoms: [],
        clinicalFindings: [],
        vitals: [],
        currentMedications: [],
        allergies: [],
        history: [],
        rawExtractionJson: rawJson,
        extractedAt: new Date().toISOString(),
      };
    }

    const symptoms = Array.isArray(parsed.symptoms)
      ? parsed.symptoms.map((s) => String(s)).filter(Boolean)
      : [];

    const clinicalFindings = Array.isArray(parsed.clinicalFindings)
      ? parsed.clinicalFindings.map((f) => String(f)).filter(Boolean)
      : [];

    const currentMedications = Array.isArray(parsed.currentMedications)
      ? parsed.currentMedications.map((m) => String(m)).filter(Boolean)
      : [];

    const allergies = Array.isArray(parsed.allergies)
      ? parsed.allergies.map((a) => String(a)).filter(Boolean)
      : [];

    const history = Array.isArray(parsed.history)
      ? parsed.history.map((h) => String(h)).filter(Boolean)
      : [];

    const vitals: ClinicalVitalSign[] = Array.isArray(parsed.vitals)
      ? parsed.vitals
          .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
          .map((v) => ({
            name: String(v.name || 'Vital Sign'),
            value: String(v.value || ''),
            unit: v.unit ? String(v.unit) : undefined,
          }))
          .filter((v) => v.value.length > 0)
      : [];

    return {
      symptoms,
      clinicalFindings,
      vitals,
      currentMedications,
      allergies,
      history,
      rawExtractionJson: JSON.stringify(parsed, null, 2),
      extractedAt: new Date().toISOString(),
    };
  }
}
