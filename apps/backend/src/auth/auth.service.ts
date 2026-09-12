import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import type {
  AuthResponse,
  AuthUser,
  PatientLoginInput,
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
    const displayName = input.name?.trim() || patientId;
    await this.prisma.patient.upsert({
      where: { id: patientId },
      update: { displayName },
      create: { id: patientId, displayName },
    });
    return this.issue({
      sub: patientId,
      role: 'patient',
      patientId,
      displayName,
    });
  }

  async issue(user: AuthUser): Promise<AuthResponse> {
    const accessToken = await this.jwt.signAsync(user);
    return { accessToken, tokenType: 'Bearer', user };
  }

  async verify(token: string): Promise<AuthUser> {
    return this.jwt.verifyAsync<AuthUser>(token);
  }
}
