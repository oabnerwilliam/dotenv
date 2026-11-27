import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api';
import { createQueryClient } from '../queryClient';

function attemptsFor(error: Error) {
  const queryFn = vi.fn(() => Promise.reject(error));
  return createQueryClient()
    .fetchQuery({ queryKey: ['teste'], queryFn, retryDelay: 0 })
    .catch(() => queryFn.mock.calls.length);
}

describe('createQueryClient', () => {
  it.each([400, 401, 403, 404, 409, 429])(
    'não repete a consulta que recebeu %i',
    async (status) => {
      await expect(attemptsFor(new ApiError(status, 'INTERNAL', 'x'))).resolves.toBe(1);
    },
  );

  it.each([
    ['erro do servidor', new ApiError(500, 'INTERNAL', 'x')],
    ['falha de rede', new ApiError(0, 'INTERNAL', 'x')],
    ['erro qualquer', new Error('x')],
  ])('tenta mais três vezes em %s', async (_name, error) => {
    await expect(attemptsFor(error)).resolves.toBe(4);
  });
});
