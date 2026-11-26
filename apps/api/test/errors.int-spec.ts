import { apiErrorSchema } from '@env/shared';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createApp } from './create-app';

describe('erros da API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rota inexistente responde 404 NOT_FOUND', async () => {
    const response = await request(app.getHttpServer()).get('/nao-existe').expect(404);

    expect(apiErrorSchema.parse(response.body)).toEqual({
      code: 'NOT_FOUND',
      message: 'Recurso não encontrado.',
    });
  });

  it('JSON malformado responde 400 VALIDATION sem repetir o corpo', async () => {
    const response = await request(app.getHttpServer())
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{"campo": valor-secreto')
      .expect(400);

    expect(apiErrorSchema.parse(response.body).code).toBe('VALIDATION');
    expect(JSON.stringify(response.body)).not.toContain('secreto');
  });

  it('corpo grande demais responde 413 VALIDATION', async () => {
    const response = await request(app.getHttpServer())
      .post('/health')
      .send({ texto: 'a'.repeat(200_000) })
      .expect(413);

    expect(apiErrorSchema.parse(response.body)).toEqual({
      code: 'VALIDATION',
      message: 'O corpo da requisição é grande demais.',
    });
  });
});
