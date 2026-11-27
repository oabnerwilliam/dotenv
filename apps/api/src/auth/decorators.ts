import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthenticatedRequest } from './request';

export const IS_PUBLIC = 'auth:public';
export const NO_TEAM = 'auth:no-team';
export const ADMIN_ONLY = 'auth:admin-only';

/** A rota não pede token. Tudo o que não for marcado é protegido. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** A rota pede token, mas atende quem ainda não está numa equipe. */
export const NoTeam = () => SetMetadata(NO_TEAM, true);

/** Só admins da equipe. */
export const AdminOnly = () => SetMetadata(ADMIN_ONLY, true);

/** Os dados do token já verificado, no parâmetro do método. */
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);

/**
 * Quem está chamando e a equipe dele, no parâmetro do método. É daqui que sai o `teamId` das
 * consultas, nunca do corpo ou da URL. Não usar em rotas `@Public()` ou `@NoTeam()`.
 */
export const CurrentMember = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().member,
);
