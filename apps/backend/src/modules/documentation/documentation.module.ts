import { Module } from '@nestjs/common';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import {
  TranscriptionProvider,
  GeminiTranscriptionProvider,
} from './transcription.provider';
import {
  ExtractionProvider,
  GeminiExtractionProvider,
} from './extraction.provider';

@Module({
  controllers: [DocumentationController],
  providers: [
    DocumentationService,
    {
      provide: TranscriptionProvider,
      useClass: GeminiTranscriptionProvider,
    },
    {
      provide: ExtractionProvider,
      useClass: GeminiExtractionProvider,
    },
  ],
  exports: [DocumentationService, TranscriptionProvider, ExtractionProvider],
})
export class DocumentationModule {}
