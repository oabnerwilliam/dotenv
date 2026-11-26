import { apiErrorSchema, type ErrorCode } from '@env/shared';
import type { ZodType } from 'zod';
import { env } from './env';

export class ApiError extends Error {
  constructor(
    /** Status HTTP; 0 quando a API nem chegou a responder. */
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const UNEXPECTED_RESPONSE = 'A API respondeu de um jeito inesperado.';

export async function apiFetch<T>(
  path: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${env.VITE_API_URL}${path}`, init);
  } catch (error) {
    // Cancelamento foi pedido por quem chamou: não é falha de rede.
    if (init?.signal?.aborted) throw error;
    throw new ApiError(0, 'INTERNAL', 'Não foi possível conectar à API.');
  }

  // Corpo que não é JSON vira `undefined`, que nenhum schema abaixo aceita.
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const failure = apiErrorSchema.safeParse(body);
    if (failure.success) {
      const { code, message, fields } = failure.data;
      throw new ApiError(response.status, code, message, fields);
    }
    throw new ApiError(response.status, 'INTERNAL', UNEXPECTED_RESPONSE);
  }

  const success = schema.safeParse(body);
  if (!success.success) {
    throw new ApiError(response.status, 'INTERNAL', UNEXPECTED_RESPONSE);
  }
  return success.data;
}
