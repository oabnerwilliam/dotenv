import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppError } from '../common/app-error';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_ONLY, IS_PUBLIC, NO_TEAM } from './decorators';
import type { AuthenticatedRequest } from './request';
import { sessionExpired } from './session-expired';

// Guard global, depois do `AuthGuard`: descobre a equipe de quem chama. Nega por padrão; só
// `@Public()` e `@NoTeam()` dispensam.
@Injectable()
export class TeamGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const marked = (key: string) =>
      this.reflector.getAllAndOverride<boolean>(key, [context.getHandler(), context.getClass()]);
    if (marked(IS_PUBLIC) || marked(NO_TEAM)) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    // Sem `auth` o filtro abaixo ficaria vazio, e o Prisma devolveria um vínculo qualquer.
    if (!request.auth) throw sessionExpired();

    // Consultado a cada requisição: remover alguém ou mudar o papel vale na hora.
    const member = await this.prisma.membership.findFirst({
      where: { user: { supabaseId: request.auth.supabaseId } },
      select: { userId: true, teamId: true, role: true },
    });
    if (!member) throw new AppError('NOT_INVITED', 'Você não faz parte de uma equipe.');
    if (marked(ADMIN_ONLY) && member.role !== 'admin') {
      throw new AppError('FORBIDDEN', 'Só admins podem fazer isso.');
    }

    request.member = member;
    return true;
  }
}
