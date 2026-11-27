import { describe, expect, it } from 'vitest';
import { createTeamSchema, slugify, slugSchema } from '../index';

describe('slugify', () => {
  it('tira acentos e pontuação e usa hífens', () => {
    expect(slugify('Estúdio Órion!')).toBe('estudio-orion');
    expect(slugify('  Acme -- Ação & Cia.  ')).toBe('acme-acao-cia');
  });

  it('corta texto longo em 40 sem deixar hífen no fim', () => {
    expect(slugify('a'.repeat(50))).toBe('a'.repeat(40));
    expect(slugify(`${'a'.repeat(39)} atlas`)).toBe('a'.repeat(39));
  });

  it('devolve vazio quando só há símbolos', () => {
    expect(slugify('!!! --- ???')).toBe('');
  });
});

describe('slugSchema', () => {
  it('aceita letras minúsculas, números e hífens, de 2 a 40 caracteres', () => {
    for (const slug of ['acme-2', 'ab', 'a'.repeat(40)]) {
      expect(slugSchema.safeParse(slug).success, slug).toBe(true);
    }
  });

  it('recusa maiúsculas, espaços, hífen nas pontas, 1 e 41 caracteres', () => {
    const invalid = [
      'Acme',
      'acme 2',
      ' acme',
      '-acme',
      'acme-',
      'acme--2',
      'estúdio',
      'a',
      'a'.repeat(41),
    ];

    for (const slug of invalid) {
      expect(slugSchema.safeParse(slug).success, slug).toBe(false);
    }
  });

  it('explica o erro em português', () => {
    const message = (value: unknown) => slugSchema.safeParse(value).error?.issues[0]?.message;

    expect(message('a')).toBe('O endereço precisa ter pelo menos 2 caracteres.');
    expect(message('a'.repeat(41))).toBe('O endereço pode ter no máximo 40 caracteres.');
    expect(message('Acme')).toBe(
      'Use letras minúsculas sem acento, números e hífens, sem hífen nas pontas.',
    );
    expect(message(undefined)).toBe('Informe o endereço.');
  });
});

describe('createTeamSchema', () => {
  const valid = { name: 'Acme', slug: 'acme', project: { name: 'Atlas', slug: 'atlas' } };
  const issuesOf = (value: unknown) =>
    createTeamSchema
      .safeParse(value)
      .error?.issues.map((issue) => [issue.path.join('.'), issue.message]);

  it('apara os espaços dos nomes', () => {
    const parsed = createTeamSchema.parse({
      ...valid,
      name: '  Acme  ',
      project: { name: '  Atlas ', slug: 'atlas' },
    });

    expect(parsed).toEqual(valid);
  });

  it('aponta o caminho do erro', () => {
    expect(issuesOf({ ...valid, project: { name: '   ', slug: 'atlas' } })).toEqual([
      ['project.name', 'Informe o nome do projeto.'],
    ]);
    expect(issuesOf({ ...valid, name: '', project: { name: 'Atlas', slug: 'a' } })).toEqual([
      ['name', 'Informe o nome da equipe.'],
      ['project.slug', 'O endereço precisa ter pelo menos 2 caracteres.'],
    ]);
  });

  it('limita os nomes a 60 caracteres', () => {
    const name = 'a'.repeat(60);
    const longName = `${name}a`;

    expect(
      createTeamSchema.safeParse({ ...valid, name, project: { name, slug: 'atlas' } }).success,
    ).toBe(true);
    expect(
      issuesOf({ ...valid, name: longName, project: { name: longName, slug: 'atlas' } }),
    ).toEqual([
      ['name', 'O nome da equipe pode ter no máximo 60 caracteres.'],
      ['project.name', 'O nome do projeto pode ter no máximo 60 caracteres.'],
    ]);
  });

  it('responde em português quando faltam campos', () => {
    expect(issuesOf({})).toEqual([
      ['name', 'Informe o nome da equipe.'],
      ['slug', 'Informe o endereço.'],
      ['project', 'Informe o primeiro projeto.'],
    ]);
  });
});
