import { Module } from '@nestjs/common';
import { ChronosModule } from '../modules/chronos/chronos.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [ChronosModule, QueueModule],
})
export class AppModule { }