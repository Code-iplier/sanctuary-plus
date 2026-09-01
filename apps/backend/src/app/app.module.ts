import { Module } from '@nestjs/common';
import { ChronosModule } from '../modules/chronos/chronos.module';

@Module({
  imports: [ChronosModule],
})
export class AppModule {}
