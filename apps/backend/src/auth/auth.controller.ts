import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { PatientLoginInput, StaffLoginInput } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('staff/login')
  loginStaff(@Body() input: StaffLoginInput) {
    return this.auth.loginStaff(input);
  }

  @Post('patient/login')
  loginPatient(@Body() input: PatientLoginInput) {
    return this.auth.loginPatient(input);
  }
}
