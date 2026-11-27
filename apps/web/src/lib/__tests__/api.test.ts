import { healthSchema } from '@env/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../test/server';
import { ApiError, apiFetch } from '../api';

const HEALTH_URL = 'http://localhost:3333/health';

function fetchHealth(init?: RequestInit) {
  return apiFetch('/health', healthSchema, init);
}

async function failureOf(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

describe('apiFetch', () => {
  it('devolve o corpo validado quando a resposta segue o contrato', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.json({ status: 'ok', database: 'up' })));

    await expect(fetchHealth()).resolves.toEqual({ status: 'ok', database: 'up' });
  });

  it('resposta de erro vira ApiError com status e code', async () => {
    server.use(
      http.get(HEALTH_URL, () =>
        HttpResponse.json(
          { code: 'VALIDATION', message: 'Dados inválidos.', fields: { name: 'Obrigatório.' } },
          { status: 400 },
        ),
      ),
    );

    const error = await failureOf(fetchHealth());

    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION',
      message: 'Dados inválidos.',
      fields: { name: 'Obrigatório.' },
    });
  });

  it('falha de rede vira ApiError com status 0', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.error()));

    const error = await failureOf(fetchHealth());

    expect(error).toMatchObject({ status: 0, code: 'INTERNAL' });
  });

  it.each([
    ['sucesso que o schema recusa', 200, '{"status":"ok"}'],
    ['sucesso que não é JSON', 200, '<h1>oi</h1>'],
    ['erro sem o formato', 502, '{"error":"x"}'],
    ['erro que não é JSON', 502, 'Bad Gateway'],
  ])('resposta fora do contrato vira ApiError INTERNAL: %s', async (_name, status, body) => {
    server.use(http.get(HEALTH_URL, () => new HttpResponse(body, { status })));

    const error = await failureOf(fetchHealth());

    expect(error).toMatchObject({ status, code: 'INTERNAL' });
  });

  it('consulta cancelada não é tratada como falha de rede', async () => {
    server.use(http.get(HEALTH_URL, () => HttpResponse.json({ status: 'ok', database: 'up' })));
    const controller = new AbortController();
    controller.abort();

    await expect(fetchHealth({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});
