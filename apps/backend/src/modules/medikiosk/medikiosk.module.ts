import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { DatabaseModule } from '../../database/database.module';
import { QueueModule } from '../../queue/queue.module';
import { DocumentationModule } from '../documentation/documentation.module';
import { MedikioskController } from './medikiosk.controller';
import { DocumentOcrProvider } from './document-ocr.provider';
import { MedikioskService } from './medikiosk.service';

@Module({
  imports: [AuthModule, DatabaseModule, DocumentationModule, QueueModule],
  controllers: [MedikioskController],
  providers: [MedikioskService, DocumentOcrProvider],
})
export class MedikioskModule {}
