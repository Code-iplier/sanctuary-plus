import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import type {
  ClinicalEncounter,
  CreateEncounterDto,
  UpdateEncounterDto,
  TranscribeAudioDto,
  TranscriptionResponseDto,
  UpdateTranscriptDto,
  ClinicalExtraction,
  UpdateExtractionDto,
} from './documentation.types';

@Controller('encounters')
export class DocumentationController {
  constructor(private readonly documentationService: DocumentationService) {}

  @Get()
  async getEncounters(
    @Query('patientId') patientId?: string,
  ): Promise<ClinicalEncounter[]> {
    return this.documentationService.getEncounters(patientId);
  }

  @Get(':id')
  async getEncounterById(
    @Param('id') id: string,
  ): Promise<ClinicalEncounter> {
    return this.documentationService.getEncounterById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEncounter(
    @Body() dto: CreateEncounterDto,
  ): Promise<ClinicalEncounter> {
    return this.documentationService.createEncounter(dto);
  }

  @Patch(':id')
  async updateEncounter(
    @Param('id') id: string,
    @Body() dto: UpdateEncounterDto,
  ): Promise<ClinicalEncounter> {
    return this.documentationService.updateEncounter(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEncounter(@Param('id') id: string): Promise<void> {
    await this.documentationService.deleteEncounter(id);
  }

  @Post(':id/transcribe')
  @HttpCode(HttpStatus.OK)
  async transcribeAudio(
    @Param('id') id: string,
    @Body() dto: TranscribeAudioDto,
  ): Promise<TranscriptionResponseDto> {
    return this.documentationService.transcribeAudio(id, dto);
  }

  @Put(':id/transcript')
  @HttpCode(HttpStatus.OK)
  async updateTranscript(
    @Param('id') id: string,
    @Body() dto: UpdateTranscriptDto,
  ): Promise<ClinicalEncounter> {
    return this.documentationService.updateTranscript(
      id,
      dto.transcript,
      dto.clinicianId,
    );
  }

  @Post(':id/extract')
  @HttpCode(HttpStatus.OK)
  async extractClinicalInformation(
    @Param('id') id: string,
  ): Promise<ClinicalExtraction> {
    return this.documentationService.extractClinicalInformation(id);
  }

  @Put(':id/extraction')
  @HttpCode(HttpStatus.OK)
  async updateExtraction(
    @Param('id') id: string,
    @Body() dto: UpdateExtractionDto,
  ): Promise<ClinicalEncounter> {
    return this.documentationService.updateExtraction(id, dto.extraction);
  }
}
