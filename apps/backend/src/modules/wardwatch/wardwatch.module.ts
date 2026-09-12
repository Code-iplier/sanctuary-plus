import { Module } from '@nestjs/common';
import { WardWatchController } from './wardwatch.controller';
import { WardWatchService } from './wardwatch.service';
import { WardWatchStore } from './wardwatch.store';
import { WardWatchScheduler } from './wardwatch.scheduler';

@Module({
  controllers: [WardWatchController],
  providers: [WardWatchService, WardWatchStore, WardWatchScheduler],
})
export class WardWatchModule {}
