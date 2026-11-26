import type { ErrorCode } from '@env/shared';

// Erro de regra de negócio. Os serviços lançam; o `ErrorFilter` traduz para HTTP.
// A mensagem vai para o usuário: escrever em português e sem dados sensíveis.
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
