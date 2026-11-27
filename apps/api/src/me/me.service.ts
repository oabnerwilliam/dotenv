import type { Me } from '@env/shared';
import { Inject, Injectable } from '@nestjs/common';
import { IdentityVerifier } from '../auth/identity-verifier';
import type { VerifiedToken } from '../auth/token-verifier';
import { ENV, type Env } from '../config/env';
import { PrismaService } from '../prisma/prisma.service';
import { saveUser } from './save-user';

type MemberMe = Extract<Me, { state: 'member' }>;

@Injectable()
export class MeService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly identity: IdentityVerifier,
  ) {}

  // Quem é a pessoa para o app. No primeiro acesso de quem foi convidado, o convite vira vínculo.
  async getMe(auth: VerifiedToken): Promise<Me> {
    const member = await this.findMember(auth.supabaseId);
    if (member) return member;

    // Só para quem ainda não é membro: consulta o Supabase (ADR 0002).
    const email = await this.identity.verifiedEmail(auth.supabaseId);
    if (!email) return { state: 'not_invited', email: auth.claimedEmail ?? '' };

    await this.acceptInvite(auth, email);
    // Consulta de novo mesmo sem ter aceitado nada: outra requisição simultânea pode ter aceitado.
    const joined = await this.findMember(auth.supabaseId);
    if (joined) return joined;

    if (email === this.env.OWNER_EMAIL) {
      const team = await this.prisma.team.findFirst({
        where: { singleton: true },
        select: { id: true },
      });
      if (!team) return { state: 'needs_team', email };
    }
    return { state: 'not_invited', email };
  }

  /** A resposta de quem é membro; `null` para os demais. */
  async findMember(supabaseId: string): Promise<MemberMe | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { user: { supabaseId } },
      include: { user: true, team: true },
    });
    if (!membership) return null;

    const { user, team, role } = membership;
    const project = await this.prisma.project.findFirst({
      where: { teamId: team.id, archivedAt: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { slug: true },
    });

    // Campo a campo: o que o banco guardar a mais não vai junto na resposta.
    return {
      state: 'member',
      user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      team: { id: team.id, name: team.name, slug: team.slug },
      role,
      defaultProjectSlug: project?.slug ?? null,
    };
  }

  // Transforma o convite pendente mais antigo em vínculo. Não faz nada se não houver convite.
  private async acceptInvite(auth: VerifiedToken, email: string): Promise<void> {
    // Sem filtro por equipe de propósito: é o convite que diz a qual equipe a pessoa pertence.
    const invite = await this.prisma.invite.findFirst({
      where: { email, status: 'pending' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (!invite) return;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.membership.findFirst({
        where: { user: { OR: [{ email }, { supabaseId: auth.supabaseId }] } },
      });
      // Uma pessoa tem um só vínculo: o convite de outra equipe continua pendente.
      if (existing && existing.teamId !== invite.teamId) {
        await saveUser(tx, auth, email);
        return;
      }

      // A mudança de estado vem antes de tudo e só acontece se o convite ainda estiver pendente.
      // O banco trava a linha: numa disputa, a segunda transação espera a primeira, não encontra
      // mais o convite pendente e para aqui. O mesmo vale para um convite recém-cancelado.
      const claimed = await tx.invite.updateMany({
        where: { id: invite.id, teamId: invite.teamId, status: 'pending' },
        data: { status: 'accepted' },
      });
      if (claimed.count === 0) return;

      const user = await saveUser(tx, auth, email);
      // Quem já tinha o vínculo (conta recriada no Supabase) mantém o papel.
      if (!existing) {
        await tx.membership.create({
          data: { teamId: invite.teamId, userId: user.id, role: invite.role },
        });
      }
    });
  }
}
