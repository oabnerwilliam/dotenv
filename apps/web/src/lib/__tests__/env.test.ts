import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env';

describe('parseEnv', () => {
  it('cita VITE_API_URL quando ela falta ou não é um endereço http', () => {
    expect(() => parseEnv({})).toThrow(/VITE_API_URL/);
    expect(() => parseEnv({ VITE_API_URL: 'localhost:3333' })).toThrow(/VITE_API_URL/);
  });

  it('remove a barra do fim, para o caminho não ficar com barra dupla', () => {
    expect(parseEnv({ VITE_API_URL: 'http://localhost:3333/' })).toEqual({
      VITE_API_URL: 'http://localhost:3333',
    });
  });
});
