import { describe, expect, it } from 'vitest';
import { envStatusSchema, STATUS_LABEL } from '../index';

describe('status dos ambientes', () => {
  it('STATUS_LABEL cobre os quatro status', () => {
    expect(Object.keys(STATUS_LABEL)).toEqual(envStatusSchema.options);
    expect(STATUS_LABEL).toEqual({
      livre: 'Livre',
      reservado: 'Reservado',
      uso: 'Em uso',
      bloqueado: 'Bloqueado',
    });
  });

  it('envStatusSchema rejeita status desconhecido', () => {
    expect(envStatusSchema.safeParse('livre').success).toBe(true);
    expect(envStatusSchema.safeParse('ocupado').success).toBe(false);
    expect(envStatusSchema.safeParse('Livre').success).toBe(false);
  });
});
