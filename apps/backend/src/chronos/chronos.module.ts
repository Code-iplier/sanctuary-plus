import { Module } from '@nestjs/common';
import { ChronosController } from './chronos.controller';
import { ChronosBridgeService } from './chronos.service';

@Module({
  controllers: [ChronosController],
  providers: [ChronosBridgeService],
  exports: [ChronosBridgeService],
})
export class ChronosModule {}
