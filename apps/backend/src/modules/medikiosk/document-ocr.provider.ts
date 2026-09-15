import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export type SupportedDocumentType = 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'IMAGING_REPORT' | 'REFERRAL';

export type OcrResult = {
  documentType: SupportedDocumentType;
  language: string;
  text: string;
  extractedData: Record<string, unknown>;
  confidence: number;
};

const ALLOWED_TYPES: SupportedDocumentType[] = ['LAB_REPORT', 'PRESCRIPTION', 'DISCHARGE_SUMMARY', 'IMAGING_REPORT', 'REFERRAL'];

@Injectable()
export class DocumentOcrProvider {
  private readonly logger = new Logger(DocumentOcrProvider.name);

  async extract(input: { base64: string; mimeType: string; filename: string; requestedType?: SupportedDocumentType }): Promise<OcrResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new ServiceUnavailableException('Document OCR is not configured. Please ask hospital staff for help.');
    const model = process.env.GEMINI_DOCUMENT_MODEL || process.env.GEMINI_EXTRACTION_MODEL || 'gemini-3.1-flash-lite';
    const prompt = `You are a hospital document OCR and clinical-record extraction service. Read this patient-uploaded document exactly. It may be in an Indian language or English.

Return ONLY valid JSON with this schema:
{
  "documentType": "LAB_REPORT|PRESCRIPTION|DISCHARGE_SUMMARY|IMAGING_REPORT|REFERRAL",
  "language": "BCP-47 code when known, otherwise und",
  "text": "verbatim OCR text, retaining uncertainty for unreadable content",
  "extractedData": {
    "summary": "short factual summary",
    "medications": ["only explicitly printed medicines"],
    "allergies": ["only explicitly printed allergies"],
    "findings": ["only explicitly printed findings"],
    "tests": ["only explicitly printed tests/results"],
    "dates": ["only explicitly printed dates"]
  },
  "confidence": 0.0
}

Rules: do not diagnose, do not infer missing medical facts, do not silently correct uncertain handwriting. If a word, dose, or value is unreadable, write "unclear" in text and lower confidence. Classify only among the allowed types. The patient selected ${input.requestedType ?? 'no type'}; use it only if the document supports it.`;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: input.mimeType, data: input.base64 } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' },
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      this.logger.error(`Document OCR request failed (${response.status}): ${detail}`);
      throw new BadGatewayException('We could not read this document. Please try a clearer photo or ask the hospital desk for help.');
    }
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    let raw = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!raw) throw new BadGatewayException('The document reader returned no text. Please try a clearer image or PDF.');
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw) as Record<string, unknown>; } catch { throw new BadGatewayException('The document reader returned an invalid result. Please try again.'); }
    const proposed = String(parsed.documentType ?? input.requestedType ?? 'REFERRAL') as SupportedDocumentType;
    const documentType = ALLOWED_TYPES.includes(proposed) ? proposed : (input.requestedType ?? 'REFERRAL');
    const text = String(parsed.text ?? '').trim();
    if (!text) throw new BadGatewayException('No readable text was found. Please upload a clearer document.');
    return {
      documentType,
      language: String(parsed.language ?? 'und'),
      text,
      extractedData: typeof parsed.extractedData === 'object' && parsed.extractedData !== null && !Array.isArray(parsed.extractedData) ? parsed.extractedData as Record<string, unknown> : { summary: 'No structured details extracted.' },
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    };
  }
}
