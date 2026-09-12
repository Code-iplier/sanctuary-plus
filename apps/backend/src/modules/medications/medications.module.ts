import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import {
  MedicationsController,
  PatientMedicationsController,
} from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedicationsRepository } from './medications.repository';
import { MedicationRulesEngine } from './rules/medication-rules.engine';

@Module({
  imports: [AuthModule],
  controllers: [PatientMedicationsController, MedicationsController],
  providers: [MedicationsService, MedicationsRepository, MedicationRulesEngine],
  exports: [MedicationsService],
})
export class MedicationsModule {}
