import { loadEnv } from '../env';

const VALID = {
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/env_test',
  WEB_ORIGIN: 'http://localhost:5173',
  SUPABASE_URL: 'https://supabase.acme.example',
  SUPABASE_SECRET_KEY: 'chave-ficticia',
  OWNER_EMAIL: 'dono@acme.example',
};

function messageOf(source: NodeJS.ProcessEnv): string {
  try {
    loadEnv(source);
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error('loadEnv deveria ter falhado');
}

describe('loadEnv', () => {
  it('cita as variáveis ausentes', () => {
    const message = messageOf({});

    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('WEB_ORIGIN');
    expect(message).toContain('SUPABASE_URL');
    expect(message).toContain('SUPABASE_SECRET_KEY');
    expect(message).toContain('OWNER_EMAIL');
  });

  it('usa a porta 3333 por padrão', () => {
    expect(loadEnv(VALID).PORT).toBe(3333);
  });

  it('converte PORT para número', () => {
    expect(loadEnv({ ...VALID, PORT: '4000' }).PORT).toBe(4000);
  });

  it('nunca repete os valores na mensagem de erro', () => {
    const message = messageOf({ ...VALID, PORT: 'porta-secreta', WEB_ORIGIN: 'origem-secreta' });

    expect(message).toContain('PORT');
    expect(message).toContain('WEB_ORIGIN');
    expect(message).not.toContain('secreta');
  });

  it.each(['localhost:5173', 'ftp://localhost', '*'])('recusa WEB_ORIGIN %s', (value) => {
    expect(() => loadEnv({ ...VALID, WEB_ORIGIN: value })).toThrow('WEB_ORIGIN');
  });

  it('reduz WEB_ORIGIN à origem, que é o que o navegador compara no CORS', () => {
    expect(loadEnv({ ...VALID, WEB_ORIGIN: 'http://localhost:5173/' }).WEB_ORIGIN).toBe(
      'http://localhost:5173',
    );
  });

  it.each(['supabase.acme.example', 'ftp://supabase.acme.example'])(
    'recusa SUPABASE_URL %s',
    (value) => {
      expect(() => loadEnv({ ...VALID, SUPABASE_URL: value })).toThrow('SUPABASE_URL');
    },
  );

  // O emissor do token é montado a partir dela e comparado texto a texto.
  it('tira a barra no fim de SUPABASE_URL', () => {
    expect(loadEnv({ ...VALID, SUPABASE_URL: 'http://127.0.0.1:54321/' }).SUPABASE_URL).toBe(
      'http://127.0.0.1:54321',
    );
  });

  it('normaliza OWNER_EMAIL', () => {
    expect(loadEnv({ ...VALID, OWNER_EMAIL: '  Dono@Acme.Example ' }).OWNER_EMAIL).toBe(
      'dono@acme.example',
    );
  });

  it.each(['', '   ', 'dono'])('recusa OWNER_EMAIL "%s"', (value) => {
    expect(() => loadEnv({ ...VALID, OWNER_EMAIL: value })).toThrow('OWNER_EMAIL');
  });

  it('usa o modo de teste desligado e 300 requisições por minuto por padrão', () => {
    expect(loadEnv(VALID)).toMatchObject({ AUTH_TEST_MODE: false, RATE_LIMIT_PER_MINUTE: 300 });
  });

  it.each(['0', '-1', '1.5', 'muitas'])('recusa RATE_LIMIT_PER_MINUTE %s', (value) => {
    expect(() => loadEnv({ ...VALID, RATE_LIMIT_PER_MINUTE: value })).toThrow(
      'RATE_LIMIT_PER_MINUTE',
    );
  });

  it('aceita AUTH_TEST_MODE=true somente com NODE_ENV=test', () => {
    const env = loadEnv({ ...VALID, AUTH_TEST_MODE: 'true', NODE_ENV: 'test' });

    expect(env.AUTH_TEST_MODE).toBe(true);
  });

  it.each([undefined, '', 'development', 'production', 'TEST'])(
    'AUTH_TEST_MODE=true falha com NODE_ENV %s',
    (nodeEnv) => {
      expect(() => loadEnv({ ...VALID, AUTH_TEST_MODE: 'true', NODE_ENV: nodeEnv })).toThrow(
        'AUTH_TEST_MODE',
      );
    },
  );

  it.each(['1', 'TRUE', 'sim'])('recusa AUTH_TEST_MODE %s', (value) => {
    expect(() => loadEnv({ ...VALID, AUTH_TEST_MODE: value, NODE_ENV: 'test' })).toThrow(
      'AUTH_TEST_MODE',
    );
  });
});
