import type { PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from './app-error';

// Mensagens padrão do Zod em português, passadas a cada validação (sem configuração global).
// Uma mensagem escrita no próprio schema continua valendo.
const { localeError } = z.locales.pt();

// Uso: `@Body(new ZodValidationPipe(schema)) body: Tipo`, com o schema de `@env/shared`.
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value, { error: localeError });
    if (result.success) return result.data;

    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      // `_` marca o erro na raiz. Quando um campo tem vários erros, vale o primeiro.
      fields[issue.path.join('.') || '_'] ??= issue.message;
    }
    throw new AppError('VALIDATION', 'Dados inválidos.', fields);
  }
}
