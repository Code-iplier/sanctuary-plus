import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard, type AuthenticatedRequest } from '../../auth/jwt-auth.guard';
import { MedikioskService } from './medikiosk.service';
import type { ClinicalFactReviewInput, ConsultationUpdateInput, CreateKioskSessionInput, DocumentExtractionUpdateInput, FinalizeConsultationInput, ReportUpdateInput, StateUpdateInput, TranscriptInput, TranscribeConsultationInput, UploadPatientDocumentInput } from './medikiosk.types';

@Controller('medikiosk')
@UseGuards(JwtAuthGuard)
export class MedikioskController {
  constructor(private readonly service: MedikioskService) {}

  @Post('sessions')
  create(@Req() request: AuthenticatedRequest, @Body() input: CreateKioskSessionInput) {
    return this.service.createSession(request.user!, input);
  }

  @Get('sessions/:id')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getSession(request.user!, id);
  }

  @Post('sessions/:id/transcript')
  transcript(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: TranscriptInput) {
    return this.service.appendTranscript(request.user!, id, input);
  }

  @Patch('sessions/:id/state')
  state(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: StateUpdateInput) {
    return this.service.updateState(request.user!, id, input);
  }

  @Patch('sessions/:sessionId/facts/:factId/review')
  reviewFact(@Req() request: AuthenticatedRequest, @Param('sessionId') sessionId: string, @Param('factId') factId: string, @Body() input: ClinicalFactReviewInput) {
    return this.service.reviewClinicalFact(request.user!, sessionId, factId, input);
  }

  @Post('sessions/:id/live-token')
  liveToken(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.issueLiveToken(request.user!, id);
  }

  @Post('sessions/:id/report')
  report(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.generateReport(request.user!, id);
  }

  @Post('sessions/:id/verify')
  verify(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: { report: Record<string, unknown> }) {
    return this.service.verifyPatient(request.user!, id, input);
  }

  @Patch('sessions/:id/report')
  patientReport(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ReportUpdateInput) {
    return this.service.updatePatientReport(request.user!, id, input);
  }

  @Post('documents')
  uploadDocument(@Req() request: AuthenticatedRequest, @Body() input: UploadPatientDocumentInput) {
    return this.service.uploadPatientDocument(request.user!, input);
  }

  @Get('patients/:patientId/documents')
  patientDocuments(@Req() request: AuthenticatedRequest, @Param('patientId') patientId: string) {
    return this.service.listPatientDocuments(request.user!, patientId);
  }

  @Get('documents/:id/content')
  async documentContent(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Res() response: Response) {
    const document = await this.service.getDocumentContent(request.user!, id);
    response.set({ 'Content-Type': document.mimeType, 'Content-Disposition': `inline; filename="${document.filename.replace(/"/g, '')}"` });
    response.send(document.data);
  }

  @Patch('documents/:id/extraction')
  confirmDocumentExtraction(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: DocumentExtractionUpdateInput) {
    return this.service.confirmPatientDocumentExtraction(request.user!, id, input.extractedData);
  }

  @Post('documents/:id/review')
  reviewDocument(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.reviewDocument(request.user!, id);
  }

  @Get('encounters/:id/report-pdf')
  async reportPdf(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Res() response: Response) {
    const pdf = await this.service.getReportPdf(request.user!, id);
    response.set({ 'Content-Type': pdf.mimeType, 'Content-Disposition': `inline; filename="${pdf.filename}"` });
    response.send(pdf.data);
  }

  @Get('encounters/:id')
  encounter(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.getEncounter(request.user!, id);
  }

  @Get('patients/:patientId/active-encounter')
  activeEncounter(@Req() request: AuthenticatedRequest, @Param('patientId') patientId: string) {
    return this.service.getActivePatientEncounter(request.user!, patientId);
  }

  @Get('staff/encounters')
  staffEncounters(@Req() request: AuthenticatedRequest) {
    return this.service.listStaffEncounters(request.user!);
  }

  @Patch('encounters/:id/report')
  updateReport(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ReportUpdateInput) {
    return this.service.updateReport(request.user!, id, input);
  }

  @Post('encounters/:id/consultation')
  startConsultation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.service.startConsultation(request.user!, id);
  }

  @Patch('consultations/:id')
  updateConsultation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: ConsultationUpdateInput) {
    return this.service.updateConsultation(request.user!, id, input);
  }

  @Post('consultations/:id/transcribe')
  transcribe(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: TranscribeConsultationInput) {
    return this.service.transcribeConsultation(request.user!, id, input);
  }

  @Post('consultations/:id/finalize')
  finalizeConsultation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() input: FinalizeConsultationInput) {
    return this.service.finalizeConsultation(request.user!, id, input);
  }

  @Get('patients/:patientId/next-steps')
  nextSteps(@Req() request: AuthenticatedRequest, @Param('patientId') patientId: string) {
    return this.service.listNextSteps(request.user!, patientId);
  }

  @Get('patients/:patientId/prescriptions')
  prescriptions(@Req() request: AuthenticatedRequest, @Param('patientId') patientId: string) {
    return this.service.listPrescriptions(request.user!, patientId);
  }

  @Get('family-members/:abhaId')
  familyMember(@Req() request: AuthenticatedRequest, @Param('abhaId') abhaId: string) {
    return this.service.getFamilyMemberHealthSummary(request.user!, abhaId);
  }

  @Get('family-members/:abhaId/documents/:documentId/content')
  async familyDocumentContent(@Req() request: AuthenticatedRequest, @Param('abhaId') abhaId: string, @Param('documentId') documentId: string, @Res() response: Response) {
    const document = await this.service.getFamilyMemberDocumentContent(request.user!, abhaId, documentId);
    response.set({ 'Content-Type': document.mimeType, 'Content-Disposition': `inline; filename="${document.filename.replace(/"/g, '')}"` });
    response.send(document.data);
  }

  @Get('family-members/:abhaId/encounters/:encounterId/report-pdf')
  async familyReportPdf(@Req() request: AuthenticatedRequest, @Param('abhaId') abhaId: string, @Param('encounterId') encounterId: string, @Res() response: Response) {
    const pdf = await this.service.getFamilyMemberReportPdf(request.user!, abhaId, encounterId);
    response.set({ 'Content-Type': pdf.mimeType, 'Content-Disposition': `inline; filename="${pdf.filename}"` });
    response.send(pdf.data);
  }
}
