import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ChronosBridgeService } from './chronos.service';

@Controller('chronos')
export class ChronosController {
  constructor(private readonly chronosService: ChronosBridgeService) {}

  @Get('health')
  getHealth() {
    return this.chronosService.getHealth();
  }

  @Get('summary')
  getSummary() {
    return this.chronosService.getSummary();
  }

  @Get('patients')
  getPatients() {
    return this.chronosService.getPatients();
  }

  @Get('patient/:patientId/history')
  getPatientHistory(@Param('patientId') patientId: string) {
    return this.chronosService.getPatientHistory(patientId);
  }

  @Post('predict')
  @HttpCode(HttpStatus.OK)
  predict(@Body() payload: Record<string, unknown>) {
    return this.chronosService.predict(payload);
  }
}
