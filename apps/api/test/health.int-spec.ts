import { healthSchema } from '@env/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';
import { startStallableProxy } from './stallable-proxy';

describe('GET /health', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 com o banco acessível', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok', database: 'up' });
    expect(healthSchema.parse(response.body)).toEqual(response.body);
  });

  it('Access-Control-Allow-Origin é sempre WEB_ORIGIN, mesmo com outro Origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://atacante.example');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('envia os cabeçalhos de segurança e não anuncia o framework', async () => {
    const { headers } = await request(app.getHttpServer()).get('/health').expect(200);

    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-powered-by']).toBeUndefined();
  });
});

describe('GET /health com uma conexão do pool travada', () => {
  const directUrl = process.env.DATABASE_URL as string;
  let proxy: Awaited<ReturnType<typeof startStallableProxy>>;
  let app: INestApplication;

  beforeAll(async () => {
    proxy = await startStallableProxy(directUrl);
    process.env.DATABASE_URL = proxy.url;
    app = await createApp();
  });

  afterAll(async () => {
    // O proxy fecha primeiro: com uma consulta pendurada, o `app.close()` ficaria esperando.
    await proxy?.close();
    await app?.close();
    process.env.DATABASE_URL = directUrl;
  });

  // O prazo da requisição é folgado em relação ao `query_timeout` (3 s) para não oscilar no CI.
  const getHealth = () =>
    request(app.getHttpServer()).get('/health').timeout({ deadline: 8000 }).expect(200);

  it('informa database down em vez de ficar sem resposta, e volta a up depois', async () => {
    // Abre a conexão que fica guardada no pool.
    expect((await getHealth()).body).toEqual({ status: 'ok', database: 'up' });

    proxy.stallOpenConnections();

    expect((await getHealth()).body).toEqual({ status: 'ok', database: 'down' });
    // A conexão travada foi descartada: a consulta seguinte abre outra.
    expect((await getHealth()).body).toEqual({ status: 'ok', database: 'up' });
  }, 30_000);
});

describe('GET /health com o banco fora', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp((builder) =>
      builder.overrideProvider(PrismaService).useValue({
        $queryRaw: () => Promise.reject(new Error('banco fora')),
      }),
    );
  });

  afterAll(async () => {
    await app?.close();
  });

  it('responde 200 informando database down', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok', database: 'down' });
  });
});
