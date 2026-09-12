import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

export type MedicationActor = {
  role: 'patient' | 'staff';
  patientId?: string;
};

export function getMedicationActor(
  roleHeader?: string,
  patientIdHeader?: string,
): MedicationActor {
  const role = roleHeader?.toLowerCase();
  if (role !== 'patient' && role !== 'staff') {
    throw new UnauthorizedException('A patient or staff session is required');
  }

  if (role === 'patient' && !patientIdHeader) {
    throw new UnauthorizedException('The patient session has no patient ID');
  }

  return { role, patientId: patientIdHeader };
}

export function assertPatientAccess(
  actor: MedicationActor,
  patientId: string,
): void {
  if (actor.role === 'patient' && actor.patientId !== patientId) {
    throw new ForbiddenException(
      'Patients may only access their own medications',
    );
  }
}

export function assertStaff(actor: MedicationActor): void {
  if (actor.role !== 'staff') {
    throw new ForbiddenException('Hospital staff access is required');
  }
}
