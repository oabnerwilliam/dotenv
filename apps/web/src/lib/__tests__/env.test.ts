import { describe, expect, it } from 'vitest';
import { parseEnv } from '../env';

const valid = {
  VITE_API_URL: 'http://localhost:3333',
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-publicavel-de-teste',
};

describe('parseEnv', () => {
  it('exige o endereço e a chave publicável do Supabase', () => {
    const source = { VITE_API_URL: valid.VITE_API_URL };

    expect(() => parseEnv(source)).toThrow(/VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY/);
    expect(() => parseEnv({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: '' })).toThrow(
      /VITE_SUPABASE_PUBLISHABLE_KEY/,
    );
    expect(() => parseEnv({ ...valid, VITE_SUPABASE_URL: '127.0.0.1:54321' })).toThrow(
      /VITE_SUPABASE_URL/,
    );
  });

  it('cita VITE_API_URL quando ela falta ou não é um endereço http', () => {
    expect(() => parseEnv({})).toThrow(/VITE_API_URL/);
    expect(() => parseEnv({ VITE_API_URL: 'localhost:3333' })).toThrow(/VITE_API_URL/);
  });

  it('remove a barra do fim, para o caminho não ficar com barra dupla', () => {
    expect(
      parseEnv({
        ...valid,
        VITE_API_URL: 'http://localhost:3333/',
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321/',
      }),
    ).toEqual(valid);
  });
});
