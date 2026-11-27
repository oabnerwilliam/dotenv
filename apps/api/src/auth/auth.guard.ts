import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC } from './decorators';
import type { AuthenticatedRequest } from './request';
import { sessionExpired } from './session-expired';
import { TokenVerifier } from './token-verifier';

const BEARER = /^Bearer (\S+)$/i;

// Guard global: exige `Authorization: Bearer <token>` em toda rota sem `@Public()`.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = BEARER.exec(request.headers.authorization ?? '')?.[1];
    if (!token) throw sessionExpired();

    request.auth = await this.tokens.verify(token);
    return true;
  }
}
