import { loadEnv } from '../env';

const VALID = {
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/env_test',
  WEB_ORIGIN: 'http://localhost:5173',
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
});
