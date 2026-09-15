import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { TranscriptionProvider } from '../documentation/transcription.provider';
import { ExtractionProvider } from '../documentation/extraction.provider';
import { DiagnosisProvider } from '../documentation/diagnosis.provider';
import type { AuthUser } from '../../auth/auth.types';
import type {
  CreateKioskSessionInput,
  ClinicalFactReviewInput,
  ConsultationUpdateInput,
  FinalizeConsultationInput,
  ReportUpdateInput,
  StateUpdateInput,
  TranscriptInput,
  TranscribeConsultationInput,
  FinalizePatientReportInput,
} from './medikiosk.types';
import type { Prisma } from '@prisma/client';
import { createMediKioskPdf } from './medikiosk.pdf';
import { assessMediKioskReport } from './medikiosk.triage';
import { QueueService } from '../../queue/queue.service';
import { DocumentOcrProvider, type SupportedDocumentType } from './document-ocr.provider';
import { recommendDepartmentExtension } from './medikiosk.extensions';
import { coreAnswerComplete, isLanguagePreferenceRequest, missingCoreDetail, supplementStateFromPatientText } from './medikiosk.intake';

const DEFAULT_LIVE_MODEL = 'gemini-3.1-flash-live-preview';
const CORE_INTAKE_QUESTIONS = [
  'What is the main problem that brings you to the hospital today?',
  'How long has it been going on?',
  'Do you have any known medical conditions, previous major illnesses, hospitalizations, or surgeries?',
  'What medicines are you taking or have recently taken, and do you have any medicine or food allergies or reactions?',
  'Is there any relevant family medical history or lifestyle information, such as smoking, tobacco, alcohol, occupation, diet, or activity, that your doctor should know?',
  'Is there any other important medical information you want your doctor to know?',
] as const;
const CLINICAL_DOCUMENT_SUMMARY_SELECT = {
  id: true, encounterId: true, documentType: true, title: true, sourceOrganization: true, sourceSystem: true,
  documentNumber: true, documentDate: true, receivedAt: true, language: true, mimeType: true, originalFilename: true,
  status: true, documentText: true, extractedData: true, provenance: true,
} as const;
@Injectable()
export class MedikioskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly transcriptionProvider: TranscriptionProvider,
    private readonly extractionProvider: ExtractionProvider,
    private readonly diagnosisProvider: DiagnosisProvider,
    private readonly queueService: QueueService,
    private readonly documentOcr: DocumentOcrProvider,
  ) {}

  private triageMode(): 'SHADOW' | 'ACTIVE' {
    return this.config.get<string>('MEDIKIOSK_TRIAGE_MODE')?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'SHADOW';
  }

  private async handleTriageDecision(user: AuthUser, encounterId: string, patientId: string, triage: ReturnType<typeof assessMediKioskReport>) {
    triage.mode = this.triageMode();
    triage.departmentExtension = recommendDepartmentExtension({ possibleConditions: triage.possibleConditions, redFlags: triage.redFlags }, triage.priority);
    if (triage.mode === 'ACTIVE') {
      await Promise.resolve().then(() => this.queueService.applyAutomatedTriage(encounterId, { triageLevel: triage.priority, priorityScore: triage.score }));
      return;
    }
    await this.audit(user, patientId, 'TRIAGE_SHADOW_RECORDED', 'Encounter', encounterId, {
      priority: triage.priority,
      score: triage.score,
      reason: triage.reason,
      redFlags: triage.redFlags,
      ruleSet: 'medikiosk-deterministic-safety-v1',
      mode: 'SHADOW',
    });
  }

  private resolvePatientId(user: AuthUser, requested?: string): string {
    if (user.role === 'patient') {
      if (!user.patientId) throw new ForbiddenException('Patient identity is missing');
      if (requested && requested !== user.patientId) {
        throw new ForbiddenException('Patients may only access their own records');
      }
      return user.patientId;
    }
    if (!requested?.trim()) throw new BadRequestException('patientId is required for staff access');
    return requested.trim();
  }

  async createSession(user: AuthUser, input: CreateKioskSessionInput) {
    const patientId = this.resolvePatientId(user, input.patientId);
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: input.encounterId, patientId },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');

    if (!input.fresh) {
      const existing = await this.prisma.kioskSession.findFirst({
        where: { encounterId: encounter.id, status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: { createdAt: 'desc' },
        include: { transcript: { orderBy: { occurredAt: 'asc' } } },
      });
      if (existing) return existing;
    } else {
      // A patient explicitly starting a new intake must never inherit the
      // transcript or state of a prior interrupted attempt. Keep the old
      // record for audit/history, but make it non-resumable.
      await this.prisma.kioskSession.updateMany({
        where: { encounterId: encounter.id, status: { in: ['ACTIVE', 'PAUSED'] } },
        data: { status: 'ABANDONED' },
      });
    }

    const created = await this.prisma.kioskSession.create({
      data: { patientId, encounterId: encounter.id },
      include: { transcript: { orderBy: { occurredAt: 'asc' } } },
    });
    await this.audit(user, patientId, 'KIOSK_STARTED', 'KioskSession', created.id, { encounterId: encounter.id });
    return created;
  }

  async getSession(user: AuthUser, sessionId: string) {
    const session = await this.prisma.kioskSession.findUnique({
      where: { id: sessionId },
      include: { transcript: { orderBy: { occurredAt: 'asc' } }, facts: true, report: true, encounter: { include: { patient: true } } },
    });
    if (!session) throw new NotFoundException('MediKiosk session not found');
    this.assertAccess(user, session.patientId);
    if (user.role !== 'patient' || !session.report || !session.report.report || typeof session.report.report !== 'object' || Array.isArray(session.report.report)) {
      return session;
    }
    const { clinicianTriage: _hiddenTriage, ...patientReport } = session.report.report as Record<string, unknown>;
    return { ...session, report: { ...session.report, report: patientReport as Prisma.JsonObject } };
  }

  async appendTranscript(user: AuthUser, sessionId: string, input: TranscriptInput) {
    const session = await this.getSession(user, sessionId);
    if (!input.text?.trim()) throw new BadRequestException('Transcript text is required');
    return this.prisma.transcriptEntry.create({
      data: {
        kioskSessionId: session.id,
        speaker: input.speaker,
        text: input.text.trim(),
        ...(input.occurredAt ? { occurredAt: new Date(input.occurredAt) } : {}),
      },
    });
  }

  async updateState(user: AuthUser, sessionId: string, input: StateUpdateInput) {
    const session = await this.getSession(user, sessionId);
    const currentQuestionIndex = Math.max(0, Math.min(6, session.questionIndex));
    if (typeof input.questionIndex !== 'number' || input.questionIndex !== currentQuestionIndex) {
      throw new BadRequestException(`This intake is on core question ${Math.min(currentQuestionIndex + 1, 6)}. Do not repeat or skip a completed question.`);
    }
    const currentState = session.clinicalState && typeof session.clinicalState === 'object' && !Array.isArray(session.clinicalState)
      ? session.clinicalState as Record<string, unknown>
      : {};
    const latestPatientTranscript = session.transcript
      .filter((entry) => entry.speaker === 'PATIENT')
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())[0];
    const languagePreferenceRequest = isLanguagePreferenceRequest(latestPatientTranscript?.text ?? '');
    const stateWithModelFacts = input.clinicalState ? { ...currentState, ...input.clinicalState } : currentState;
    // Onset is commonly spoken in the answer to question 1 and omitted from the
    // model's tool payload. Preserve the patient's exact wording so question 2
    // cannot be repeated just because classification lagged behind speech.
    const mergedState = supplementStateFromPatientText(stateWithModelFacts, currentQuestionIndex, latestPatientTranscript?.text ?? '');
    const missingDetail = missingCoreDetail(currentQuestionIndex, mergedState);
    const accepted = coreAnswerComplete(currentQuestionIndex, mergedState, latestPatientTranscript?.text ?? '')
      && (input.answerAccepted === true || Boolean(missingDetail === null));
    if (!accepted && !missingDetail) {
      throw new BadRequestException('The answer is incomplete. Record the single missing clinical detail before asking a follow-up question.');
    }
    const followUpLimitReached = !accepted && session.followUpCount >= 3;
    let nextQuestionIndex = currentQuestionIndex;
    if (accepted || followUpLimitReached) {
      nextQuestionIndex = Math.min(6, currentQuestionIndex + 1);
      // A patient may answer a later core item spontaneously. Never ask for
      // the same information again; move to the next genuinely unanswered
      // fixed question while preserving the six-question schema in the report.
      while (nextQuestionIndex < CORE_INTAKE_QUESTIONS.length && missingCoreDetail(nextQuestionIndex, mergedState) === null) {
        nextQuestionIndex += 1;
      }
    }
    // Asking to change language is a usability request, not an unanswered
    // medical detail. Do not spend one of the patient's three follow-ups on it.
    const nextFollowUpCount = accepted || followUpLimitReached || languagePreferenceRequest
      ? session.followUpCount
      : session.followUpCount + 1;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.kioskSession.update({
        where: { id: session.id },
        data: {
          currentStage: nextQuestionIndex >= 6 ? 'VERIFICATION' : (input.currentStage ?? session.currentStage),
          questionIndex: nextQuestionIndex,
          followUpCount: nextFollowUpCount,
          clinicalState: mergedState as Prisma.InputJsonValue,
          ...(input.safetySignals
            ? { safetySignals: input.safetySignals as Prisma.InputJsonValue }
            : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
        },
      });
      if (Object.keys(mergedState).length > 0 && (accepted || followUpLimitReached)) {
        const sourceTranscript = latestPatientTranscript
          ? await tx.transcriptEntry.findUnique({ where: { id: latestPatientTranscript.id } })
          : null;
        await tx.clinicalFact.createMany({
          data: Object.entries(mergedState)
            .filter(([key, value]) => JSON.stringify(currentState[key]) !== JSON.stringify(value))
            .map(([key, value]) => ({
            kioskSessionId: session.id,
            key,
            value: value as Prisma.InputJsonValue,
            provenance: 'PATIENT_REPORTED' as const,
            transcriptEntryId: sourceTranscript?.id,
            sourceLanguage: input.factEvidence?.[key]?.language?.trim() || undefined,
            extractionConfidence: typeof input.factEvidence?.[key]?.confidence === 'number'
              ? Math.max(0, Math.min(1, input.factEvidence[key].confidence))
              : undefined,
          })),
        });
      }
      return {
        ...updated,
        interview: {
          currentQuestionIndex: nextQuestionIndex,
          nextQuestionText: nextQuestionIndex < CORE_INTAKE_QUESTIONS.length ? CORE_INTAKE_QUESTIONS[nextQuestionIndex] : null,
          followUpQuestionText: !accepted && !followUpLimitReached && missingDetail
            ? languagePreferenceRequest
              ? CORE_INTAKE_QUESTIONS[currentQuestionIndex]
              : `Please tell me only this: ${missingDetail}.`
            : null,
          missingDetail: accepted ? null : missingDetail,
          followUpCount: nextFollowUpCount,
          shouldAdvance: accepted || followUpLimitReached,
          followUpAllowed: !accepted && !followUpLimitReached,
            instruction: followUpLimitReached
              ? 'Follow-up limit reached. Record the missing detail as unknown and move to the next fixed core question.'
              : accepted
              ? 'Answer accepted. Do not repeat this core question. Ask the next unanswered fixed core question exactly once.'
              : 'Answer is incomplete. Ask exactly one follow-up for the recorded missing detail. Do not ask any other question or repeat a question already answered; then call this tool again with the same core question index.',
        },
      };
    });
  }

  async reviewClinicalFact(user: AuthUser, sessionId: string, factId: string, input: ClinicalFactReviewInput) {
    if (user.role !== 'staff') throw new ForbiddenException('Only clinical staff can review intake facts');
    if (!['ACCEPTED', 'REJECTED', 'UNCERTAIN'].includes(input.status)) throw new BadRequestException('Choose accepted, rejected, or uncertain.');
    const fact = await this.prisma.clinicalFact.findFirst({
      where: { id: factId, kioskSessionId: sessionId },
      include: { kioskSession: true },
    });
    if (!fact) throw new NotFoundException('Clinical fact not found');
    this.assertAccess(user, fact.kioskSession.patientId);
    const correctedValue = input.correctedValue === undefined || input.correctedValue === null || input.correctedValue === ''
      ? undefined
      : input.correctedValue as Prisma.InputJsonValue;
    const reviewedAt = new Date();
    const updated = await this.prisma.clinicalFact.update({
      where: { id: fact.id },
      data: {
        reviewStatus: input.status,
        ...(correctedValue === undefined ? {} : { correctedValue }),
        reviewedAt,
        reviewedBy: user.displayName ?? user.username ?? user.sub,
        ...(input.status === 'ACCEPTED' ? { clinicianConfirmedAt: reviewedAt, clinicianConfirmedBy: user.displayName ?? user.username ?? user.sub } : {}),
      },
      include: { transcriptEntry: true },
    });
    await this.audit(user, fact.kioskSession.patientId, `CLINICAL_FACT_${input.status}`, 'ClinicalFact', fact.id, { sessionId, corrected: correctedValue !== undefined });
    return updated;
  }

  async uploadPatientDocument(user: AuthUser, input: import('./medikiosk.types').UploadPatientDocumentInput) {
    const patientId = this.resolvePatientId(user);
    const filename = input.filename?.trim();
    if (!filename || !input.dataBase64?.trim()) throw new BadRequestException('Choose a document before uploading.');
    const mimeType = input.mimeType?.toLowerCase();
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw new BadRequestException('Upload a PDF, JPG, PNG, or WEBP document.');
    }
    const binaryData = Buffer.from(input.dataBase64, 'base64');
    if (!binaryData.length || binaryData.length > 10 * 1024 * 1024) throw new BadRequestException('Document must be between 1 byte and 10 MB.');
    const encounter = input.encounterId
      ? await this.prisma.encounter.findFirst({ where: { id: input.encounterId, patientId } })
      : await this.prisma.encounter.findFirst({ where: { patientId }, orderBy: { createdAt: 'desc' } });
    if (input.encounterId && !encounter) throw new NotFoundException('Active patient visit not found.');
    const ocr = await this.documentOcr.extract({
      base64: input.dataBase64,
      mimeType,
      filename,
      requestedType: input.documentType as SupportedDocumentType | undefined,
    });
    const document = await this.prisma.clinicalDocument.create({
      data: {
        id: `DOC-UPL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        patientId,
        encounterId: encounter?.id,
        documentType: ocr.documentType,
        title: filename,
        sourceOrganization: 'Patient upload',
        sourceSystem: 'MediKiosk Patient Portal',
        documentDate: new Date(),
        language: ocr.language,
        mimeType,
        originalFilename: filename,
        binaryData,
        status: 'OCR_REVIEWED',
        documentText: ocr.text,
        extractedData: ocr.extractedData as Prisma.InputJsonValue,
        provenance: {
          source: 'PATIENT_UPLOADED_DOCUMENT',
          extraction: 'AI_OCR',
          confidence: ocr.confidence,
          uploadedAt: new Date().toISOString(),
          requiresClinicianReview: true,
        } as Prisma.InputJsonValue,
      },
    });
    await this.audit(user, patientId, 'PATIENT_DOCUMENT_UPLOADED', 'ClinicalDocument', document.id, { filename, documentType: document.documentType });
    const { binaryData: _binaryData, ...visible } = document;
    return visible;
  }

  async listPatientDocuments(user: AuthUser, patientId: string) {
    this.assertPatientOrStaff(user, patientId);
    return this.prisma.clinicalDocument.findMany({
      where: { patientId }, orderBy: { documentDate: 'desc' },
      select: { id: true, encounterId: true, documentType: true, title: true, sourceOrganization: true, sourceSystem: true, documentNumber: true, documentDate: true, receivedAt: true, language: true, mimeType: true, originalFilename: true, status: true, documentText: true, extractedData: true, provenance: true },
    });
  }

  async getDocumentContent(user: AuthUser, documentId: string) {
    const document = await this.prisma.clinicalDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found.');
    this.assertAccess(user, document.patientId);
    if (!document.binaryData) throw new NotFoundException('The original file is not available for this imported record.');
    return { data: Buffer.from(document.binaryData), mimeType: document.mimeType, filename: document.originalFilename ?? document.title };
  }

  async confirmPatientDocumentExtraction(user: AuthUser, documentId: string, extractedData: Record<string, unknown>) {
    if (user.role !== 'patient') throw new ForbiddenException('Only the patient can confirm uploaded document details.');
    const document = await this.prisma.clinicalDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found.');
    this.assertAccess(user, document.patientId);
    const provenance = document.provenance && typeof document.provenance === 'object' && !Array.isArray(document.provenance) ? document.provenance as Record<string, unknown> : {};
    const updated = await this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: { extractedData: extractedData as Prisma.InputJsonValue, provenance: { ...provenance, patientConfirmedAt: new Date().toISOString() } as Prisma.InputJsonValue },
    });
    await this.audit(user, document.patientId, 'PATIENT_CONFIRMED_DOCUMENT_EXTRACTION', 'ClinicalDocument', documentId, extractedData as Prisma.InputJsonValue);
    const { binaryData: _binaryData, ...visible } = updated;
    return visible;
  }

  async reviewDocument(user: AuthUser, documentId: string) {
    this.assertStaff(user);
    const document = await this.prisma.clinicalDocument.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document not found.');
    const provenance = document.provenance && typeof document.provenance === 'object' && !Array.isArray(document.provenance) ? document.provenance as Record<string, unknown> : {};
    const updated = await this.prisma.clinicalDocument.update({
      where: { id: documentId },
      data: { status: 'CLINICIAN_VERIFIED', provenance: { ...provenance, clinicianReviewedAt: new Date().toISOString(), clinicianReviewedBy: user.sub } as Prisma.InputJsonValue },
    });
    await this.audit(user, document.patientId, 'CLINICIAN_REVIEWED_DOCUMENT', 'ClinicalDocument', documentId);
    const { binaryData: _binaryData, ...visible } = updated;
    return visible;
  }

  async issueLiveToken(user: AuthUser, sessionId: string) {
    const session = await this.getSession(user, sessionId);
    if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
      throw new BadRequestException('This MediKiosk session is no longer active');
    }

    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_LIVE_MODEL') || DEFAULT_LIVE_MODEL;
    const useEphemeral = this.config.get<string>('MEDIKIOSK_USE_EPHEMERAL_TOKENS', 'true') !== 'false';
    if (!apiKey) throw new ServiceUnavailableException('Gemini Live is not configured');
    if (!useEphemeral) {
      throw new ServiceUnavailableException('Permanent browser credentials are disabled for MediKiosk');
    }

    const expireTime = new Date(Date.now() + 30 * 60_000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60_000).toISOString();
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/auth_tokens', {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        uses: 1,
        expireTime,
        newSessionExpireTime,
      }),
    });
    if (!response.ok) throw new ServiceUnavailableException('Gemini Live credential provisioning failed');
    const payload = (await response.json()) as { name?: string; expireTime?: string };
    if (!payload.name) throw new ServiceUnavailableException('Gemini Live returned an invalid credential');
    return { token: payload.name, model, expireTime: payload.expireTime ?? expireTime };
  }

  async generateReport(user: AuthUser, sessionId: string) {
    const session = await this.getSession(user, sessionId);
    if (session.questionIndex < 6) {
      throw new BadRequestException(`Finish all six core intake questions before review. Currently completed: ${session.questionIndex} of 6.`);
    }
    const state = session.clinicalState && typeof session.clinicalState === 'object' && !Array.isArray(session.clinicalState)
      ? session.clinicalState as Record<string, unknown>
      : {};
    const transcript = session.transcript
      .map((entry) => `[${entry.speaker}] ${entry.text}`)
      .join('\n');
    let extraction: Awaited<ReturnType<ExtractionProvider['extractClinicalInformation']>> | undefined;
    try {
      extraction = await this.extractionProvider.extractClinicalInformation(transcript);
    } catch {
      // Keep the Live tool extraction as a safe fallback if the secondary NLP pass is unavailable.
    }
    const report = this.normalizeReport(session, state, extraction, transcript);
    const result = await this.prisma.intakeReport.upsert({
      where: { kioskSessionId: session.id },
      update: { report: report as Prisma.InputJsonValue, status: 'READY_FOR_REVIEW' },
      create: {
        patientId: session.patientId,
        encounterId: session.encounterId,
        kioskSessionId: session.id,
        report: report as Prisma.InputJsonValue,
        status: 'READY_FOR_REVIEW',
      },
    });
    await this.audit(user, session.patientId, 'REPORT_GENERATED', 'IntakeReport', result.id, { encounterId: session.encounterId });
    return result;
  }

  async verifyPatient(user: AuthUser, sessionId: string, input: FinalizePatientReportInput) {
    const session = await this.getSession(user, sessionId);
    if (user.role !== 'patient') throw new ForbiddenException('Only the patient can verify this intake');
    if (session.questionIndex < 6) throw new BadRequestException('Finish all six core intake questions before verifying the report.');
    const now = new Date();
    const clinicianTriage = assessMediKioskReport(input.report);
    clinicianTriage.departmentExtension = recommendDepartmentExtension(input.report, clinicianTriage.priority);
    const transcript = typeof input.report.transcript === 'string' ? input.report.transcript : '';
    if (transcript.trim().length >= 10) {
      try {
        const impression = await this.diagnosisProvider.suggestDiagnoses(transcript);
        clinicianTriage.possibleDiagnoses = impression.diagnoses.map((diagnosis) => ({
          name: diagnosis.name,
          certainty: diagnosis.certainty,
          supportingEvidence: diagnosis.supportingEvidence,
        }));
      } catch {
        // The deterministic safety screen remains authoritative when optional diagnosis synthesis is unavailable.
      }
    }
    const fullReport = { ...input.report, clinicianTriage } as Record<string, unknown>;
    const { clinicianTriage: _hiddenTriage, transcript: _hiddenTranscript, ...patientReport } = fullReport;
    const pdf = await createMediKioskPdf({
      patientName: session.encounter.patient.displayName,
      patientRecordId: session.encounter.patient.externalId ?? session.patientId,
      generatedAt: now.toISOString(),
      report: patientReport,
    });
    await this.prisma.kioskSession.update({
      where: { id: session.id },
      data: { patientVerified: true, status: 'COMPLETED', currentStage: 'COMPLETED', completedAt: now },
    });
    const result = await this.prisma.intakeReport.update({
      where: { kioskSessionId: session.id },
      data: { report: fullReport as Prisma.InputJsonValue, pdfData: new Uint8Array(pdf) as Uint8Array<ArrayBuffer>, pdfFilename: `sanctuary-plus-${session.encounter.patient.externalId ?? session.patientId}-intake.pdf`, pdfMimeType: 'application/pdf', status: 'PATIENT_VERIFIED', patientVerifiedAt: now },
    });
    await this.audit(user, session.patientId, 'PATIENT_VERIFIED_INTAKE', 'IntakeReport', result.id, { encounterId: session.encounterId });
    await this.handleTriageDecision(user, session.encounterId, session.patientId, clinicianTriage).catch(() => undefined);
    return { report: { ...result, report: patientReport }, pdf: { base64: pdf.toString('base64'), filename: `sanctuary-plus-${session.encounter.patient.externalId ?? session.patientId}-intake.pdf`, mimeType: 'application/pdf' } };
  }

  async getReportPdf(user: AuthUser, encounterId: string): Promise<{ data: Buffer; filename: string; mimeType: string }> {
    this.assertStaff(user);
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId }, include: { patient: true, kioskSessions: { orderBy: { createdAt: 'desc' }, take: 1 } } });
    if (!encounter) throw new NotFoundException('Encounter not found');
    const report = await this.prisma.intakeReport.findFirst({ where: { encounterId }, orderBy: { createdAt: 'desc' } });
    if (!report) throw new NotFoundException('Intake report not found');
    if (report.pdfData) return { data: Buffer.from(report.pdfData), filename: report.pdfFilename ?? `sanctuary-plus-${encounterId}-intake.pdf`, mimeType: report.pdfMimeType ?? 'application/pdf' };
    const stored = report.report as Record<string, unknown>;
    const { clinicianTriage: _hiddenTriage, transcript: _hiddenTranscript, ...patientReport } = stored;
    const patientRecordId = encounter.patient.externalId ?? encounter.patientId;
    const data = await createMediKioskPdf({ patientName: encounter.patient.displayName, patientRecordId, generatedAt: report.updatedAt.toISOString(), report: patientReport });
    return { data, filename: `sanctuary-plus-${patientRecordId}-intake.pdf`, mimeType: 'application/pdf' };
  }

  private normalizeReport(session: Awaited<ReturnType<MedikioskService['getSession']>>, state: Record<string, unknown>, extraction?: { symptoms?: string[]; onsetOrDuration?: string[]; clinicalFindings?: string[]; vitals?: unknown[]; currentMedications?: string[]; allergies?: string[]; history?: string[] }, transcript = '') {
    const asItems = (value: unknown): unknown[] => {
      if (value === null || value === undefined || value === '') return [];
      return Array.isArray(value) ? value : [value];
    };
    const mergeItems = (...values: unknown[]): unknown[] => {
      const seen = new Set<string>();
      return values.flatMap(asItems).filter((value) => {
        const fingerprint = JSON.stringify(value);
        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
      });
    };
    const fallbackSymptoms = state.symptoms ?? state.chiefComplaint ?? state.complaints ?? [];
    const fallbackOnset = state.problemStarted ?? state.duration ?? [];
    const fallbackHistory = state.history ?? { medical: state.medicalHistory ?? [], family: state.familyHistory ?? [], lifestyle: state.lifestyle ?? [] };
    return {
      patientId: session.patientId,
      encounterId: session.encounterId,
      generatedAt: new Date().toISOString(),
      symptoms: mergeItems(extraction?.symptoms, fallbackSymptoms),
      problemStarted: mergeItems(extraction?.onsetOrDuration, fallbackOnset),
      findings: mergeItems(extraction?.clinicalFindings, state.findings ?? []),
      vitals: mergeItems(extraction?.vitals, state.vitals ?? []),
      medications: mergeItems(extraction?.currentMedications, state.medications ?? state.medicines ?? []),
      allergies: mergeItems(extraction?.allergies, state.allergies ?? []),
      history: mergeItems(extraction?.history, fallbackHistory),
      safetySignals: session.safetySignals,
      transcript,
      patientVerificationStatus: session.patientVerified ? 'VERIFIED' : 'PENDING',
    };
  }

  async updatePatientReport(user: AuthUser, sessionId: string, input: ReportUpdateInput) {
    const session = await this.getSession(user, sessionId);
    if (user.role !== 'patient') throw new ForbiddenException('Only the patient can edit this intake before verification');
    return this.prisma.intakeReport.update({
      where: { kioskSessionId: session.id },
      data: {
        report: input.report as Prisma.InputJsonValue,
        status: 'DRAFT',
        patientVerifiedAt: null,
        clinicianConfirmedAt: null,
        clinicianConfirmedBy: null,
      },
    });
  }

  async getEncounter(user: AuthUser, encounterId: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id: encounterId },
      include: {
        patient: {
          include: {
            documents: { select: CLINICAL_DOCUMENT_SUMMARY_SELECT, orderBy: { documentDate: 'desc' } },
            medications: { orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }] },
            allergies: { orderBy: { createdAt: 'desc' } },
            encounters: { select: { id: true, type: true, status: true, startedAt: true, endedAt: true }, orderBy: { startedAt: 'desc' }, take: 12 },
          },
        },
        kioskSessions: { orderBy: { createdAt: 'desc' }, include: { transcript: { orderBy: { occurredAt: 'asc' } }, facts: { include: { transcriptEntry: true } }, report: true } },
        intakeReports: { orderBy: { updatedAt: 'desc' } },
        consultations: true,
        prescriptions: true,
        nextSteps: true,
        documents: { select: CLINICAL_DOCUMENT_SUMMARY_SELECT },
      },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    this.assertAccess(user, encounter.patientId);
    if (user.role !== 'patient') {
      const report = encounter.intakeReports.find((candidate) => candidate.status === 'PATIENT_VERIFIED' || candidate.status === 'CLINICIAN_CONFIRMED') ?? encounter.intakeReports[0];
      if (report && report.report && typeof report.report === 'object' && !Array.isArray(report.report)) {
        const stored = report.report as Record<string, unknown>;
        const currentTriage = stored.clinicianTriage as Record<string, unknown> | undefined;
        const needsAssessment = !currentTriage || !Array.isArray(currentTriage.possibleDiagnoses);
        const configuredMode = this.triageMode();
        const needsModeRefresh = currentTriage?.mode !== configuredMode;
        if (needsAssessment || needsModeRefresh) {
          const clinicianTriage: ReturnType<typeof assessMediKioskReport> = needsAssessment
            ? { ...assessMediKioskReport(stored), mode: configuredMode }
            : { ...(currentTriage as ReturnType<typeof assessMediKioskReport>), mode: configuredMode };
          clinicianTriage.departmentExtension = recommendDepartmentExtension(stored, clinicianTriage.priority);
          const transcript = typeof stored.transcript === 'string' ? stored.transcript : '';
          if (transcript.trim().length >= 10) {
            try {
              const impression = await this.diagnosisProvider.suggestDiagnoses(transcript);
              clinicianTriage.possibleDiagnoses = impression.diagnoses.map((diagnosis) => ({ name: diagnosis.name, certainty: diagnosis.certainty, supportingEvidence: diagnosis.supportingEvidence }));
            } catch {
              // The deterministic safety screen remains available if optional synthesis is unavailable.
            }
          }
          const enriched = { ...stored, clinicianTriage };
          report.report = enriched as Prisma.JsonObject;
          await this.prisma.intakeReport.update({ where: { id: report.id }, data: { report: enriched as Prisma.InputJsonValue } });
          if (encounter.id && (needsAssessment || needsModeRefresh)) {
            await this.handleTriageDecision(user, encounter.id, encounter.patientId, clinicianTriage).catch(() => undefined);
          }
        }
      }
    }
    if (user.role === 'patient') {
      return {
        ...encounter,
        intakeReports: encounter.intakeReports.map((report) => {
          if (!report.report || typeof report.report !== 'object' || Array.isArray(report.report)) return report;
          const { clinicianTriage: _hiddenTriage, ...patientReport } = report.report as Record<string, unknown>;
          return { ...report, report: patientReport as Prisma.JsonObject };
        }),
      };
    }
    return encounter;
  }

  async getActivePatientEncounter(user: AuthUser, patientId: string) {
    this.assertPatientOrStaff(user, patientId);
    return this.prisma.encounter.findFirst({
      where: {
        patientId,
        status: { notIn: ['PATIENT_INSTRUCTIONS_READY', 'COMPLETED', 'CANCELLED'] },
      },
      orderBy: { createdAt: 'desc' },
      include: { patient: true, kioskSessions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async listStaffEncounters(user: AuthUser) {
    this.assertStaff(user);
    const encounters = await this.prisma.encounter.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { patient: true, intakeReports: { orderBy: { updatedAt: 'desc' } }, documents: { select: CLINICAL_DOCUMENT_SUMMARY_SELECT }, kioskSessions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const queueTickets = this.queueService.snapshot().tickets;
    return encounters.map((encounter) => ({
      ...encounter,
      // The operational queue is authoritative for the label shown in the
      // doctor selector. Encounter lifecycle status can lag while a queue
      // ticket is being triaged or after a process restart.
      queueStatus: queueTickets.find((ticket) => ticket.encounterId === encounter.id)?.status ?? encounter.status,
    }));
  }

  async updateReport(user: AuthUser, encounterId: string, input: ReportUpdateInput) {
    this.assertStaff(user);
    const encounter = await this.getEncounter(user, encounterId);
    const report = encounter.intakeReports[0];
    if (!report) throw new NotFoundException('Intake report not found');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.intakeReport.update({
        where: { id: report.id },
        data: {
          report: input.report as Prisma.InputJsonValue,
          status: 'CLINICIAN_CONFIRMED',
          clinicianConfirmedAt: new Date(),
          clinicianConfirmedBy: user.sub,
        },
      });
      await tx.clinicalFact.updateMany({
        where: { kioskSessionId: report.kioskSessionId },
        data: { clinicianConfirmedAt: new Date(), clinicianConfirmedBy: user.sub },
      });
      await tx.auditEvent.create({
        data: {
          patientId: encounter.patientId,
          actorId: user.sub,
          actorRole: user.role,
          action: 'DOCTOR_CONFIRMED_HISTORY',
          entityType: 'IntakeReport',
          entityId: report.id,
          afterJson: input.report as Prisma.InputJsonValue,
        },
      });
      return updated;
    });
  }

  async startConsultation(user: AuthUser, encounterId: string) {
    this.assertStaff(user);
    const encounter = await this.getEncounter(user, encounterId);
    const result = await this.prisma.consultation.upsert({
      where: { id: encounter.consultations[0]?.id ?? '__missing__' },
      update: { status: 'IN_PROGRESS', startedAt: new Date() },
      create: { patientId: encounter.patientId, encounterId, status: 'IN_PROGRESS', startedAt: new Date() },
    });
    await this.audit(user, encounter.patientId, 'CONSULTATION_STARTED', 'Consultation', result.id, { encounterId });
    return result;
  }

  async updateConsultation(user: AuthUser, consultationId: string, input: ConsultationUpdateInput) {
    this.assertStaff(user);
    const consultation = await this.prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundException('Consultation not found');
    const result = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        ...(input.transcript ? { transcript: input.transcript as Prisma.InputJsonValue } : {}),
        ...(input.decisions ? { decisions: input.decisions as Prisma.InputJsonValue } : {}),
      },
    });
    await this.audit(user, consultation.patientId, 'CONSULTATION_TRANSCRIBED', 'Consultation', result.id, { encounterId: consultation.encounterId });
    return result;
  }

  async transcribeConsultation(user: AuthUser, consultationId: string, input: TranscribeConsultationInput) {
    this.assertStaff(user);
    const consultation = await this.prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundException('Consultation not found');
    const transcription = await this.transcriptionProvider.transcribe({
      audioBase64: input.audioBase64,
      mimeType: input.mimeType,
      filename: input.filename,
      durationSeconds: input.durationSeconds,
      patientId: consultation.patientId,
      encounterType: 'outpatient',
    });
    const current = Array.isArray(consultation.transcript) ? consultation.transcript : [];
    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: { transcript: [...current, { speaker: 'DOCTOR_PATIENT_CONVERSATION', text: transcription.transcript, segments: transcription.segments ?? [], recordedAt: new Date().toISOString() }] as Prisma.InputJsonValue },
    });
  }

  async finalizeConsultation(user: AuthUser, consultationId: string, input: FinalizeConsultationInput) {
    this.assertStaff(user);
    const consultation = await this.prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) throw new NotFoundException('Consultation not found');
    if (consultation.status === 'COMPLETED') throw new BadRequestException('Consultation is already finalized');
    const prescriptions = input.prescriptions ?? [];
    const nextSteps = input.nextSteps ?? [];
    prescriptions.forEach((item) => this.assertFields(item, ['medicationName', 'strength', 'dose', 'unit', 'route', 'frequency', 'duration']));
    nextSteps.forEach((item) => this.assertFields(item, ['title']));
    return this.prisma.$transaction(async (tx) => {
      const completed = await tx.consultation.update({
        where: { id: consultationId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          ...(input.transcript ? { transcript: input.transcript as Prisma.InputJsonValue } : {}),
          ...(input.decisions ? { decisions: input.decisions as Prisma.InputJsonValue } : {}),
        },
      });
      await tx.prescription.createMany({
        data: prescriptions.map((item) => ({
          patientId: consultation.patientId,
          encounterId: consultation.encounterId,
          consultationId,
          ...item,
          prescriberId: user.sub,
          status: 'FINALIZED' as const,
          finalizedAt: new Date(),
        })),
      });
      await tx.patientNextStep.createMany({
        data: nextSteps.map((item) => ({
          patientId: consultation.patientId,
          encounterId: consultation.encounterId,
          ...item,
          dependencies: item.dependencies ?? [],
          source: 'CLINICIAN',
        })),
      });
      if (prescriptions.length > 0) {
        await tx.auditEvent.create({
          data: { patientId: consultation.patientId, actorId: user.sub, actorRole: user.role, action: 'PRESCRIPTION_FINALIZED', entityType: 'Consultation', entityId: consultationId, afterJson: prescriptions as Prisma.InputJsonValue },
        });
      }
      if (nextSteps.length > 0) {
        await tx.auditEvent.create({
          data: { patientId: consultation.patientId, actorId: user.sub, actorRole: user.role, action: 'NEXT_STEP_CREATED', entityType: 'Consultation', entityId: consultationId, afterJson: nextSteps as Prisma.InputJsonValue },
        });
      }
      await tx.encounter.update({ where: { id: consultation.encounterId }, data: { status: 'PATIENT_INSTRUCTIONS_READY' } });
      return completed;
    });
  }

  async listNextSteps(user: AuthUser, patientId: string) {
    this.assertPatientOrStaff(user, patientId);
    const steps = await this.prisma.patientNextStep.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' } });
    if (user.role === 'patient' && steps.length) {
      await this.prisma.auditEvent.createMany({ data: steps.map((step) => ({ patientId, actorId: user.sub, actorRole: user.role, action: 'PATIENT_VIEWED_NEXT_STEP', entityType: 'PatientNextStep', entityId: step.id })) });
    }
    return steps;
  }

  async listPrescriptions(user: AuthUser, patientId: string) {
    this.assertPatientOrStaff(user, patientId);
    return this.prisma.prescription.findMany({ where: { patientId, status: 'FINALIZED' }, orderBy: { finalizedAt: 'desc' } });
  }

  private assertAccess(user: AuthUser, patientId: string): void {
    if (user.role === 'patient' && user.patientId !== patientId) {
      throw new ForbiddenException('Patients may only access their own records');
    }
  }

  private assertStaff(user: AuthUser): void {
    if (user.role !== 'staff') throw new ForbiddenException('Staff access is required');
  }

  private assertPatientOrStaff(user: AuthUser, patientId: string): void {
    if (user.role === 'patient' && user.patientId !== patientId) throw new ForbiddenException('Patients may only access their own records');
  }

  private assertFields(input: object, fields: string[]): void {
    const record = input as Record<string, unknown>;
    const missing = fields.filter((field) => typeof record[field] !== 'string' || !String(record[field]).trim());
    if (missing.length) throw new BadRequestException(`Missing required fields: ${missing.join(', ')}`);
  }

  private async audit(user: AuthUser, patientId: string, action: string, entityType: string, entityId: string, afterJson?: Prisma.InputJsonValue): Promise<void> {
    await this.prisma.auditEvent.create({
      data: { patientId, actorId: user.sub, actorRole: user.role, action, entityType, entityId, ...(afterJson ? { afterJson } : {}) },
    });
  }
}
