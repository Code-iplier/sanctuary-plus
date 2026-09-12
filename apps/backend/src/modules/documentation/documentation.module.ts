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
import { SoapProvider, GeminiSoapProvider } from './soap.provider';

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
    {
      provide: SoapProvider,
      useClass: GeminiSoapProvider,
    },
  ],
  exports: [
    DocumentationService,
    TranscriptionProvider,
    ExtractionProvider,
    SoapProvider,
  ],
})
export class DocumentationModule {}

