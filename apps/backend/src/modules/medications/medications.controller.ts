import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { MedicationsService } from './medications.service';
import type {
  CreateAllergyInput,
  CreateMedicationInput,
  MedicationVerificationStatus,
  ReconcileMedicationInput,
} from './medications.types';
import {
  assertPatientAccess,
  assertStaff,
  getMedicationActor,
} from './medications.auth';

@Controller('patients/:patientId')
@UseGuards(JwtAuthGuard)
export class PatientMedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get('medications')
  list(
    @Param('patientId') patientId: string,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertPatientAccess(getMedicationActor(role, actorPatientId), patientId);
    return this.medicationsService.list(patientId);
  }

  @Post('medications')
  create(
    @Param('patientId') patientId: string,
    @Body() input: CreateMedicationInput,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    const actor = getMedicationActor(role, actorPatientId);
    assertPatientAccess(actor, patientId);
    if (actor.role === 'patient' && input.source !== 'home') {
      assertStaff(actor);
    }
    return this.medicationsService.create(patientId, input);
  }

  @Get('allergies')
  listAllergies(
    @Param('patientId') patientId: string,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertPatientAccess(getMedicationActor(role, actorPatientId), patientId);
    return this.medicationsService.listAllergies(patientId);
  }

  @Post('allergies')
  createAllergy(
    @Param('patientId') patientId: string,
    @Body() input: CreateAllergyInput,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    const actor = getMedicationActor(role, actorPatientId);
    assertPatientAccess(actor, patientId);
    return this.medicationsService.createAllergy(patientId, input);
  }

  @Get('interactions')
  listInteractions(
    @Param('patientId') patientId: string,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertPatientAccess(getMedicationActor(role, actorPatientId), patientId);
    return this.medicationsService.listInteractions(patientId);
  }

  @Get('medication-safety')
  safety(
    @Param('patientId') patientId: string,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertPatientAccess(getMedicationActor(role, actorPatientId), patientId);
    return this.medicationsService.getSafety(patientId);
  }

  @Get('medication-history')
  history(
    @Param('patientId') patientId: string,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertPatientAccess(getMedicationActor(role, actorPatientId), patientId);
    return this.medicationsService.listHistory(patientId);
  }

  @Get('medication-audit')
  audit(
    @Param('patientId') patientId: string,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    const actor = getMedicationActor(role, actorPatientId);
    assertStaff(actor);
    return this.medicationsService.listAuditEvents(patientId);
  }

  @Get('medication-comparison')
  comparison(
    @Param('patientId') patientId: string,
    @Query('source') source = 'home',
    @Query('current') current = 'hospital',
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertPatientAccess(getMedicationActor(role, actorPatientId), patientId);
    return this.medicationsService.compareSources(
      patientId,
      source as CreateMedicationInput['source'],
      current as CreateMedicationInput['source'],
    );
  }
}

@Controller('medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  @Get('patients')
  listPatients(
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertStaff(getMedicationActor(role, actorPatientId));
    return this.medicationsService.listPatients();
  }

  @Post(':medicationId/reconcile')
  reconcile(
    @Param('medicationId') medicationId: string,
    @Body() input: ReconcileMedicationInput,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertStaff(getMedicationActor(role, actorPatientId));
    return this.medicationsService.reconcile(medicationId, input);
  }

  @Patch(':medicationId/reconcile')
  reconcilePatch(
    @Param('medicationId') medicationId: string,
    @Body() input: ReconcileMedicationInput,
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertStaff(getMedicationActor(role, actorPatientId));
    return this.medicationsService.reconcile(medicationId, input);
  }

  @Patch(':medicationId/verification')
  verify(
    @Param('medicationId') medicationId: string,
    @Body()
    input: {
      verificationStatus: MedicationVerificationStatus;
      reason: string;
      changedBy: string;
    },
    @Headers('x-sanctuary-role') role: string | undefined,
    @Headers('x-sanctuary-patient-id') actorPatientId: string | undefined,
  ) {
    assertStaff(getMedicationActor(role, actorPatientId));
    return this.medicationsService.verify(
      medicationId,
      input.verificationStatus,
      input.changedBy,
      input.reason,
    );
  }
}
