import { describe, expect, it } from 'vitest';
import { createProjectSchema, projectListSchema, updateProjectSchema } from '../index';

const issuesOf = (value: unknown) =>
  createProjectSchema
    .safeParse(value)
    .error?.issues.map((issue) => [issue.path.join('.'), issue.message]);

describe('createProjectSchema', () => {
  it('apara o nome e valida o endereço', () => {
    expect(createProjectSchema.parse({ name: '  Atlas ', slug: 'atlas' })).toEqual({
      name: 'Atlas',
      slug: 'atlas',
    });
    expect(issuesOf({ name: '   ', slug: 'atlas' })).toEqual([
      ['name', 'Informe o nome do projeto.'],
    ]);
    expect(issuesOf({ name: 'a'.repeat(61), slug: 'atlas' })).toEqual([
      ['name', 'O nome do projeto pode ter no máximo 60 caracteres.'],
    ]);
    expect(issuesOf({ name: 'Atlas', slug: 'Com Espaço' })).toEqual([
      ['slug', 'Use letras minúsculas sem acento, números e hífens, sem hífen nas pontas.'],
    ]);
  });
});

describe('updateProjectSchema', () => {
  it('ignora o slug', () => {
    expect(updateProjectSchema.parse({ name: ' Vega ', slug: 'outro' })).toEqual({ name: 'Vega' });
    expect(updateProjectSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('projectListSchema', () => {
  it('descarta campos a mais', () => {
    const project = { id: '1', name: 'Atlas', slug: 'atlas' };

    expect(projectListSchema.parse([{ ...project, teamId: 'x', archivedAt: null }])).toEqual([
      project,
    ]);
  });
});
