import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QueueController } from './queue.controller';
import { QueueGateway } from './queue.gateway';
import { QueueService } from './queue.service';
import { QueueStore } from './queue.store';

@Module({
  imports: [AuthModule],
  controllers: [QueueController],
  providers: [QueueStore, QueueService, QueueGateway],
  exports: [QueueService, QueueStore],
})
export class QueueModule {}
