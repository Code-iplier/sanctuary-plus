import { Module } from '@nestjs/common';
import { ChronosModule } from '../modules/chronos/chronos.module';
import { DocumentationModule } from '../modules/documentation/documentation.module';

@Module({
  imports: [ChronosModule, DocumentationModule],
})
export class AppModule {}
