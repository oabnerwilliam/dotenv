import { randomUUID } from 'node:crypto';
import { apiErrorSchema, meSchema, type Role } from '@env/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { IdentityVerifier } from '../src/auth/identity-verifier';
import { JWKS } from '../src/auth/token-verifier';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';
import { createIdentityStub, createTestAuth } from './support/auth';
import { resetDb } from './support/reset-db';
import { createTwoTeams } from './support/two-teams';

const OWNER = 'dono@acme.example';
const GUEST = 'convidada@acme.example';

describe('GET /me', () => {
  const identity = createIdentityStub();
  let auth: Awaited<ReturnType<typeof createTestAuth>>;
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    auth = await createTestAuth(process.env.SUPABASE_URL as string);
    app = await createApp((builder) =>
      builder
        .overrideProvider(JWKS)
        .useValue(auth.jwks)
        .overrideProvider(IdentityVerifier)
        .useValue(identity),
    );
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    identity.reset();
    identity.verifiedEmail.mockClear();
  });

  afterAll(async () => {
    if (prisma) await resetDb(prisma);
    await app?.close();
  });

  /** Uma pessoa com token; `verified` é o e-mail que o Google confirmou (ou nenhum). */
  function person(verified?: string, claims: Record<string, unknown> = {}) {
    const supabaseId = randomUUID();
    if (verified) identity.emails.set(supabaseId, verified);
    const token = auth.signToken({
      claims: { sub: supabaseId, email: verified ?? 'sem-verificacao@acme.example', ...claims },
    });
    return { supabaseId, token };
  }

  async function getMe(token: Promise<string>) {
    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${await token}`)
      .expect(200);
    // O contrato não aceita campos faltando; a comparação pega os que sobrarem.
    const me = meSchema.parse(response.body);
    expect(response.body).toEqual(me);
    return me;
  }

  async function invite(teams: Awaited<ReturnType<typeof createTwoTeams>>['a'], role: Role) {
    return prisma.invite.create({
      data: { teamId: teams.team.id, email: GUEST, role, invitedById: teams.admin.id },
    });
  }

  it('sem token responde 401', async () => {
    const response = await request(app.getHttpServer()).get('/me').expect(401);

    expect(apiErrorSchema.parse(response.body).code).toBe('UNAUTHENTICATED');
  });

  describe('membro', () => {
    it('recebe a própria equipe, papel e o projeto ativo mais antigo dela', async () => {
      const { a, b } = await createTwoTeams(prisma);
      // Na equipe B há um projeto arquivado mais antigo; na A, um mais antigo que todos.
      await prisma.project.create({
        data: {
          teamId: a.team.id,
          name: 'Da outra equipe',
          slug: 'da-outra',
          createdAt: new Date('2020-01-01T00:00:00Z'),
        },
      });
      await prisma.project.create({
        data: {
          teamId: b.team.id,
          name: 'Arquivado',
          slug: 'arquivado',
          createdAt: new Date('2021-01-01T00:00:00Z'),
          archivedAt: new Date(),
        },
      });
      await prisma.project.create({
        data: { teamId: b.team.id, name: 'Mais novo', slug: 'mais-novo' },
      });

      const me = await getMe(
        auth.signToken({ claims: { sub: b.member.supabaseId, email: 'x@acme.example' } }),
      );

      expect(me).toEqual({
        state: 'member',
        user: { id: b.member.id, name: b.member.name, email: b.member.email, avatarUrl: null },
        team: { id: b.team.id, name: b.team.name, slug: b.team.slug },
        role: 'member',
        defaultProjectSlug: b.project.slug,
      });
      // Equipe e papel vêm do banco: o Supabase não é consultado para quem já é membro.
      expect(identity.verifiedEmail).not.toHaveBeenCalled();
    });

    it('sem projeto ativo recebe defaultProjectSlug null', async () => {
      const { a } = await createTwoTeams(prisma);
      await prisma.project.updateMany({
        where: { teamId: a.team.id },
        data: { archivedAt: new Date() },
      });

      const me = await getMe(auth.signToken({ claims: { sub: a.admin.supabaseId } }));

      expect(me).toMatchObject({ state: 'member', role: 'admin', defaultProjectSlug: null });
    });
  });

  describe('aceite de convite', () => {
    it.each(['admin', 'member'] as const)(
      'quem tem convite pendente de %s vira membro da equipe que convidou',
      async (role) => {
        const { b } = await createTwoTeams(prisma);
        const pending = await invite(b, role);
        const { supabaseId, token } = person(GUEST, {
          user_metadata: { full_name: 'Convidada', avatar_url: 'https://img.acme.example/c.png' },
        });

        const me = await getMe(token);

        expect(me).toMatchObject({
          state: 'member',
          role,
          team: { id: b.team.id },
          user: {
            name: 'Convidada',
            email: GUEST,
            avatarUrl: 'https://img.acme.example/c.png',
          },
        });
        await expect(
          prisma.invite.findUniqueOrThrow({ where: { id: pending.id } }),
        ).resolves.toMatchObject({ status: 'accepted' });
        await expect(prisma.membership.count({ where: { user: { supabaseId } } })).resolves.toBe(1);
      },
    );

    it('convite cancelado ou já aceito não vale', async () => {
      const { a } = await createTwoTeams(prisma);
      for (const status of ['canceled', 'accepted'] as const) {
        const created = await invite(a, 'member');
        await prisma.invite.update({ where: { id: created.id }, data: { status } });
      }

      const me = await getMe(person(GUEST).token);

      expect(me).toEqual({ state: 'not_invited', email: GUEST });
      await expect(prisma.user.count({ where: { email: GUEST } })).resolves.toBe(0);
    });

    it('com User já existente, liga o vínculo a ele e atualiza o supabaseId', async () => {
      const { a } = await createTwoTeams(prisma);
      const old = await prisma.user.create({
        data: { supabaseId: randomUUID(), email: GUEST, name: 'Nome antigo' },
      });
      await invite(a, 'member');
      const { supabaseId, token } = person(GUEST);

      const me = await getMe(token);

      expect(me).toMatchObject({ state: 'member', user: { id: old.id } });
      await expect(prisma.user.findUniqueOrThrow({ where: { id: old.id } })).resolves.toMatchObject(
        { supabaseId, name: 'Pessoa de Teste' },
      );
    });

    it('com a mesma conta e outro e-mail, reaproveita o User', async () => {
      const { a } = await createTwoTeams(prisma);
      const { supabaseId, token } = person(GUEST);
      const old = await prisma.user.create({
        data: { supabaseId, email: 'antigo@acme.example', name: 'Pessoa' },
      });
      await invite(a, 'member');

      const me = await getMe(token);

      expect(me).toMatchObject({ state: 'member', user: { id: old.id, email: GUEST } });
    });

    // Conta recriada no Supabase: a pessoa já é membro, mas com o id antigo.
    it('quem já tem vínculo não ganha um segundo nem muda de papel', async () => {
      const { a } = await createTwoTeams(prisma);
      await prisma.invite.create({
        data: {
          teamId: a.team.id,
          email: a.member.email,
          role: 'admin',
          invitedById: a.admin.id,
        },
      });

      const me = await getMe(person(a.member.email).token);

      expect(me).toMatchObject({ state: 'member', role: 'member', user: { id: a.member.id } });
      await expect(prisma.membership.count({ where: { userId: a.member.id } })).resolves.toBe(1);
    });

    // O vínculo é único por pessoa: um convite de outra equipe não a move.
    it('convite de outra equipe para quem já tem vínculo não troca a equipe', async () => {
      const { a, b } = await createTwoTeams(prisma);
      const other = await prisma.invite.create({
        data: { teamId: b.team.id, email: a.member.email, role: 'admin', invitedById: b.admin.id },
      });

      const me = await getMe(person(a.member.email).token);

      expect(me).toMatchObject({ state: 'member', role: 'member', team: { id: a.team.id } });
      await expect(
        prisma.invite.findUniqueOrThrow({ where: { id: other.id } }),
      ).resolves.toMatchObject({ status: 'pending' });
    });

    it('duas chamadas simultâneas respondem member e criam um só vínculo', async () => {
      const { a } = await createTwoTeams(prisma);
      await invite(a, 'member');
      const { supabaseId, token } = person(GUEST);
      identity.holdUntil(2);

      const answers = await Promise.all([getMe(token), getMe(token)]);

      expect(answers.map((me) => me.state)).toEqual(['member', 'member']);
      await expect(prisma.membership.count({ where: { user: { supabaseId } } })).resolves.toBe(1);
    });
  });

  describe('sem equipe e sem convite', () => {
    it('o dono, sem equipe criada, recebe needs_team', async () => {
      await expect(getMe(person(OWNER).token)).resolves.toEqual({
        state: 'needs_team',
        email: OWNER,
      });
    });

    it('uma equipe que não é a principal não conta como equipe criada', async () => {
      await prisma.team.create({ data: { name: 'Vega', slug: 'vega', singleton: false } });

      await expect(getMe(person(OWNER).token)).resolves.toMatchObject({ state: 'needs_team' });
    });

    it('o dono, com a equipe já criada e sem vínculo, recebe not_invited', async () => {
      await createTwoTeams(prisma);

      await expect(getMe(person(OWNER).token)).resolves.toEqual({
        state: 'not_invited',
        email: OWNER,
      });
    });

    it('outra pessoa, sem equipe criada, recebe not_invited', async () => {
      await expect(getMe(person(GUEST).token)).resolves.toEqual({
        state: 'not_invited',
        email: GUEST,
      });
    });
  });

  describe('e-mail não verificado', () => {
    // O e-mail do token aparece na tela, mas não decide nada.
    it('não aceita o convite feito para o e-mail do token', async () => {
      const { a } = await createTwoTeams(prisma);
      await invite(a, 'admin');
      const { supabaseId, token } = person(undefined, { email: GUEST });

      await expect(getMe(token)).resolves.toEqual({ state: 'not_invited', email: GUEST });
      await expect(prisma.membership.count({ where: { user: { supabaseId } } })).resolves.toBe(0);
      await expect(prisma.user.count({ where: { email: GUEST } })).resolves.toBe(0);
    });

    it('não dá needs_team a quem só tem o e-mail do dono no token', async () => {
      await expect(getMe(person(undefined, { email: OWNER }).token)).resolves.toEqual({
        state: 'not_invited',
        email: OWNER,
      });
    });

    it('sem e-mail no token, devolve email vazio', async () => {
      await expect(getMe(person(undefined, { email: undefined }).token)).resolves.toEqual({
        state: 'not_invited',
        email: '',
      });
    });
  });

  it('Supabase indisponível responde 500, e não "sessão expirada"', async () => {
    identity.verifiedEmail.mockRejectedValueOnce(new Error('Auth fora'));

    const response = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${await person(GUEST).token}`)
      .expect(500);

    expect(apiErrorSchema.parse(response.body).code).toBe('INTERNAL');
  });
});
