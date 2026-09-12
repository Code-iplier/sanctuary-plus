import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChronosModule } from '../modules/chronos/chronos.module';
import { WardWatchModule } from '../modules/wardwatch/wardwatch.module';
import { QueueModule } from '../queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MedicationsModule } from '../modules/medications/medications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DatabaseModule,
    ChronosModule,
    WardWatchModule,
    QueueModule,
    MedicationsModule,
  ],
})
export class AppModule {}
