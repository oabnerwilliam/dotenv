import { describe, expect, it } from 'vitest';
import { clearReturnPath, readReturnPath, safeReturnPath, saveReturnPath } from '../returnPath';

describe('safeReturnPath', () => {
  it.each(['/p/atlas?x=1', '/', '/onboarding/equipe', '/p/atlas#topo', '/p/login'])(
    'aceita o caminho interno %s',
    (path) => {
      expect(safeReturnPath(path)).toBe(path);
    },
  );

  it.each([
    '//site',
    '/\\site',
    'https://site',
    'javascript:alert(1)',
    'p/atlas',
    '',
    null,
    undefined,
    // O navegador apaga tabulações e quebras de linha: isto viraria "//site".
    '/\t/site',
    '/\n/site',
    // Os pontos se resolvem para "//site".
    '/..//site',
    '/%2e%2e//site',
    // Voltar para as telas de login prenderia a pessoa nelas.
    '/login',
    '/login/',
    '/login?x=1',
    '/auth/callback?code=abc',
  ])('troca %j por /', (value) => {
    expect(safeReturnPath(value)).toBe('/');
  });
});

describe('destino do login', () => {
  it('guarda no sessionStorage e lê de volta', () => {
    saveReturnPath('/p/atlas?x=1');

    expect(sessionStorage.getItem('env.destino')).toBe('/p/atlas?x=1');
    expect(readReturnPath()).toBe('/p/atlas?x=1');

    clearReturnPath();
    expect(readReturnPath()).toBe('/');
  });

  it('não confia no que está guardado', () => {
    sessionStorage.setItem('env.destino', '//site');

    expect(readReturnPath()).toBe('/');
  });
});
