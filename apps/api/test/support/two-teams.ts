import { randomUUID } from 'node:crypto';
import type { Role } from '@env/shared';
import type { PrismaService } from '../../src/prisma/prisma.service';

// Duas equipes completas, para provar que uma nunca enxerga a outra. Usar nos testes de
// isolamento de toda rota de negócio. Pressupõe o banco vazio (`resetDb`).
export async function createTwoTeams(prisma: PrismaService) {
  async function createTeam(slug: string, name: string, singleton: boolean) {
    const team = await prisma.team.create({ data: { name, slug, singleton } });
    const project = await prisma.project.create({
      data: { teamId: team.id, name: `Projeto ${name}`, slug: `projeto-${slug}` },
    });

    const createPerson = async (role: Role) => {
      const user = await prisma.user.create({
        data: {
          supabaseId: randomUUID(),
          email: `${role}@${slug}.example`,
          name: `${role} ${name}`,
        },
      });
      await prisma.membership.create({ data: { teamId: team.id, userId: user.id, role } });
      return user;
    };

    return {
      team,
      project,
      admin: await createPerson('admin'),
      member: await createPerson('member'),
    };
  }

  return {
    a: await createTeam('acme', 'Acme', true),
    // Só uma equipe pode ser `singleton`; a segunda existe apenas nos testes.
    b: await createTeam('vega', 'Vega', false),
  };
}
