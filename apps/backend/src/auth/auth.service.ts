import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import type {
  AuthResponse,
  AuthUser,
  PatientLoginInput,
  PatientRegistrationInput,
  StaffLoginInput,
} from './auth.types';

const STAFF_ACCOUNTS = [
  {
    username: 'staff@hospital.demo',
    password: 'staff123',
    displayName: 'Front Desk Team',
  },
  {
    username: 'admin@hospital.demo',
    password: 'admin123',
    displayName: 'Operations Admin',
  },
] as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async loginStaff(input: StaffLoginInput): Promise<AuthResponse> {
    const account = STAFF_ACCOUNTS.find(
      (candidate) =>
        candidate.username === input.username &&
        candidate.password === input.password,
    );
    if (!account) throw new UnauthorizedException('Invalid staff credentials');

    return this.issue({
      sub: account.username,
      role: 'staff',
      username: account.username,
      displayName: account.displayName,
    });
  }

  async loginPatient(input: PatientLoginInput): Promise<AuthResponse> {
    const patientId = input.patientId?.trim();
    if (!patientId) {
      throw new UnauthorizedException('A patient ID is required');
    }
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new UnauthorizedException('Patient record not found. Please register first.');
    const phone = input.phone?.replace(/\D/g, '');
    if (patient.phone && phone && patient.phone !== phone) {
      throw new UnauthorizedException('The mobile number does not match this patient record.');
    }
    return this.issue({
      sub: patientId,
      role: 'patient',
      patientId,
      displayName: patient.displayName,
    });
  }

  async lookupPatient(phoneInput: string) {
    const phone = phoneInput.replace(/\D/g, '');
    if (phone.length !== 10) throw new BadRequestException('Enter a valid 10-digit mobile number.');
    const patient = await this.prisma.patient.findUnique({ where: { phone } });
    return patient ? this.patientDirectoryRecord(patient) : null;
  }

  async registerPatient(input: PatientRegistrationInput) {
    const name = input.name?.trim();
    const phone = input.phone?.replace(/\D/g, '');
    if (!name) throw new BadRequestException('Patient full name is required.');
    if (phone.length !== 10) throw new BadRequestException('Enter a valid 10-digit mobile number.');
    const existing = await this.prisma.patient.findUnique({ where: { phone } });
    if (existing) return this.patientDirectoryRecord(existing);
    const parsedAge = Number(input.age);
    const created = await this.prisma.patient.create({
      data: {
        displayName: name,
        phone,
        gender: input.gender?.trim() || null,
        age: Number.isInteger(parsedAge) && parsedAge > 0 && parsedAge <= 120 ? parsedAge : null,
      },
    });
    const patient = await this.prisma.patient.update({
      where: { id: created.id },
      data: { externalId: `ABHA-SYN-${created.id.slice(-8).toUpperCase()}` },
    });
    return this.patientDirectoryRecord(patient);
  }

  private patientDirectoryRecord(patient: { id: string; externalId: string | null; displayName: string; phone: string | null; age: number | null; gender: string | null; createdAt: Date }) {
    return {
      id: patient.id,
      name: patient.displayName,
      phone: patient.phone ?? '',
      age: patient.age === null ? undefined : String(patient.age),
      gender: patient.gender ?? undefined,
      abhaId: patient.externalId ?? `ABHA-SYN-${patient.id.slice(-8).toUpperCase()}`,
      createdAt: patient.createdAt.toISOString(),
    };
  }

  async issue(user: AuthUser): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync(user);
    return { accessToken, tokenType: 'Bearer', user };
  }

  async verify(token: string): Promise<AuthUser> {
    return this.jwt.verifyAsync<AuthUser>(token);
  }
}
