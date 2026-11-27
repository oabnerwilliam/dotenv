import { z } from 'zod';
import { AppError } from '../app-error';
import { ZodValidationPipe } from '../zod.pipe';

const pipe = new ZodValidationPipe(
  z.object({
    name: z.string().min(1),
    services: z.array(z.object({ branch: z.string() })).max(5),
  }),
);

function errorOf(run: () => unknown): AppError {
  try {
    run();
  } catch (error) {
    return error as AppError;
  }
  throw new Error('a validação deveria ter falhado');
}

describe('ZodValidationPipe', () => {
  it('devolve a entrada válida já convertida pelo schema', () => {
    expect(pipe.transform({ name: 'Atlas', services: [], extra: 1 })).toEqual({
      name: 'Atlas',
      services: [],
    });
  });

  it('entrada inválida vira AppError VALIDATION com fields por caminho', () => {
    const error = errorOf(() => pipe.transform({ name: '', services: [{ branch: 7 }] }));

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe('VALIDATION');
    expect(error.message).toBe('Dados inválidos.');
    expect(Object.keys(error.fields ?? {})).toEqual(['name', 'services.0.branch']);
  });

  it('usa _ quando o erro é na raiz', () => {
    const error = errorOf(() => pipe.transform(undefined));

    expect(Object.keys(error.fields ?? {})).toEqual(['_']);
  });

  it('escreve as mensagens dos campos em português e respeita as do schema', () => {
    const custom = new ZodValidationPipe(
      z.object({ name: z.string(), slug: z.string({ error: 'Informe o identificador.' }) }),
    );

    const error = errorOf(() => custom.transform({}));

    expect(error.fields?.name).toMatch(/inválid/i);
    expect(error.fields?.slug).toBe('Informe o identificador.');
  });
});
