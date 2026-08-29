import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChronosModule } from '../chronos/chronos.module';

@Module({
  imports: [ChronosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
