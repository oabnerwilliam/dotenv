import { randomUUID } from 'node:crypto';
import { apiErrorSchema, meSchema } from '@env/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { IdentityVerifier } from '../src/auth/identity-verifier';
import { JWKS } from '../src/auth/token-verifier';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';
import { createIdentityStub, createTestAuth } from './support/auth';
import { resetDb } from './support/reset-db';

const OWNER = 'dono@acme.example';
const BODY = {
  name: '  Acme  ',
  slug: 'acme',
  project: { name: 'Atlas', slug: 'atlas' },
};

describe('POST /team', () => {
  const identity = createIdentityStub();
  const previousOwner = process.env.OWNER_EMAIL;
  let auth: Awaited<ReturnType<typeof createTestAuth>>;
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Com maiúsculas e espaços: a comparação precisa ser entre e-mails normalizados.
    process.env.OWNER_EMAIL = '  Dono@Acme.Example ';
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
  });

  afterAll(async () => {
    process.env.OWNER_EMAIL = previousOwner;
    if (prisma) await resetDb(prisma);
    await app?.close();
  });

  function person(verified?: string) {
    const supabaseId = randomUUID();
    if (verified) identity.emails.set(supabaseId, verified);
    const token = auth.signToken({ claims: { sub: supabaseId, email: verified ?? OWNER } });
    return { supabaseId, token };
  }

  async function postTeam(token: Promise<string>, body: object = BODY) {
    return request(app.getHttpServer())
      .post('/team')
      .set('Authorization', `Bearer ${await token}`)
      .send(body);
  }

  async function counts() {
    const [teams, users, memberships, projects] = await Promise.all([
      prisma.team.count(),
      prisma.user.count(),
      prisma.membership.count(),
      prisma.project.count(),
    ]);
    return { teams, users, memberships, projects };
  }

  const NOTHING = { teams: 0, users: 0, memberships: 0, projects: 0 };
  const ONE_EACH = { teams: 1, users: 1, memberships: 1, projects: 1 };

  it('o dono cria a equipe, vira admin e ganha o primeiro projeto', async () => {
    const { supabaseId, token } = person(OWNER);

    const response = await postTeam(token);

    expect(response.status).toBe(201);
    const me = meSchema.parse(response.body);
    expect(me).toMatchObject({
      state: 'member',
      role: 'admin',
      user: { email: OWNER, name: 'Pessoa de Teste' },
      team: { name: 'Acme', slug: 'acme' },
      defaultProjectSlug: 'atlas',
    });
    await expect(counts()).resolves.toEqual(ONE_EACH);
    await expect(
      prisma.team.findFirstOrThrow({
        include: { memberships: { include: { user: true } }, projects: true },
      }),
    ).resolves.toMatchObject({
      singleton: true,
      memberships: [{ role: 'admin', user: { supabaseId, email: OWNER } }],
      projects: [
        {
          name: 'Atlas',
          slug: 'atlas',
          ticketRegex: '[A-Z]+-\\d+',
          defaultDuration: 'D1',
          validateConsistency: true,
          archivedAt: null,
        },
      ],
    });

    const again = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${await token}`)
      .expect(200);
    expect(again.body).toEqual(response.body);
  });

  it('requisições simultâneas criam uma só equipe: um 201 e os outros 409', async () => {
    const { token } = person(OWNER);
    identity.holdUntil(5);

    const responses = await Promise.all(Array.from({ length: 5 }, () => postTeam(token)));

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409, 409]);
    await expect(counts()).resolves.toEqual(ONE_EACH);
  });

  // A garantia da requisição acima é do banco, não da conferência feita no código.
  it('o banco recusa uma segunda equipe principal', async () => {
    await prisma.team.create({ data: { name: 'Acme', slug: 'acme' } });

    await expect(
      prisma.team.create({ data: { name: 'Vega', slug: 'vega' } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('com a equipe já criada responde 409 sem fields', async () => {
    const { token } = person(OWNER);
    expect((await postTeam(token)).status).toBe(201);

    const response = await postTeam(person(OWNER).token, {
      name: 'Vega',
      slug: 'vega',
      project: { name: 'Lyra', slug: 'lyra' },
    });

    expect(response.status).toBe(409);
    expect(apiErrorSchema.parse(response.body)).toEqual({
      code: 'CONFLICT',
      message: 'A equipe já foi criada.',
    });
    await expect(counts()).resolves.toEqual(ONE_EACH);
  });

  // O slug repetido (só possível com uma equipe de teste) faz o banco recusar no meio da
  // transação, depois de gravar a pessoa: nada pode sobrar.
  it('violação de unicidade vira CONFLICT e desfaz a transação inteira', async () => {
    await prisma.team.create({ data: { name: 'Outra', slug: 'acme', singleton: false } });

    const response = await postTeam(person(OWNER).token);

    expect(response.status).toBe(409);
    expect(apiErrorSchema.parse(response.body).code).toBe('CONFLICT');
    await expect(counts()).resolves.toEqual({ ...NOTHING, teams: 1 });
  });

  it('reaproveita o User do dono que já existia', async () => {
    const old = await prisma.user.create({
      data: { supabaseId: randomUUID(), email: OWNER, name: 'Antigo' },
    });
    const { supabaseId, token } = person(OWNER);

    const response = await postTeam(token);

    expect(response.status).toBe(201);
    await expect(prisma.user.findMany()).resolves.toMatchObject([{ id: old.id, supabaseId }]);
  });

  it.each([
    ['outra pessoa', 'outra@acme.example'],
    // O token diz ser o dono, mas o Google não confirmou.
    ['e-mail não verificado', undefined],
  ])('recusa %s com 403', async (_label, verified) => {
    const response = await postTeam(person(verified).token);

    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(response.body)).toEqual({
      code: 'FORBIDDEN',
      message: 'Esta conta não pode criar a equipe.',
    });
    await expect(counts()).resolves.toEqual(NOTHING);
  });

  it('quem não é o dono recebe 403 mesmo com a equipe criada', async () => {
    await prisma.team.create({ data: { name: 'Acme', slug: 'acme' } });

    expect((await postTeam(person('outra@acme.example').token)).status).toBe(403);
  });

  it('corpo inválido responde 400 com o erro de cada campo', async () => {
    const response = await postTeam(person(OWNER).token, {
      name: '   ',
      slug: 'Com Espaço',
      project: { name: 'a'.repeat(61), slug: '-x' },
    });

    expect(response.status).toBe(400);
    const error = apiErrorSchema.parse(response.body);
    expect(error.code).toBe('VALIDATION');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual([
      'name',
      'project.name',
      'project.slug',
      'slug',
    ]);
    await expect(counts()).resolves.toEqual(NOTHING);
  });

  // Campos a mais são descartados: ninguém escolhe `singleton` ou `teamId` pelo corpo.
  it('ignora campos que não fazem parte do contrato', async () => {
    const response = await postTeam(person(OWNER).token, {
      ...BODY,
      singleton: false,
      project: { ...BODY.project, ticketRegex: '.*' },
    });

    expect(response.status).toBe(201);
    await expect(prisma.team.findFirstOrThrow()).resolves.toMatchObject({ singleton: true });
    await expect(prisma.project.findFirstOrThrow()).resolves.toMatchObject({
      ticketRegex: '[A-Z]+-\\d+',
    });
  });

  it('sem token responde 401', async () => {
    await request(app.getHttpServer()).post('/team').send(BODY).expect(401);
  });
});
