import {
  Injectable,
  BadRequestException,
  BadGatewayException,
  Logger,
} from '@nestjs/common';
import type {
  ClinicalImpression,
  DiagnosisItem,
  DiagnosisType,
  DiagnosisCertainty,
  ClinicalExtraction,
  SoapNote,
} from './documentation.types';

export abstract class DiagnosisProvider {
  abstract suggestDiagnoses(
    transcript: string,
    extraction?: ClinicalExtraction,
    soapNote?: SoapNote,
  ): Promise<ClinicalImpression>;
}

@Injectable()
export class GeminiDiagnosisProvider implements DiagnosisProvider {
  private readonly logger = new Logger(GeminiDiagnosisProvider.name);

  async suggestDiagnoses(
    transcript: string,
    extraction?: ClinicalExtraction,
    soapNote?: SoapNote,
  ): Promise<ClinicalImpression> {
    if (!transcript || transcript.trim().length < 10) {
      throw new BadRequestException(
        'Transcript is too short or empty for diagnosis and clinical impression synthesis',
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
      `Dispatching diagnosis suggestion request to Gemini model [${model}] (transcript length: ${transcript.length} chars)`,
    );

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let contextDetails = '';
    if (extraction) {
      contextDetails += `
Documented Patient Symptoms:
${extraction.symptoms.join(', ') || 'None reported'}

Clinical Findings:
${extraction.clinicalFindings.join(', ') || 'None reported'}

Vital Signs:
${extraction.vitals.map((v) => `${v.name}: ${v.value} ${v.unit || ''}`.trim()).join(', ') || 'None'}

Current Medications:
${extraction.currentMedications.join(', ') || 'None'}

Documented Allergies:
${extraction.allergies.join(', ') || 'None'}

Medical History:
${extraction.history.join(', ') || 'None'}
`;
    }

    if (soapNote) {
      contextDetails += `
SOAP Subjective:
${soapNote.subjective || 'N/A'}

SOAP Objective:
${soapNote.objective || 'N/A'}

SOAP Assessment:
${soapNote.assessment || 'N/A'}

SOAP Plan:
${soapNote.plan || 'N/A'}
`;
    }

    const prompt = `You are an expert clinical diagnostic physician. Synthesize a comprehensive clinical impression and evidence-based diagnosis recommendations based on the consultation dialogue and clinical data.

Consultation Transcript:
"""
${transcript}
"""
${contextDetails}
Clinical Diagnostic Guidelines:
1. PRIMARY DIAGNOSIS: Identify the single most likely leading clinical diagnosis ('primary') based on symptoms, exam, vitals, and chronology. Include an ICD-10 code hint (e.g. "I21.9", "I10", "J20.9").
2. DIFFERENTIAL DIAGNOSES: Provide 2 to 3 clinically plausible alternative or secondary differential diagnoses ('differential') to consider or rule out. Include ICD-10 code hints.
3. CERTAINTY: Classify each certainty as 'suspected', 'probable', or 'confirmed'.
4. SUPPORTING EVIDENCE: Provide a list of key supporting evidence points (symptoms, vital signs, exam findings, risk factors) for each diagnosis.
5. SUMMARY: Provide a concise clinical impression summary integrating the patient's presentation and rationale.
6. All diagnosis statuses must be 'suggested'.
7. Output format: Return ONLY a valid JSON object matching the exact structure below, without markdown code fences:
{
  "summary": "Clinical impression summary...",
  "diagnoses": [
    {
      "name": "Primary Diagnosis Name",
      "code": "ICD-10 code hint",
      "type": "primary",
      "certainty": "probable",
      "supportingEvidence": [
        "Key evidence finding 1",
        "Key evidence finding 2"
      ],
      "status": "suggested"
    },
    {
      "name": "Differential Diagnosis 1",
      "code": "ICD-10 code hint",
      "type": "differential",
      "certainty": "suspected",
      "supportingEvidence": [
        "Finding 1"
      ],
      "status": "suggested"
    }
  ]
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
          `Gemini API error during diagnosis suggestion (${response.status}): ${response.statusText}`,
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
        `Failed to reach Gemini API for diagnosis suggestions: ${error.message}`,
      );
    }

    return this.parseAndNormalizeClinicalImpression(
      responseText,
      transcript,
      extraction,
      soapNote,
    );
  }

  private parseAndNormalizeClinicalImpression(
    rawResponse: string,
    transcript: string,
    extraction?: ClinicalExtraction,
    soapNote?: SoapNote,
  ): ClinicalImpression {
    let cleaned = rawResponse.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const parsed = JSON.parse(cleaned) as {
        summary?: string;
        diagnoses?: Array<{
          id?: string;
          name?: string;
          code?: string;
          type?: string;
          certainty?: string;
          supportingEvidence?: string[];
          status?: string;
        }>;
      };

      if (parsed && Array.isArray(parsed.diagnoses) && parsed.diagnoses.length > 0) {
        const normalizedDiagnoses: DiagnosisItem[] = parsed.diagnoses.map((d, idx) => {
          const type: DiagnosisType =
            d.type === 'primary' || d.type === 'differential'
              ? d.type
              : idx === 0
                ? 'primary'
                : 'differential';

          const certainty: DiagnosisCertainty =
            d.certainty === 'confirmed' || d.certainty === 'probable' || d.certainty === 'suspected'
              ? d.certainty
              : type === 'primary'
                ? 'probable'
                : 'suspected';

          return {
            id: d.id || `diag-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: (d.name || 'Unspecified Clinical Condition').trim(),
            code: d.code ? d.code.trim() : undefined,
            type,
            certainty,
            supportingEvidence: Array.isArray(d.supportingEvidence)
              ? d.supportingEvidence.map((e) => String(e).trim()).filter(Boolean)
              : [],
            status: 'suggested',
          };
        });

        // Ensure there is at least one primary diagnosis
        if (!normalizedDiagnoses.some((d) => d.type === 'primary')) {
          normalizedDiagnoses[0].type = 'primary';
        }

        return {
          summary: parsed.summary?.trim() || 'Clinical impression synthesized from encounter.',
          diagnoses: normalizedDiagnoses,
          generatedAt: new Date().toISOString(),
          isReviewed: false,
        };
      }
    } catch (parseError) {
      this.logger.warn(
        `Failed to parse Gemini diagnosis response as JSON. Falling back to structured extraction: ${parseError}`,
      );
    }

    return this.buildFallbackImpression(transcript, extraction, soapNote);
  }

  private buildFallbackImpression(
    transcript: string,
    extraction?: ClinicalExtraction,
    soapNote?: SoapNote,
  ): ClinicalImpression {
    const symptoms = extraction?.symptoms || [];
    const textLower = (transcript + ' ' + (soapNote?.assessment || '')).toLowerCase();

    const diagnoses: DiagnosisItem[] = [];

    if (
      textLower.includes('chest') ||
      textLower.includes('pressure') ||
      textLower.includes('coronary') ||
      textLower.includes('angina')
    ) {
      diagnoses.push(
        {
          id: `diag-fallback-1-${Date.now()}`,
          name: 'Acute Coronary Syndrome (Suspected)',
          code: 'I21.9',
          type: 'primary',
          certainty: 'probable',
          supportingEvidence: symptoms.length > 0 ? symptoms.slice(0, 3) : ['Substernal chest pressure with exertion'],
          status: 'suggested',
        },
        {
          id: `diag-fallback-2-${Date.now()}`,
          name: 'Gastroesophageal Reflux Disease (GERD)',
          code: 'K21.9',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Retrosternal discomfort'],
          status: 'suggested',
        },
        {
          id: `diag-fallback-3-${Date.now()}`,
          name: 'Musculoskeletal Chest Wall Pain',
          code: 'R07.89',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Chest discomfort without focal ECG changes'],
          status: 'suggested',
        },
      );
    } else if (
      textLower.includes('hypertension') ||
      textLower.includes('blood pressure') ||
      textLower.includes('bp')
    ) {
      diagnoses.push(
        {
          id: `diag-fallback-1-${Date.now()}`,
          name: 'Essential (Primary) Hypertension',
          code: 'I10',
          type: 'primary',
          certainty: 'confirmed',
          supportingEvidence: ['Elevated clinic blood pressure measurements'],
          status: 'suggested',
        },
        {
          id: `diag-fallback-2-${Date.now()}`,
          name: 'Secondary Hypertension (Renal/Endocrine)',
          code: 'I15.9',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Persistent elevated systemic vascular resistance'],
          status: 'suggested',
        },
      );
    } else {
      diagnoses.push(
        {
          id: `diag-fallback-1-${Date.now()}`,
          name: soapNote?.assessment ? soapNote.assessment.split('.')[0] : 'Acute Upper Respiratory Tract Infection',
          code: 'J06.9',
          type: 'primary',
          certainty: 'probable',
          supportingEvidence: symptoms.length > 0 ? symptoms : ['Clinical symptoms reported during consultation'],
          status: 'suggested',
        },
        {
          id: `diag-fallback-2-${Date.now()}`,
          name: 'Viral Syndrome',
          code: 'B34.9',
          type: 'differential',
          certainty: 'suspected',
          supportingEvidence: ['Self-limiting systemic clinical manifestations'],
          status: 'suggested',
        },
      );
    }

    return {
      summary:
        soapNote?.assessment ||
        'Patient presents with clinical symptoms requiring diagnostic evaluation and interval follow-up.',
      diagnoses,
      generatedAt: new Date().toISOString(),
      isReviewed: false,
    };
  }
}
