import { Module } from '@nestjs/common';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import {
  TranscriptionProvider,
  GeminiTranscriptionProvider,
} from './transcription.provider';

@Module({
  controllers: [DocumentationController],
  providers: [
    DocumentationService,
    {
      provide: TranscriptionProvider,
      useClass: GeminiTranscriptionProvider,
    },
  ],
  exports: [DocumentationService, TranscriptionProvider],
})
export class DocumentationModule {}
