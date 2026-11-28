import { describe, expect, it } from 'vitest';
import { sigla } from '../sigla';

describe('sigla', () => {
  it.each([
    ['Acme', 'Ac'],
    ['acme', 'ac'],
    ['Studio Aurora', 'SA'],
    ['Acme Laboratório de Homologação Integrada', 'AI'],
    ['  Studio   Aurora  ', 'SA'],
    ['X', 'X'],
  ])('"%s" vira "%s", na caixa original', (name, expected) => {
    expect(sigla(name)).toBe(expected);
  });

  it('emoji e acento não são partidos', () => {
    expect(sigla('🚀 Foguete')).toBe('🚀F');
    expect(sigla('🚀🌙')).toBe('🚀🌙');
    expect(sigla('Ótica Índigo')).toBe('ÓÍ');
    // Acento escrito em separado (NFD): letra e acento continuam juntos.
    expect(sigla('Éden')).toBe('Éd');
  });
});
