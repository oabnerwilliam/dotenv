import { randomUUID } from 'node:crypto';
import { apiErrorSchema } from '@env/shared';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AdminOnly, CurrentMember } from '../src/auth/decorators';
import type { Member } from '../src/auth/request';
import { JWKS } from '../src/auth/token-verifier';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';
import { createTestAuth } from './support/auth';
import { resetDb } from './support/reset-db';
import { createTwoTeams } from './support/two-teams';

// Rota de negócio de mentira. A primeira não tem decorator nenhum: a equipe é exigida por padrão.
@Controller('probe-team')
class ProbeTeamController {
  @Get()
  get(@CurrentMember() member: Member) {
    return member;
  }

  @AdminOnly()
  @Get('admin')
  admin() {
    return { ok: true };
  }
}

describe('guard de equipe', () => {
  let auth: Awaited<ReturnType<typeof createTestAuth>>;
  let app: INestApplication;
  let prisma: PrismaService;
  let teams: Awaited<ReturnType<typeof createTwoTeams>>;

  beforeAll(async () => {
    auth = await createTestAuth(process.env.SUPABASE_URL as string);
    app = await createApp(
      (builder) => builder.overrideProvider(JWKS).useValue(auth.jwks),
      [ProbeTeamController],
    );
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    teams = await createTwoTeams(prisma);
  });

  afterAll(async () => {
    if (prisma) await resetDb(prisma);
    await app?.close();
  });

  async function get(path: string, supabaseId: string, claims: Record<string, unknown> = {}) {
    const token = await auth.signToken({ claims: { sub: supabaseId, ...claims } });
    return request(app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`);
  }

  const NOT_INVITED = {
    code: 'NOT_INVITED',
    message: 'Você não faz parte de uma equipe.',
  };

  it('quem não é membro recebe 403 NOT_INVITED', async () => {
    const response = await get('/probe-team', randomUUID());

    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(response.body)).toEqual(NOT_INVITED);
  });

  it('o e-mail de um membro no token não abre a porta', async () => {
    const response = await get('/probe-team', randomUUID(), { email: teams.a.admin.email });

    expect(response.status).toBe(403);
  });

  // O papel e a equipe vêm do banco, nunca do token.
  it('claims de equipe e papel no token são ignorados', async () => {
    const forged = { role: 'admin', teamId: teams.b.team.id };
    const claims = { ...forged, app_metadata: { provider: 'google', ...forged } };

    const own = await get('/probe-team', teams.a.member.supabaseId, claims);
    const admin = await get('/probe-team/admin', teams.a.member.supabaseId, claims);

    expect(own.body).toEqual({
      userId: teams.a.member.id,
      teamId: teams.a.team.id,
      role: 'member',
    });
    expect(admin.status).toBe(403);
  });

  it('cada pessoa recebe a própria equipe', async () => {
    for (const { team, admin, member } of [teams.a, teams.b]) {
      await expect(get('/probe-team', admin.supabaseId)).resolves.toMatchObject({
        status: 200,
        body: { userId: admin.id, teamId: team.id, role: 'admin' },
      });
      await expect(get('/probe-team', member.supabaseId)).resolves.toMatchObject({
        status: 200,
        body: { userId: member.id, teamId: team.id, role: 'member' },
      });
    }
  });

  it('admin passa numa rota @AdminOnly', async () => {
    expect((await get('/probe-team/admin', teams.a.admin.supabaseId)).status).toBe(200);
  });

  it('membro comum numa rota @AdminOnly recebe 403 FORBIDDEN', async () => {
    const response = await get('/probe-team/admin', teams.a.member.supabaseId);

    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(response.body)).toEqual({
      code: 'FORBIDDEN',
      message: 'Só admins podem fazer isso.',
    });
  });

  it('quem não é membro numa rota @AdminOnly recebe NOT_INVITED', async () => {
    const response = await get('/probe-team/admin', randomUUID());

    expect(response.body).toEqual(NOT_INVITED);
  });

  it('membro removido do banco perde o acesso na requisição seguinte', async () => {
    const { member } = teams.a;
    expect((await get('/probe-team', member.supabaseId)).status).toBe(200);

    await prisma.membership.delete({ where: { userId: member.id } });

    const response = await get('/probe-team', member.supabaseId);
    expect(response.status).toBe(403);
    expect(response.body).toEqual(NOT_INVITED);
  });

  it('mudança de papel vale na requisição seguinte', async () => {
    const { admin } = teams.a;
    expect((await get('/probe-team/admin', admin.supabaseId)).status).toBe(200);

    await prisma.membership.update({ where: { userId: admin.id }, data: { role: 'member' } });

    expect((await get('/probe-team/admin', admin.supabaseId)).status).toBe(403);
  });

  it('sem token responde 401, antes de olhar a equipe', async () => {
    await request(app.getHttpServer()).get('/probe-team').expect(401);
  });
});
