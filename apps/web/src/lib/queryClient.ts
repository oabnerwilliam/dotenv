import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

const MAX_RETRIES = 3;

// Erro 4xx é resposta definitiva (sem sessão, sem permissão, dado inválido): repetir não muda.
function shouldRetry(failureCount: number, error: Error): boolean {
  const isClientError = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return !isClientError && failureCount < MAX_RETRIES;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } });
}
