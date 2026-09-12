import { Module } from '@nestjs/common';
import { ChronosModule } from '../modules/chronos/chronos.module';
import { WardWatchModule } from '../modules/wardwatch/wardwatch.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [ChronosModule, WardWatchModule, QueueModule],
})
export class AppModule { }
