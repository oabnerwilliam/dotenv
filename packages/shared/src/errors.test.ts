import { describe, expect, it } from 'vitest';
import { apiErrorSchema } from './index';

describe('apiErrorSchema', () => {
  it('apiErrorSchema aceita erro com e sem fields e rejeita code desconhecido', () => {
    const withoutFields = { code: 'NOT_FOUND', message: 'Não encontrado.' };
    const withFields = {
      code: 'VALIDATION',
      message: 'Dados inválidos.',
      fields: { name: 'Informe o nome.' },
    };

    expect(apiErrorSchema.parse(withoutFields)).toEqual(withoutFields);
    expect(apiErrorSchema.parse(withFields)).toEqual(withFields);
    expect(apiErrorSchema.safeParse({ code: 'OUTRO', message: 'x' }).success).toBe(false);
  });
});
