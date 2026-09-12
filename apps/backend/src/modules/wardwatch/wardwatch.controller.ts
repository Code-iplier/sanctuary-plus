import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WardWatchService } from './wardwatch.service';
import type {
  DeviceConnection,
  FlagResolution,
  PatientDevice,
  VitalsReading,
} from './wardwatch.types';

@Controller('wardwatch')
export class WardWatchController {
  constructor(private readonly wardWatchService: WardWatchService) {}

  @Get('dashboard')
  getDashboard() {
    return this.wardWatchService.getDashboard();
  }

  @Get('dashboard/review-due')
  getDashboardReviewDue() {
    return this.wardWatchService.getReviewDueDevices();
  }

  @Get('dashboard/rising-trends')
  getDashboardRisingTrends() {
    return this.wardWatchService.getRisingTrends();
  }

  @Get('dashboard/recheck-priority')
  getDashboardRecheckPriority() {
    return this.wardWatchService.getRecheckPriority();
  }

  @Get('patients/:id')
  getPatient(@Param('id') id: string) {
    return this.wardWatchService.getPatientCombinedView(id);
  }

  @Get('patients/:id/devices')
  getPatientDevices(@Param('id') id: string) {
    return this.wardWatchService.getPatientCombinedView(id).devices;
  }

  @Get('patients/:id/vitals')
  getPatientVitals(@Param('id') id: string) {
    return this.wardWatchService.getPatientCombinedView(id).vitals;
  }

  @Get('patients/:id/news2')
  getPatientNews2(@Param('id') id: string) {
    return this.wardWatchService.getPatientCombinedView(id).news2;
  }

  @Get('patients/:id/news2-trend')
  getPatientNews2Trend(@Param('id') id: string) {
    return this.wardWatchService.getPatientCombinedView(id).news2.at(-1);
  }

  @Post('devices')
  createDevice(@Body() payload: Partial<PatientDevice>) {
    return this.wardWatchService.createDevice(payload);
  }

  @Patch('devices/:id')
  updateDevice(@Param('id') id: string, @Body() payload: Partial<PatientDevice>) {
    return this.wardWatchService.updateDevice(id, payload);
  }

  @Post('devices/:id/review')
  reviewDevice(
    @Param('id') id: string,
    @Body()
    payload: {
      outcome?: string;
      indication?: string;
      reviewedBy?: string;
      notes?: string;
    },
  ) {
    return this.wardWatchService.reviewDevice(id, payload);
  }

  @Post('devices/:id/remove')
  removeDevice(
    @Param('id') id: string,
    @Body()
    payload?: {
      removalReason?: string;
      removedAt?: string;
      removedBy?: string;
      notes?: string;
    },
  ) {
    return this.wardWatchService.removeDevice(id, payload);
  }

  @Post('connections')
  createConnection(@Body() payload: Partial<DeviceConnection>) {
    return this.wardWatchService.createConnection(payload);
  }

  @Post('connections/:id/end')
  endConnection(
    @Param('id') id: string,
    @Body() payload?: { endedAt?: string },
  ) {
    return this.wardWatchService.endConnection(id, payload);
  }

  @Post('vitals')
  recordVitals(@Body() payload: Partial<VitalsReading>) {
    return this.wardWatchService.recordVitals(payload);
  }

  @Get('flags')
  listFlags(@Query('patientId') patientId?: string) {
    return this.wardWatchService.listFlags(patientId);
  }

  @Get('patients/:id/flags')
  getPatientFlags(@Param('id') id: string) {
    return this.wardWatchService.listFlags(id);
  }

  @Post('flags/:id/acknowledge')
  acknowledgeFlag(@Param('id') id: string) {
    return this.wardWatchService.acknowledgeFlag(id);
  }

  @Post('flags/:id/resolve')
  resolveFlag(
    @Param('id') id: string,
    @Body() payload: { resolution?: FlagResolution; note?: string },
  ) {
    return this.wardWatchService.resolveFlag(id, payload);
  }
}
