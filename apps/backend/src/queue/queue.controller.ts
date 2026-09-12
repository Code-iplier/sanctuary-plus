import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { QueueService } from './queue.service';
import {
  DoctorAvailability,
  RoomStatus,
  TriageLevel,
  VisitType,
} from './queue.types';

@Controller('queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly queueGateway: QueueGateway
  ) {}

  @Get('snapshot')
  getSnapshot() {
    return this.queueService.snapshot();
  }

  @Get('patient/:id/active')
  getActiveTicket(@Param('id') id: string) {
    return this.queueService.getActiveTicketForPatient(id);
  }

  @Get('patient/:id/tickets')
  getPatientTickets(@Param('id') id: string) {
    return this.queueService.getTicketsForPatient(id);
  }

  @Post('tickets/issue')
  issueTicket(
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
    const ticket = this.queueService.issueTicket(input);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('tickets/:id/triage')
  triageTicket(
    @Param('id') id: string,
    @Body()
    input: {
      triageLevel: TriageLevel;
      vitals?: { bp?: string; pulse?: string; temp?: string; spo2?: string };
      triageNotes?: string;
      actor?: string;
    }
  ) {
    const ticket = this.queueService.triageTicket(id, input);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/call-next')
  callNext(@Param('id') id: string, @Body() body?: { actor?: string }) {
    const ticket = this.queueService.callNext(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/start')
  startConsultation(@Param('id') id: string, @Body() body?: { actor?: string }) {
    const ticket = this.queueService.startConsultation(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/finish')
  finishConsultation(
    @Param('id') id: string,
    @Body() body?: { notes?: string; actor?: string }
  ) {
    const ticket = this.queueService.finishConsultation(id, body?.notes, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/no-show')
  markNoShow(
    @Param('id') id: string,
    @Body() body?: { reason?: string; actor?: string }
  ) {
    const ticket = this.queueService.markNoShow(id, body?.reason, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/recall')
  recallPatient(@Param('id') id: string, @Body() body?: { actor?: string }) {
    const ticket = this.queueService.recallPatient(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('rooms/:id/skip')
  skipTicket(@Param('id') id: string, @Body() body?: { actor?: string }) {
    const ticket = this.queueService.skipTicket(id, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Post('tickets/:id/cancel')
  cancelTicket(
    @Param('id') id: string,
    @Body() body?: { reason?: string; actor?: string }
  ) {
    const ticket = this.queueService.cancelTicket(id, body?.reason, body?.actor);
    this.queueGateway.broadcast();
    return ticket;
  }

  @Patch('tickets/:id/priority')
  updatePriority(
    @Param('id') id: string,
    @Body() input: { priority: TriageLevel; reason: string; actor?: string }
  ) {
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
    @Param('id') id: string,
    @Body() input: { status: DoctorAvailability }
  ) {
    const doc = this.queueService.updateDoctorStatus(id, input.status);
    this.queueGateway.broadcast();
    return doc;
  }

  @Patch('rooms/:id/status')
  updateRoomStatus(
    @Param('id') id: string,
    @Body() input: { status: RoomStatus }
  ) {
    const room = this.queueService.updateRoomStatus(id, input.status);
    this.queueGateway.broadcast();
    return room;
  }
}
