import { Controller, Get, Post, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ChronosService } from './chronos.service';
import type { ChronosSummary, ChronosPredictionResponse } from './chronos.types';

@Controller('chronos')
export class ChronosController {
  constructor(private readonly chronosService: ChronosService) {}

  @Get('summary')
  async getSummary(): Promise<ChronosSummary> {
    return this.chronosService.getSummary();
  }

  @Get('patients')
  async getPatients() {
    return this.chronosService.getPatients();
  }

  @Get('patient/:patientId/history')
  async getPatientHistory(@Param('patientId') patientId: string) {
    return this.chronosService.getPatientHistory(patientId);
  }

  @Post('predict')
  @HttpCode(HttpStatus.OK)
  async predict(@Body() payload: Record<string, unknown>): Promise<ChronosPredictionResponse> {
    return this.chronosService.predict(payload);
  }
}
