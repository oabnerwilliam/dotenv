import { apiErrorSchema } from '@env/shared';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { generateKeyPair } from 'jose';
import request from 'supertest';
import { CurrentAuth, NoTeam } from '../src/auth/decorators';
import { JWKS, type VerifiedToken } from '../src/auth/token-verifier';
import { createApp } from './create-app';
import { createTestAuth } from './support/auth';

// Rotas que só existem no teste, sem decorator nenhum: é assim que se prova que a proteção é o
// padrão, e não algo que cada rota precisa lembrar de pedir. `@NoTeam()` deixa este arquivo
// cuidar só do token; a equipe é testada no `team-guard.int-spec`.
@NoTeam()
@Controller('probe')
class ProbeController {
  @Get()
  get(@CurrentAuth() auth: VerifiedToken) {
    return { supabaseId: auth.supabaseId };
  }

  @Get('outra')
  other() {
    return { ok: true };
  }
}

const SUB = '3f1c2a9e-7b4d-4e1a-9c3f-2d8b5a6e1f00';

let auth: Awaited<ReturnType<typeof createTestAuth>>;

beforeAll(async () => {
  auth = await createTestAuth(process.env.SUPABASE_URL as string);
});

const startApp = () =>
  createApp((builder) => builder.overrideProvider(JWKS).useValue(auth.jwks), [ProbeController]);

describe('autenticação', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  const get = (path: string, authorization?: string) => {
    const call = request(app.getHttpServer()).get(path);
    return authorization === undefined ? call : call.set('Authorization', authorization);
  };

  async function expectUnauthenticated(authorization?: string) {
    const response = await get('/probe', authorization).expect(401);

    expect(apiErrorSchema.parse(response.body)).toEqual({
      code: 'UNAUTHENTICATED',
      message: 'Sua sessão expirou. Entre novamente.',
    });
  }

  it('sem token responde 401', async () => {
    await expectUnauthenticated();
  });

  it.each(['', 'Bearer', 'Bearer ', 'Bearer nao-e-um-token', 'Basic dXN1YXJpbzpzZW5oYQ=='])(
    'com o cabeçalho "%s" responde 401',
    async (authorization) => {
      await expectUnauthenticated(authorization);
    },
  );

  it('com o token sem o prefixo Bearer responde 401', async () => {
    await expectUnauthenticated(await auth.signToken());
  });

  it.each([
    ['expirado', { exp: 1_000_000_000 }],
    ['de outro emissor', { iss: 'https://outro.example/auth/v1' }],
  ])('com token %s responde 401', async (_label, claims) => {
    await expectUnauthenticated(`Bearer ${await auth.signToken({ claims })}`);
  });

  it('com assinatura de outra chave responde 401', async () => {
    const { privateKey } = await generateKeyPair('ES256');

    await expectUnauthenticated(`Bearer ${await auth.signToken({ key: privateKey })}`);
  });

  // O cabeçalho e a assinatura são escolhidos por quem chama: estragá-los nunca pode virar 500.
  it.each([
    ['sem kid', { alg: 'ES256' }],
    ['com kid desconhecido', { alg: 'ES256', kid: 'outra' }],
    ['com kid numérico', { alg: 'ES256', kid: 5 }],
    ['com alg numérico', { alg: 1 }],
    ['RS256 apontando para a chave ES256', { alg: 'RS256', kid: 'chave-de-teste' }],
    ['com crit desconhecido', { alg: 'ES256', kid: 'chave-de-teste', crit: ['x'], x: 1 }],
    ['com b64 falso', { alg: 'ES256', kid: 'chave-de-teste', crit: ['b64'], b64: false }],
    ['em formato de lista', [1]],
  ])('com cabeçalho do token %s responde 401', async (_label, header) => {
    const [, payload, signature] = (await auth.signToken()).split('.');
    const forged = Buffer.from(JSON.stringify(header)).toString('base64url');

    await expectUnauthenticated(`Bearer ${forged}.${payload}.${signature}`);
  });

  it.each(['', 'AAAA', '!!!!'])('com a assinatura trocada por "%s" responde 401', async (bad) => {
    const [header, payload] = (await auth.signToken()).split('.');

    await expectUnauthenticated(`Bearer ${header}.${payload}.${bad}`);
  });

  it('com token válido chega à rota, que sabe quem é a pessoa', async () => {
    const token = await auth.signToken({ claims: { sub: SUB } });

    const response = await get('/probe', `Bearer ${token}`).expect(200);

    expect(response.body).toEqual({ supabaseId: SUB });
  });

  it('/health segue público', async () => {
    await get('/health').expect(200);
    await get('/health', 'Bearer nao-e-um-token').expect(200);
  });
});

describe('limite de requisições', () => {
  let app: INestApplication;
  const previous = process.env.RATE_LIMIT_PER_MINUTE;

  beforeAll(async () => {
    process.env.RATE_LIMIT_PER_MINUTE = '3';
    app = await startApp();
  });

  afterAll(async () => {
    await app?.close();
    process.env.RATE_LIMIT_PER_MINUTE = previous;
  });

  it('recusa a 4ª requisição do mesmo IP, somando todas as rotas, sem contar o /health', async () => {
    const server = app.getHttpServer();
    const invalid = (path: string) =>
      request(server).get(path).set('Authorization', 'Bearer nao-e-um-token');
    for (let i = 0; i < 5; i++) await request(server).get('/health').expect(200);

    // O limite vem antes da autenticação: adivinhar tokens também conta.
    await invalid('/probe').expect(401);
    await invalid('/probe/outra').expect(401);
    await invalid('/probe').expect(401);
    const blocked = await invalid('/probe/outra').expect(429);

    expect(apiErrorSchema.parse(blocked.body)).toEqual({
      code: 'RATE_LIMITED',
      message: 'Muitas requisições. Aguarde um instante e tente de novo.',
    });
    expect(blocked.headers['retry-after']).toBeDefined();
    // Um `X-Forwarded-For` inventado não troca o IP contado.
    await invalid('/probe').set('X-Forwarded-For', '203.0.113.7').expect(429);
    // Nem um token válido passa, e o /health continua respondendo.
    await request(server)
      .get('/probe')
      .set('Authorization', `Bearer ${await auth.signToken()}`)
      .expect(429);
    await request(server).get('/health').expect(200);
  });
});
