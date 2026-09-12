import { Module } from '@nestjs/common';
import {
  MedicationsController,
  PatientMedicationsController,
} from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedicationsRepository } from './medications.repository';
import { MedicationRulesEngine } from './rules/medication-rules.engine';

@Module({
  controllers: [PatientMedicationsController, MedicationsController],
  providers: [MedicationsService, MedicationsRepository, MedicationRulesEngine],
  exports: [MedicationsService],
})
export class MedicationsModule {}
