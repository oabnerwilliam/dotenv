import type { CreateTeamInput, Me } from '@env/shared';
import { Inject, Injectable } from '@nestjs/common';
import { IdentityVerifier } from '../auth/identity-verifier';
import type { VerifiedToken } from '../auth/token-verifier';
import { AppError } from '../common/app-error';
import { ENV, type Env } from '../config/env';
import { Prisma } from '../generated/prisma/client';
import { MeService } from '../me/me.service';
import { saveUser } from '../me/save-user';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly identity: IdentityVerifier,
    private readonly me: MeService,
  ) {}

  // Cria a primeira equipe: só o dono do app (`OWNER_EMAIL`), e uma vez só.
  async create(auth: VerifiedToken, input: CreateTeamInput): Promise<Me> {
    // A autorização vem antes de tudo: quem não é o dono nem descobre se a equipe existe.
    const email = await this.identity.verifiedEmail(auth.supabaseId);
    if (email !== this.env.OWNER_EMAIL) {
      throw new AppError('FORBIDDEN', 'Esta conta não pode criar a equipe.');
    }

    try {
      // Tudo ou nada: pessoa, equipe, vínculo de admin e primeiro projeto.
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.team.findFirst({
          where: { singleton: true },
          select: { id: true },
        });
        if (existing) throw alreadyCreated();

        const user = await saveUser(tx, auth, email);
        await tx.team.create({
          data: {
            name: input.name,
            slug: input.slug,
            memberships: { create: { userId: user.id, role: 'admin' } },
            projects: { create: { name: input.project.name, slug: input.project.slug } },
          },
        });
      });
    } catch (error) {
      // Duas requisições ao mesmo tempo passam pela conferência acima. Quem decide é o banco,
      // pelos índices únicos: a segunda recebe P2002 e a transação dela é desfeita.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw alreadyCreated();
      }
      throw error;
    }

    const member = await this.me.findMember(auth.supabaseId);
    if (!member) throw new Error('Equipe criada sem o vínculo de quem a criou.');
    return member;
  }
}

function alreadyCreated(): AppError {
  return new AppError('CONFLICT', 'A equipe já foi criada.');
}
