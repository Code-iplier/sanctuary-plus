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
import {
  PrescriptionProvider,
  GeminiPrescriptionProvider,
} from './prescription.provider';
import {
  DiagnosisProvider,
  GeminiDiagnosisProvider,
} from './diagnosis.provider';

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
    {
      provide: PrescriptionProvider,
      useClass: GeminiPrescriptionProvider,
    },
    {
      provide: DiagnosisProvider,
      useClass: GeminiDiagnosisProvider,
    },
  ],
  exports: [
    DocumentationService,
    TranscriptionProvider,
    ExtractionProvider,
    SoapProvider,
    PrescriptionProvider,
    DiagnosisProvider,
  ],
})
export class DocumentationModule {}


