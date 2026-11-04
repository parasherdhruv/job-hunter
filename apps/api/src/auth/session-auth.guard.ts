import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { AuthenticatedUser, AuthService } from './auth.service';

export const SESSION_COOKIE_NAME = 'ajh_session';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Authentication required.');
    }

    const user = await this.authService.resolveSession(token);
    if (!user) {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    request.user = user;
    return true;
  }

  private extractToken(request: Request): string | null {
    const cookieToken = (request.cookies as Record<string, string> | undefined)?.[
      SESSION_COOKIE_NAME
    ];
    if (cookieToken) return cookieToken;

    const header = request.headers.authorization;
    if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();

    return null;
  }
}
