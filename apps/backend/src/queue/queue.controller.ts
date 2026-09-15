import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard, type AuthenticatedRequest } from '../auth/jwt-auth.guard';
import { QueueGateway } from './queue.gateway';
import { QueueService } from './queue.service';
import {
  DoctorAvailability,
  RoomStatus,
  TriageLevel,
  VisitType,
} from './queue.types';

@Controller('queue')
@UseGuards(JwtAuthGuard)
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly queueGateway: QueueGateway
  ) {}

  @Get('snapshot')
  getSnapshot(@Req() request: AuthenticatedRequest) {
    const user = this.user(request);
    return user.role === 'patient'
      ? this.queueService.patientSnapshot(user.patientId!)
      : this.queueService.snapshot();
  }

  @Get('patient/:id/active')
  getActiveTicket(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.assertPatientAccess(request, id);
    return this.queueService.getActiveTicketForPatient(id);
  }

  @Get('patient/:id/tickets')
  getPatientTickets(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.assertPatientAccess(request, id);
    return this.queueService.getTicketsForPatient(id);
  }

  @Post('tickets/issue')
  async issueTicket(
    @Req() request: AuthenticatedRequest,
    @Body()
    input: {
      patientId: string;
      patientName: string;
      patientPhone: string;
      departmentId: string;
      visitType: VisitType;
      reason: string;
    }
  ) {
    this.assertPatientAccess(request, input.patientId);
    const ticket = await this.queueService.issueTicket(input);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('tickets/:id/triage')
  triageTicket(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    input: {
      triageLevel: TriageLevel;
      vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
      triageNotes?: string;
      priorityScore?: number;
      actor?: string;
    }
  ) {
    this.assertStaff(request);
    const ticket = this.queueService.triageTicket(id, input);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('encounters/:id/automated-triage')
  automatedTriage(@Req() request: AuthenticatedRequest, @Param('id') encounterId: string, @Body() input: { triageLevel: TriageLevel; priorityScore: number }) {
    this.assertStaff(request);
    const ticket = this.queueService.applyAutomatedTriage(encounterId, input);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/call-next')
  callNext(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body?: { actor?: string }) {
    this.assertStaff(request);
    const ticket = this.queueService.callNext(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/start')
  startConsultation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body?: { actor?: string }) {
    this.assertStaff(request);
    const ticket = this.queueService.startConsultation(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/finish')
  finishConsultation(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body?: { notes?: string; actor?: string }
  ) {
    this.assertStaff(request);
    const ticket = this.queueService.finishConsultation(id, body?.notes, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/no-show')
  markNoShow(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body?: { reason?: string; actor?: string }
  ) {
    this.assertStaff(request);
    const ticket = this.queueService.markNoShow(id, body?.reason, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/recall')
  recallPatient(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body?: { actor?: string }) {
    this.assertStaff(request);
    const ticket = this.queueService.recallPatient(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/skip')
  skipTicket(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body?: { actor?: string }) {
    this.assertStaff(request);
    const ticket = this.queueService.skipTicket(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('tickets/:id/cancel')
  cancelTicket(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body?: { reason?: string; actor?: string }
  ) {
    const user = this.user(request);
    if (user.role === 'patient') {
      const ticket = this.queueService.snapshot().tickets.find((candidate) => candidate.id === id);
      if (!ticket) throw new ForbiddenException('Queue ticket not found');
      this.assertPatientAccess(request, ticket.patientId);
    }
    const ticket = this.queueService.cancelTicket(id, body?.reason, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Patch('tickets/:id/priority')
  updatePriority(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: { priority: TriageLevel; reason: string; actor?: string }
  ) {
    this.assertStaff(request);
    const ticket = this.queueService.updatePriority(
      id,
      input.priority,
      input.reason,
      input.actor
    );
    this.queueGateway.broadcast();
    return ticket;
  }

  @Patch('doctors/:id/status')
  updateDoctorStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: { status: DoctorAvailability }
  ) {
    this.assertStaff(request);
    const doc = this.queueService.updateDoctorStatus(id, input.status);
    this.queueGateway.broadcast();
    return doc;
  }

  @Patch('rooms/:id/status')
  updateRoomStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() input: { status: RoomStatus }
  ) {
    this.assertStaff(request);
    const room = this.queueService.updateRoomStatus(id, input.status);
    this.queueGateway.broadcast();
    return room;
  }

  private user(request: AuthenticatedRequest) {
    if (!request.user) throw new ForbiddenException('Authenticated user is missing');
    return request.user;
  }

  private assertStaff(request: AuthenticatedRequest): void {
    if (this.user(request).role !== 'staff') {
      throw new ForbiddenException('Only hospital staff can perform this queue operation');
    }
  }

  private assertPatientAccess(request: AuthenticatedRequest, patientId: string): void {
    const user = this.user(request);
    if (user.role === 'staff') return;
    if (user.patientId !== patientId) {
      throw new ForbiddenException('Patients may only access their own queue records');
    }
  }
}
