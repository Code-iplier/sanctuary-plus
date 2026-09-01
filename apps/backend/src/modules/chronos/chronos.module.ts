import { Module } from '@nestjs/common';
import { ChronosController } from './chronos.controller';
import { ChronosService } from './chronos.service';

@Module({
  controllers: [ChronosController],
  providers: [ChronosService],
})
export class ChronosModule {}
