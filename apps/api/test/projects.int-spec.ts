import { randomUUID } from 'node:crypto';
import { apiErrorSchema, meSchema, projectListSchema, projectSchema } from '@env/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JWKS } from '../src/auth/token-verifier';
import { CLOCK } from '../src/common/clock';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProjectsService } from '../src/projects/projects.service';
import { createApp } from './create-app';
import { createTestAuth } from './support/auth';
import { resetDb } from './support/reset-db';
import { createTwoTeams } from './support/two-teams';

const NOW = new Date('2026-11-27T12:00:00.000Z');
const NOT_FOUND = { code: 'NOT_FOUND', message: 'Projeto não encontrado.' };
const TAKEN = 'Este endereço já é usado por um projeto, mesmo que arquivado.';
const CONFLICT = { code: 'CONFLICT', message: TAKEN, fields: { slug: TAKEN } };

type Teams = Awaited<ReturnType<typeof createTwoTeams>>;
type Person = Teams['a']['member'];

describe('projetos', () => {
  let auth: Awaited<ReturnType<typeof createTestAuth>>;
  let app: INestApplication;
  let prisma: PrismaService;
  let teams: Teams;

  beforeAll(async () => {
    auth = await createTestAuth(process.env.SUPABASE_URL as string);
    app = await createApp((builder) =>
      builder
        .overrideProvider(JWKS)
        .useValue(auth.jwks)
        .overrideProvider(CLOCK)
        .useValue({ now: () => NOW }),
    );
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetDb(prisma);
    teams = await createTwoTeams(prisma);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    if (prisma) await resetDb(prisma);
    await app?.close();
  });

  /** Uma requisição já com o token da pessoa. */
  async function send(
    person: Person,
    method: 'get' | 'post' | 'patch',
    path: string,
    body?: object,
  ) {
    const token = await auth.signToken({ claims: { sub: person.supabaseId } });
    const agent = request(app.getHttpServer());
    const pending = agent[method](path).set('Authorization', `Bearer ${token}`);
    return body ? pending.send(body) : pending;
  }

  const list = (person: Person) => send(person, 'get', '/projects');
  const create = (person: Person, body: object) => send(person, 'post', '/projects', body);
  const rename = (person: Person, slug: string, body: object = { name: 'Novo nome' }) =>
    send(person, 'patch', `/projects/${slug}`, body);
  const archive = (person: Person, slug: string) =>
    send(person, 'post', `/projects/${slug}/archive`);

  /** As linhas como estão no banco, para provar que nada mudou. */
  const rows = () => prisma.project.findMany({ orderBy: [{ teamId: 'asc' }, { slug: 'asc' }] });

  function addProject(teamId: string, name: string, slug: string, extra: object = {}) {
    return prisma.project.create({ data: { teamId, name, slug, ...extra } });
  }

  it('lista só os projetos ativos da própria equipe, por nome', async () => {
    const { a, b } = teams;
    await addProject(a.team.id, 'Vega', 'vega');
    // Na ordem do português, "Á" vem junto de "A", e minúsculas junto das maiúsculas.
    await addProject(a.team.id, 'Átrio', 'atrio');
    await addProject(a.team.id, 'lyra', 'lyra');
    // Mesmo nome: desempata o mais antigo, mesmo gravado depois.
    await addProject(a.team.id, 'Hydra', 'hydra-nova', { createdAt: new Date('2025-01-01Z') });
    await addProject(a.team.id, 'Hydra', 'hydra-velha', { createdAt: new Date('2024-01-01Z') });
    await addProject(a.team.id, 'Atlas', 'atlas', { archivedAt: NOW });
    await addProject(b.team.id, 'Alheio', 'alheio');

    const response = await list(a.member);

    expect(response.status).toBe(200);
    // O schema descarta campos a mais: a comparação pega os que sobrarem.
    expect(response.body).toEqual(projectListSchema.parse(response.body));
    expect(response.body.map((project: { slug: string }) => project.slug)).toEqual([
      'atrio',
      'hydra-velha',
      'hydra-nova',
      'lyra',
      a.project.slug,
      'vega',
    ]);
  });

  it('membro comum cria um projeto', async () => {
    const { a, b } = teams;

    const response = await create(a.member, {
      name: '  Atlas  ',
      slug: 'atlas',
      teamId: b.team.id,
      ticketRegex: '.*',
      archivedAt: NOW.toISOString(),
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual(projectSchema.parse(response.body));
    expect(response.body).toMatchObject({ name: 'Atlas', slug: 'atlas' });
    // Equipe de quem chamou e padrões do banco: o corpo não escolhe nenhum dos dois.
    await expect(
      prisma.project.findUniqueOrThrow({ where: { id: response.body.id } }),
    ).resolves.toMatchObject({
      teamId: a.team.id,
      name: 'Atlas',
      slug: 'atlas',
      ticketRegex: '[A-Z]+-\\d+',
      archivedAt: null,
    });
  });

  it.each([
    ['campos vazios', { name: '   ', slug: 'Com Espaço' }, ['name', 'slug']],
    ['campos ausentes', {}, ['name', 'slug']],
    ['textos longos', { name: 'a'.repeat(61), slug: 'a'.repeat(41) }, ['name', 'slug']],
    ['caractere nulo no nome', { name: 'At\u0000las', slug: 'atlas' }, ['name']],
    ['caractere nulo no endereço', { name: 'Atlas', slug: 'at\u0000las' }, ['slug']],
  ])('corpo inválido responde 400 com fields: %s', async (_label, body, fields) => {
    const before = await rows();

    const response = await create(teams.a.member, body);

    expect(response.status).toBe(400);
    const error = apiErrorSchema.parse(response.body);
    expect(error.code).toBe('VALIDATION');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual(fields);
    await expect(rows()).resolves.toEqual(before);
  });

  it('renomear com nome inválido responde 400 em fields.name e não grava', async () => {
    const { a } = teams;
    const before = await rows();

    for (const body of [{}, { name: '  ' }, { name: 'At\u0000las' }, { name: 'a'.repeat(61) }]) {
      const response = await rename(a.member, a.project.slug, body);

      expect(response.status).toBe(400);
      expect(Object.keys(apiErrorSchema.parse(response.body).fields ?? {})).toEqual(['name']);
    }
    await expect(rows()).resolves.toEqual(before);
  });

  it.each([
    ['ativo', null],
    ['arquivado', NOW],
  ])(
    'slug repetido na equipe responde 409 em fields.slug, com o projeto %s',
    async (_label, archivedAt) => {
      const { a } = teams;
      await addProject(a.team.id, 'Atlas', 'atlas', { archivedAt });
      const before = await rows();

      const response = await create(a.member, { name: 'Outro', slug: 'atlas' });

      expect(response.status).toBe(409);
      expect(apiErrorSchema.parse(response.body)).toEqual(CONFLICT);
      await expect(rows()).resolves.toEqual(before);
    },
  );

  it('o mesmo slug pode existir em outra equipe', async () => {
    const { a, b } = teams;

    const response = await create(a.member, { name: 'Cópia', slug: b.project.slug });

    expect(response.status).toBe(201);
    await expect(prisma.project.count({ where: { slug: b.project.slug } })).resolves.toBe(2);
  });

  // Quem decide é o índice único do banco, e não uma consulta feita antes.
  it('criações simultâneas com o mesmo slug: um 201 e os outros 409', async () => {
    const { a } = teams;

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => create(a.member, { name: 'Atlas', slug: 'atlas' })),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409, 409, 409, 409]);
    expect(responses.find((response) => response.status === 409)?.body).toEqual(CONFLICT);
    await expect(prisma.project.count({ where: { slug: 'atlas' } })).resolves.toBe(1);
  });

  it('renomear muda o nome e mantém o endereço', async () => {
    const { a } = teams;

    const response = await rename(a.member, a.project.slug, {
      name: '  Vega  ',
      slug: 'outro-endereco',
      teamId: teams.b.team.id,
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: a.project.id, name: 'Vega', slug: a.project.slug });
    await expect(
      prisma.project.findUniqueOrThrow({ where: { id: a.project.id } }),
    ).resolves.toEqual({ ...a.project, name: 'Vega' });
  });

  it('arquivar grava archivedAt, tira da lista e não apaga a linha', async () => {
    const { a } = teams;

    const response = await archive(a.member, a.project.slug);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: a.project.id,
      name: a.project.name,
      slug: a.project.slug,
    });
    await expect(
      prisma.project.findUniqueOrThrow({ where: { id: a.project.id } }),
    ).resolves.toEqual({ ...a.project, archivedAt: NOW });
    expect((await list(a.member)).body).toEqual([]);

    for (const again of [
      await archive(a.member, a.project.slug),
      await rename(a.member, a.project.slug),
    ]) {
      expect(again.status).toBe(404);
      expect(apiErrorSchema.parse(again.body)).toEqual(NOT_FOUND);
    }
    await expect(
      prisma.project.findUniqueOrThrow({ where: { id: a.project.id } }),
    ).resolves.toEqual({ ...a.project, archivedAt: NOW });
  });

  // Outra pessoa arquiva entre a busca e a gravação: o filtro da própria gravação recusa.
  it.each([
    ['renomear', rename],
    ['arquivar', archive],
  ])('%s não alcança o projeto arquivado no meio do caminho', async (_label, act) => {
    const { a } = teams;
    const earlier = new Date('2026-01-01T00:00:00.000Z');
    const service = app.get(ProjectsService);
    const findOwned = service.findOwned.bind(service);
    jest.spyOn(service, 'findOwned').mockImplementationOnce(async (teamId, slug) => {
      const found = await findOwned(teamId, slug);
      await prisma.project.update({ where: { id: found.id }, data: { archivedAt: earlier } });
      return found;
    });

    const response = await act(a.member, a.project.slug);

    expect(response.status).toBe(404);
    expect(apiErrorSchema.parse(response.body)).toEqual(NOT_FOUND);
    await expect(
      prisma.project.findUniqueOrThrow({ where: { id: a.project.id } }),
    ).resolves.toEqual({ ...a.project, archivedAt: earlier });
  });

  it('arquivar o último projeto é permitido', async () => {
    const { a } = teams;

    expect((await archive(a.member, a.project.slug)).status).toBe(200);

    const me = await send(a.member, 'get', '/me');
    expect(meSchema.parse(me.body)).toMatchObject({ state: 'member', defaultProjectSlug: null });
  });

  it('arquivamentos simultâneos: um 200 e os outros 404', async () => {
    const { a } = teams;

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => archive(a.member, a.project.slug)),
    );

    expect(responses.map((response) => response.status).sort()).toEqual([200, 404, 404, 404, 404]);
  });

  // O corpo pode ser um JSON válido que não é um objeto: continua sendo erro de quem chamou.
  it.each([
    ['lista', '[]'],
    ['lista com objeto', '[{"name":"Atlas","slug":"atlas"}]'],
    ['nome que é objeto', '{"name":{"set":"Atlas"},"slug":"atlas"}'],
  ])('corpo com formato errado responde 400 e não grava: %s', async (_label, body) => {
    const { a } = teams;
    const before = await rows();
    const token = await auth.signToken({ claims: { sub: a.member.supabaseId } });

    for (const [method, path] of [
      ['post', '/projects'],
      ['patch', `/projects/${a.project.slug}`],
    ] as const) {
      const agent = request(app.getHttpServer());
      const response = await agent[method](path)
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json')
        .send(body);

      expect(response.status).toBe(400);
      expect(apiErrorSchema.parse(response.body).code).toBe('VALIDATION');
    }
    await expect(rows()).resolves.toEqual(before);
  });

  // `\ud800` é metade de um par: não é texto válido, mas não pode virar erro 500.
  it('nome com substituto Unicode solto não vira erro interno', async () => {
    const response = await create(teams.a.member, { name: 'At\ud800las', slug: 'atlas' });

    expect(response.status).toBeLessThan(500);
  });

  describe('isolamento entre equipes', () => {
    it('a equipe informada na query string não vale: só a de quem chama', async () => {
      const { a, b } = teams;
      const query = `?teamId=${b.team.id}`;

      const listed = await send(a.member, 'get', `/projects${query}`);
      const renamed = await send(a.member, 'patch', `/projects/${b.project.slug}${query}`, {
        name: 'Invasão',
      });
      await send(a.member, 'post', `/projects${query}`, { name: 'Lyra', slug: 'lyra' });

      expect(listed.body).toEqual([
        { id: a.project.id, name: a.project.name, slug: a.project.slug },
      ]);
      expect(renamed.status).toBe(404);
      await expect(prisma.project.count({ where: { teamId: b.team.id } })).resolves.toBe(1);
    });

    it.each(['a', 'b'] as const)(
      'a equipe %s não lista, não renomeia nem arquiva o projeto da outra',
      async (own) => {
        const me = teams[own];
        const other = teams[own === 'a' ? 'b' : 'a'];
        const before = await rows();

        expect((await list(me.admin)).body).toEqual([
          { id: me.project.id, name: me.project.name, slug: me.project.slug },
        ]);

        // O projeto alheio responde igual ao que não existe: nada revela que ele está lá.
        for (const slug of [other.project.slug, 'nao-existe']) {
          for (const response of [await rename(me.admin, slug), await archive(me.admin, slug)]) {
            expect(response.status).toBe(404);
            expect(apiErrorSchema.parse(response.body)).toEqual(NOT_FOUND);
          }
        }
        await expect(rows()).resolves.toEqual(before);
      },
    );

    // As próximas histórias usam o `findOwned` sozinho, sem a gravação filtrada que vem depois
    // no renomear e no arquivar: o filtro dele é provado aqui.
    it('findOwned só devolve projeto ativo da equipe informada', async () => {
      const { a, b } = teams;
      const service = app.get(ProjectsService);
      await addProject(a.team.id, 'Atlas', 'atlas', { archivedAt: NOW });

      await expect(service.findOwned(a.team.id, a.project.slug)).resolves.toEqual(a.project);
      for (const slug of [b.project.slug, 'atlas', 'nao-existe']) {
        await expect(service.findOwned(a.team.id, slug)).rejects.toMatchObject(NOT_FOUND);
      }
    });

    it('com o mesmo slug nas duas equipes, só o da própria muda', async () => {
      const { a, b } = teams;
      // O da outra equipe é gravado antes: uma busca sem o filtro o encontraria primeiro.
      const theirs = await addProject(b.team.id, 'Atlas', 'atlas');
      const mine = await addProject(a.team.id, 'Atlas', 'atlas');

      expect((await rename(a.member, 'atlas', { name: 'Vega' })).body).toMatchObject({
        id: mine.id,
      });
      expect((await archive(a.member, 'atlas')).body).toMatchObject({ id: mine.id });

      await expect(prisma.project.findUniqueOrThrow({ where: { id: theirs.id } })).resolves.toEqual(
        theirs,
      );
    });
  });

  // `%00` viraria erro 500 no Postgres se chegasse à consulta.
  it.each([
    ['caractere nulo', 'at%00las'],
    ['maiúsculas', 'Projeto-Acme'],
    ['200 letras', 'a'.repeat(200)],
    ['uma letra', 'a'],
  ])('endereço malformado responde 404: %s', async (_label, slug) => {
    const { a } = teams;
    const find = jest.spyOn(prisma.project, 'findFirst');

    for (const response of [await rename(a.member, slug), await archive(a.member, slug)]) {
      expect(response.status).toBe(404);
      expect(apiErrorSchema.parse(response.body)).toEqual(NOT_FOUND);
    }
    // Recusado antes da consulta.
    expect(find).not.toHaveBeenCalled();
  });

  // O Express recusa o endereço antes de chegar à rota: é erro de quem chamou, não nosso.
  it('codificação quebrada no endereço responde 400, e não 500', async () => {
    const response = await rename(teams.a.member, '%E0%A4%A');

    expect(response.status).toBe(400);
    expect(apiErrorSchema.parse(response.body).code).toBe('VALIDATION');
  });

  describe('acesso', () => {
    const routes = [
      ['get', '/projects'],
      ['post', '/projects'],
      ['patch', '/projects/projeto-acme'],
      ['post', '/projects/projeto-acme/archive'],
    ] as const;
    const body = { name: 'Atlas', slug: 'atlas' };

    it.each(routes)('%s %s sem token responde 401', async (method, path) => {
      const before = await rows();

      const response = await request(app.getHttpServer())[method](path).send(body);

      expect(response.status).toBe(401);
      expect(apiErrorSchema.parse(response.body).code).toBe('UNAUTHENTICATED');
      await expect(rows()).resolves.toEqual(before);
    });

    it.each(routes)('%s %s de quem não é membro responde 403', async (method, path) => {
      const before = await rows();
      const outsider = { ...teams.a.member, supabaseId: randomUUID() };

      const response = await send(outsider, method, path, body);

      expect(response.status).toBe(403);
      expect(apiErrorSchema.parse(response.body).code).toBe('NOT_INVITED');
      await expect(rows()).resolves.toEqual(before);
    });
  });
});
