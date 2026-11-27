import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../../config/env';
import { IdentityVerifier } from '../identity-verifier';

const ID = '3f1c2a9e-7b4d-4e1a-9c3f-2d8b5a6e1f00';

function setup(answer: { user?: object | null; error?: object | null }, testMode = false) {
  const getUserById = jest.fn().mockResolvedValue({
    data: { user: answer.user ?? null },
    error: answer.error ?? null,
  });
  const supabase = { auth: { admin: { getUserById } } } as unknown as SupabaseClient;
  const env = { AUTH_TEST_MODE: testMode } as Env;
  return { verifier: new IdentityVerifier(env, supabase), getUserById };
}

const google = (data: object) => ({ provider: 'google', identity_data: data });

describe('IdentityVerifier', () => {
  it('devolve o e-mail verificado da identidade google, normalizado', async () => {
    const { verifier, getUserById } = setup({
      user: { identities: [google({ email: ' Ana@Acme.Example ', email_verified: true })] },
    });

    await expect(verifier.verifiedEmail(ID)).resolves.toBe('ana@acme.example');
    expect(getUserById).toHaveBeenCalledWith(ID);
  });

  it.each([
    ['não verificado', google({ email: 'ana@acme.example', email_verified: false })],
    ['sem a marca de verificação', google({ email: 'ana@acme.example' })],
    ['com a marca em texto', google({ email: 'ana@acme.example', email_verified: 'true' })],
    ['sem e-mail', google({ email_verified: true })],
    ['sem dados', { provider: 'google' }],
    [
      'de outro provider',
      { provider: 'github', identity_data: { email: 'ana@acme.example', email_verified: true } },
    ],
  ])('devolve null para identidade %s', async (_label, identity) => {
    const { verifier } = setup({ user: { identities: [identity] } });

    await expect(verifier.verifiedEmail(ID)).resolves.toBeNull();
  });

  // `user.email` e `user_metadata` podem ser alterados pelo próprio usuário.
  it('ignora o e-mail do user_metadata e o da conta', async () => {
    const { verifier } = setup({
      user: {
        email: 'dono@acme.example',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        user_metadata: { email: 'dono@acme.example', email_verified: true },
        identities: [google({ email: 'ana@acme.example', email_verified: true })],
      },
    });

    await expect(verifier.verifiedEmail(ID)).resolves.toBe('ana@acme.example');
  });

  const emailUser = (extra: object) => ({
    email: 'Teste@Acme.Example',
    identities: [{ provider: 'email', identity_data: { email_verified: false } }],
    ...extra,
  });

  it('fora do modo de teste recusa a identidade email', async () => {
    const { verifier } = setup({
      user: emailUser({ email_confirmed_at: '2026-01-01T00:00:00Z' }),
    });

    await expect(verifier.verifiedEmail(ID)).resolves.toBeNull();
  });

  it('no modo de teste aceita a identidade email com email_confirmed_at', async () => {
    const { verifier } = setup(
      { user: emailUser({ email_confirmed_at: '2026-01-01T00:00:00Z' }) },
      true,
    );

    await expect(verifier.verifiedEmail(ID)).resolves.toBe('teste@acme.example');
  });

  it('no modo de teste recusa a identidade email sem email_confirmed_at', async () => {
    const { verifier } = setup({ user: emailUser({}) }, true);

    await expect(verifier.verifiedEmail(ID)).resolves.toBeNull();
  });

  it('devolve null quando o usuário não existe mais', async () => {
    const { verifier } = setup({ error: { code: 'user_not_found', status: 404 } });

    await expect(verifier.verifiedEmail(ID)).resolves.toBeNull();
  });

  // Um 404 sem esse código é endereço errado, não usuário inexistente.
  it.each([
    ['indisponível', { status: 503 }],
    ['inalcançável', { status: 0 }],
    ['recusando a chave', { status: 401, code: 'no_authorization' }],
    ['em endereço errado', { status: 404 }],
  ])('falha com erro interno quando o Supabase está %s', async (_label, error) => {
    const { verifier } = setup({ error: { ...error, message: 'detalhe ana@acme.example' } });

    const failure: unknown = await verifier.verifiedEmail(ID).catch((reason: unknown) => reason);

    expect(failure).toBeInstanceOf(Error);
    expect(failure).not.toHaveProperty('code');
    expect((failure as Error).message).not.toContain('ana@');
  });
});
