import { Module } from '@nestjs/common';
import { ChronosModule } from '../modules/chronos/chronos.module';
import { WardWatchModule } from '../modules/wardwatch/wardwatch.module';

@Module({
  imports: [ChronosModule, WardWatchModule],
})
export class AppModule {}
