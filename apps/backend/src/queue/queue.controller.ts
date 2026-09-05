import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { QueueGateway } from './queue.gateway';
import { QueueService } from './queue.service';
import type { Priority } from './queue.types';

@Controller()
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly queueGateway: QueueGateway,
  ) {}

  @Get('bootstrap')
  bootstrap() {
    return this.queueService.snapshot();
  }

  @Get('hospitals')
  hospitals() {
    return this.queueService.hospitals();
  }

  @Get('hospitals/:id/departments')
  departments(@Param('id') id: string) {
    return this.queueService.departments(id);
  }

  @Get('departments/:id/doctors')
  doctors(@Param('id') id: string) {
    return this.queueService.doctors(id);
  }

  @Get('doctors/:id')
  doctor(@Param('id') id: string) {
    const doctor = this.queueService.getDoctor(id);
    if (!doctor) throw new NotFoundException('Not found');
    return doctor;
  }

  @Get('doctors/:id/queue')
  doctorQueue(@Param('id') id: string) {
    return this.queueService.getActiveQueueForDoctor(id);
  }

  @Get('queue/:id')
  queue(@Param('id') id: string) {
    const entry = this.queueService.getQueueById(id);
    if (!entry) throw new NotFoundException('Not found');
    return entry;
  }

  @Get('patients/:phone')
  patient(@Param('phone') phone: string) {
    return this.queueService.getPatientByPhone(phone);
  }

  @Get('patients/:phone/queues')
  patientQueues(@Param('phone') phone: string) {
    const patient = this.queueService.getPatientByPhone(phone);
    if (!patient) return [];
    return this.queueService.getQueuesForPatient(patient.id);
  }

  @Post('patients/register')
  registerPatient(@Body() input: { name: string; phone: string; age?: string; gender?: string; hospitalId: string }) {
    const patient = this.queueService.registerPatient(input);
    this.queueGateway.broadcast();
    return patient;
  }

  @Post('queues/join')
  joinQueue(@Body() input: { patientId: string; doctorId: string; priority: Priority; visitType: string; reason?: string }) {
    const entry = this.queueService.joinQueue(input);
    if (!entry) throw new BadRequestException('Unable to join queue');
    this.queueGateway.broadcast();
    return entry;
  }

  @Post('doctors/:id/call')
  call(@Param('id') id: string) {
    const entry = this.queueService.callPatient(id);
    if (!entry) throw new NotFoundException('No patient to call');
    this.queueGateway.broadcast();
    return entry;
  }

  @Post('doctors/:id/start')
  start(@Param('id') id: string) {
    const entry = this.queueService.startConsultation(id);
    if (!entry) throw new NotFoundException('No queue entry found');
    this.queueGateway.broadcast();
    return entry;
  }

  @Post('doctors/:id/complete')
  complete(@Param('id') id: string) {
    const entry = this.queueService.completeConsultation(id);
    if (!entry) throw new NotFoundException('No active consultation');
    this.queueGateway.broadcast();
    return entry;
  }

  @Post('doctors/:id/skip')
  skip(@Param('id') id: string) {
    const entry = this.queueService.skipPatient(id);
    if (!entry) throw new NotFoundException('No waiting entry');
    this.queueGateway.broadcast();
    return entry;
  }

  @Post('doctors/:id/no-show')
  noShow(@Param('id') id: string) {
    const entry = this.queueService.markNoShow(id);
    if (!entry) throw new NotFoundException('No waiting entry');
    this.queueGateway.broadcast();
    return entry;
  }

  @Patch('queue/:id/priority')
  priority(@Param('id') id: string, @Body() input: { priority: Priority }) {
    const entry = this.queueService.updatePriority(id, input.priority);
    if (!entry) throw new NotFoundException('Not found');
    this.queueGateway.broadcast();
    return entry;
  }

  @Patch('doctors/:id/delay')
  delay(@Param('id') id: string, @Body() input: { minutes: number }) {
    const doctor = this.queueService.updateDoctorDelay(id, input.minutes);
    if (!doctor) throw new NotFoundException('Not found');
    this.queueGateway.broadcast();
    return doctor;
  }

  @Patch('doctors/:id/status')
  status(@Param('id') id: string) {
    const doctor = this.queueService.toggleDoctorAvailability(id);
    if (!doctor) throw new NotFoundException('Not found');
    this.queueGateway.broadcast();
    return doctor;
  }

  @Get('dashboard/overview')
  overview() {
    const next = this.queueService.snapshot();
    const active = next.queues.filter((q) => ['WAITING', 'NOTIFIED', 'CALLED', 'IN_CONSULTATION'].includes(q.status));
    return {
      activeTokens: active.length,
      averageWait: active.length ? Math.round(active.reduce((sum, q) => sum + (q.estimatedWaitMinutes ?? 0), 0) / active.length) : 0,
      hospitals: next.hospitals.length,
      doctors: next.doctors.length,
    };
  }
}