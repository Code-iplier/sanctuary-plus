import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';

export type AuthenticatedRequest = Request & { user?: AuthUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('A Bearer access token is required');
    }
    const token = header.slice('Bearer '.length).trim();
    if (!token)
      throw new UnauthorizedException('A Bearer access token is required');
    try {
      request.user = await this.auth.verify(token);
      request.headers['x-sanctuary-role'] = request.user.role;
      if (request.user.patientId) {
        request.headers['x-sanctuary-patient-id'] = request.user.patientId;
      }
      return true;
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired');
    }
  }
}
