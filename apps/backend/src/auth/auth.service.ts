import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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
  constructor(private readonly jwt: JwtService) {}

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
    if (!input.patientId?.trim()) {
      throw new UnauthorizedException('A patient ID is required');
    }
    return this.issue({
      sub: input.patientId,
      role: 'patient',
      patientId: input.patientId,
      displayName: input.name,
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
