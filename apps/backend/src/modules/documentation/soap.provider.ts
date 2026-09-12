import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type { SoapNote, ClinicalExtraction } from './documentation.types';

export abstract class SoapProvider {
  abstract generateSoapNote(
    transcript: string,
    extraction?: ClinicalExtraction,
  ): Promise<SoapNote>;
}

@Injectable()
export class GeminiSoapProvider implements SoapProvider {
  private readonly logger = new Logger(GeminiSoapProvider.name);

  async generateSoapNote(
    transcript: string,
    extraction?: ClinicalExtraction,
  ): Promise<SoapNote> {
    if (!transcript || transcript.trim().length < 10) {
      throw new BadRequestException(
        'Transcript is too short or empty for SOAP note generation',
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
      `Dispatching SOAP note synthesis to Gemini model [${model}] (transcript length: ${transcript.length} chars)`,
    );

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let extractionContext = '';
    if (extraction) {
      extractionContext = `
Structured Clinical Extraction Context:
- Reported Symptoms: ${extraction.symptoms.join(', ') || 'None'}
- Clinical Findings: ${extraction.clinicalFindings.join(', ') || 'None'}
- Vital Signs: ${extraction.vitals.map((v) => `${v.name}: ${v.value} ${v.unit || ''}`.trim()).join(', ') || 'None'}
- Current Medications: ${extraction.currentMedications.join(', ') || 'None'}
- Allergies: ${extraction.allergies.join(', ') || 'NKDA'}
- Medical History: ${extraction.history.join(', ') || 'None'}
`;
    }

    const prompt = `You are a clinical documentation specialist. Synthesize the following doctor-patient consultation transcript and structured extraction into a standardized medical SOAP clinical progress note.

Transcript:
"""
${transcript}
"""
${extractionContext}
Strict Clinical Documentation Instructions:
1. Subjective (S): Document the patient's chief complaint, history of present illness, symptom chronology, severity, and functional impact as reported by the patient.
2. Objective (O): Document physical exam observations, vital signs, physical state, and verifiable clinical measurements mentioned in the encounter.
3. Assessment (A): Synthesize the clinical evaluation and condition status directly discussed during this encounter. Do NOT invent new hypothetical diagnoses; document the clinician's documented clinical appraisal.
4. Plan (P): Document the care plan discussed, existing medications continued, laboratory/diagnostic tests ordered, lifestyle counseling, warning signs, and follow-up timeline.
5. Strict output format: Return ONLY a valid JSON object without markdown fences, matching exactly:
{
  "subjective": "Clinical text for Subjective section...",
  "objective": "Clinical text for Objective section...",
  "assessment": "Clinical text for Assessment section...",
  "plan": "Clinical text for Plan section..."
}`;

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
          `Gemini API error during SOAP generation (${response.status}): ${response.statusText}`,
        );
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };
      const rawText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      responseText = rawText;
    } catch (err: unknown) {
      if (err instanceof BadGatewayException || err instanceof BadRequestException) {
        throw err;
      }
      const error = err as Error;
      this.logger.error(`Network or fetch error calling Gemini API: ${error.message}`);
      throw new BadGatewayException(
        `Failed to reach Gemini API for SOAP generation: ${error.message}`,
      );
    }

    return this.parseAndNormalizeSoapResponse(responseText, transcript, extraction);
  }

  private parseAndNormalizeSoapResponse(
    rawResponse: string,
    transcript: string,
    extraction?: ClinicalExtraction,
  ): SoapNote {
    const now = new Date().toISOString();
    let cleaned = (rawResponse || '').trim();

    // Strip markdown code fences if present
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    if (!cleaned) {
      this.logger.warn('Gemini returned empty text, creating fallback SOAP note from transcript');
      return this.generateFallbackSoapNote(transcript, extraction, now);
    }

    try {
      const parsed = JSON.parse(cleaned);

      const subjective =
        typeof parsed.subjective === 'string' && parsed.subjective.trim().length > 0
          ? parsed.subjective.trim()
          : extraction?.symptoms?.length
            ? `Patient presents with: ${extraction.symptoms.join(', ')}.`
            : 'Patient presents for clinical consultation.';

      const objective =
        typeof parsed.objective === 'string' && parsed.objective.trim().length > 0
          ? parsed.objective.trim()
          : extraction?.vitals?.length
            ? `Vitals: ${extraction.vitals.map((v) => `${v.name}: ${v.value} ${v.unit || ''}`.trim()).join('; ')}`
            : 'Vital signs and physical exam reviewed during consultation.';

      const assessment =
        typeof parsed.assessment === 'string' && parsed.assessment.trim().length > 0
          ? parsed.assessment.trim()
          : 'Clinical status evaluated during encounter based on reported symptoms and findings.';

      const plan =
        typeof parsed.plan === 'string' && parsed.plan.trim().length > 0
          ? parsed.plan.trim()
          : 'Continue current supportive management and follow-up as clinically indicated.';

      return {
        subjective,
        objective,
        assessment,
        plan,
        generatedAt: now,
        isReviewed: false,
      };
    } catch (parseError: unknown) {
      const error = parseError as Error;
      this.logger.warn(
        `Failed to parse JSON response from Gemini for SOAP note (${error.message}). Using normalized fallback.`,
      );
      return this.generateFallbackSoapNote(transcript, extraction, now);
    }
  }

  private generateFallbackSoapNote(
    transcript: string,
    extraction?: ClinicalExtraction,
    timestamp?: string,
  ): SoapNote {
    const subjective = extraction?.symptoms?.length
      ? `Patient reports symptoms including: ${extraction.symptoms.join(', ')}.`
      : `Patient presented for clinical evaluation. Transcript summary: ${transcript.slice(0, 150)}...`;

    const objective = extraction?.vitals?.length
      ? `Vitals documented: ${extraction.vitals.map((v) => `${v.name}: ${v.value} ${v.unit || ''}`.trim()).join(', ')}.\nClinical findings: ${extraction.clinicalFindings.join(', ') || 'Exam performed as documented.'}`
      : 'Physical examination and vital signs assessed during encounter.';

    const assessment = extraction?.clinicalFindings?.length
      ? `Clinical assessment based on noted symptoms (${extraction.symptoms.join(', ') || 'reported'}) and findings (${extraction.clinicalFindings.join(', ')}).`
      : 'Clinical assessment completed based on consultation dialogue.';

    const plan = extraction?.currentMedications?.length
      ? `Continue current medications: ${extraction.currentMedications.join(', ')}. Follow up if symptoms worsen.`
      : 'Maintain ongoing clinical care and follow-up as discussed.';

    return {
      subjective,
      objective,
      assessment,
      plan,
      generatedAt: timestamp || new Date().toISOString(),
      isReviewed: false,
    };
  }
}
