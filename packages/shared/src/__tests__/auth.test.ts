import { describe, expect, it } from 'vitest';
import { meSchema, normalizeEmail, roleSchema } from '../index';

const member = {
  state: 'member',
  user: { id: 'u1', name: 'Pessoa Acme', email: 'dono@acme.example', avatarUrl: null },
  team: { id: 't1', name: 'Acme', slug: 'acme' },
  role: 'admin',
  defaultProjectSlug: 'atlas',
};

describe('normalizeEmail', () => {
  it('normalizeEmail tira espaços e usa minúsculas', () => {
    expect(normalizeEmail('  Dono@Acme.EXAMPLE \n')).toBe('dono@acme.example');
  });
});

describe('roleSchema', () => {
  it('aceita admin e member e recusa outro papel', () => {
    expect(roleSchema.options).toEqual(['admin', 'member']);
    expect(roleSchema.safeParse('owner').success).toBe(false);
  });
});

describe('meSchema', () => {
  it('meSchema aceita os três estados e recusa estado desconhecido', () => {
    const needsTeam = { state: 'needs_team', email: 'dono@acme.example' };
    const notInvited = { state: 'not_invited', email: 'visita@acme.example' };

    expect(meSchema.parse(member)).toEqual(member);
    expect(meSchema.parse(needsTeam)).toEqual(needsTeam);
    expect(meSchema.parse(notInvited)).toEqual(notInvited);
    expect(meSchema.safeParse({ ...needsTeam, state: 'outro' }).success).toBe(false);
  });

  it('aceita membro com avatar e sem projeto ativo', () => {
    const withAvatar = {
      ...member,
      user: { ...member.user, avatarUrl: 'https://acme.example/avatar.png' },
      defaultProjectSlug: null,
    };

    expect(meSchema.parse(withAvatar)).toEqual(withAvatar);
  });

  it('recusa membro incompleto ou com papel desconhecido', () => {
    expect(meSchema.safeParse({ state: 'member', email: 'dono@acme.example' }).success).toBe(false);
    expect(meSchema.safeParse({ ...member, role: 'owner' }).success).toBe(false);
    expect(meSchema.safeParse({ ...member, defaultProjectSlug: undefined }).success).toBe(false);
  });
});
