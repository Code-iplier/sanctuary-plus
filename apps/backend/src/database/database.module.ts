import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SyntheticCohortService } from './synthetic-cohort';

@Global()
@Module({
  providers: [PrismaService, SyntheticCohortService],
  exports: [PrismaService],
})
export class DatabaseModule {}
