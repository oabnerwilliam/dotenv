import {
  createRemoteJWKSet,
  customFetch,
  exportSPKI,
  generateKeyPair,
  type JWTVerifyGetKey,
  SignJWT,
} from 'jose';
import { createTestAuth } from '../../../test/support/auth';
import type { Env } from '../../config/env';
import { TokenVerifier } from '../token-verifier';

const SUPABASE_URL = 'https://supabase.acme.example';
const SUB = '3f1c2a9e-7b4d-4e1a-9c3f-2d8b5a6e1f00';

const UNAUTHENTICATED = {
  code: 'UNAUTHENTICATED',
  message: 'Sua sessão expirou. Entre novamente.',
};

function verifierWith(jwks: JWTVerifyGetKey, testMode = false): TokenVerifier {
  const env = { SUPABASE_URL, AUTH_TEST_MODE: testMode } as Env;
  return new TokenVerifier(env, jwks);
}

describe('TokenVerifier', () => {
  let auth: Awaited<ReturnType<typeof createTestAuth>>;
  let verifier: TokenVerifier;

  beforeAll(async () => {
    auth = await createTestAuth(SUPABASE_URL);
    verifier = verifierWith(auth.jwks);
  });

  const past = () => Math.floor(Date.now() / 1000) - 60;

  it('aceita um token válido e devolve quem é a pessoa', async () => {
    const token = await auth.signToken({
      claims: {
        sub: SUB,
        user_metadata: { full_name: 'Ana Souza', avatar_url: 'https://img.acme.example/a.png' },
      },
    });

    await expect(verifier.verify(token)).resolves.toMatchObject({
      supabaseId: SUB,
      name: 'Ana Souza',
      avatarUrl: 'https://img.acme.example/a.png',
    });
  });

  it('devolve o e-mail do token só para exibição', async () => {
    const token = await auth.signToken({ claims: { email: 'ana@acme.example' } });

    await expect(verifier.verify(token)).resolves.toMatchObject({
      claimedEmail: 'ana@acme.example',
    });
  });

  it.each([
    ['ausente', undefined],
    ['vazio', ''],
    ['que não é texto', 42],
    ['grande demais', `${'a'.repeat(400)}@acme.example`],
  ])('devolve claimedEmail null com e-mail %s', async (_label, email) => {
    const token = await auth.signToken({ claims: { email } });

    await expect(verifier.verify(token)).resolves.toMatchObject({ claimedEmail: null });
  });

  it.each([
    ['name quando não há full_name', { name: 'Bia Lima' }, 'Bia Lima'],
    ['"Sem nome" quando não há nome', {}, 'Sem nome'],
    ['"Sem nome" quando o nome é só espaço', { full_name: '   ' }, 'Sem nome'],
    ['"Sem nome" quando o nome não é texto', { full_name: 42 }, 'Sem nome'],
    ['o nome cortado em 120 caracteres', { full_name: 'a'.repeat(300) }, 'a'.repeat(120)],
  ])('usa %s', async (_label, metadata, expected) => {
    const token = await auth.signToken({ claims: { user_metadata: metadata } });

    await expect(verifier.verify(token)).resolves.toMatchObject({ name: expected });
  });

  it.each([
    ['http', 'http://img.acme.example/a.png'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:image/png;base64,AAAA'],
    ['texto solto', 'foto'],
    ['grande demais', `https://img.acme.example/${'a'.repeat(3000)}`],
  ])('ignora avatar que não é uma URL https aceitável (%s)', async (_label, url) => {
    const token = await auth.signToken({ claims: { user_metadata: { avatar_url: url } } });

    await expect(verifier.verify(token)).resolves.toMatchObject({ avatarUrl: null });
  });

  it.each(['', 'nao-e-um-token', 'a.b.c'])(
    'recusa token ausente ou malformado "%s"',
    async (token) => {
      await expect(verifier.verify(token)).rejects.toMatchObject(UNAUTHENTICATED);
    },
  );

  it.each([
    ['expirado', () => ({ exp: past() })],
    ['sem exp', () => ({ exp: undefined })],
    ['sem sub', () => ({ sub: undefined })],
    ['com sub que não é uuid', () => ({ sub: 'qualquer-um' })],
    ['de outro emissor', () => ({ iss: 'https://outro.example/auth/v1' })],
    ['de outra audiência', () => ({ aud: 'anon' })],
    ['de provider diferente de google', () => ({ app_metadata: { provider: 'github' } })],
    ['de provider email fora do modo de teste', () => ({ app_metadata: { provider: 'email' } })],
    ['sem app_metadata', () => ({ app_metadata: undefined })],
    // O usuário edita o `user_metadata`: o provider escrito ali não vale.
    [
      'com google só no user_metadata',
      () => ({ app_metadata: {}, user_metadata: { provider: 'google' } }),
    ],
  ])('recusa token %s', async (_label, claims) => {
    const token = await auth.signToken({ claims: claims() });

    await expect(verifier.verify(token)).rejects.toMatchObject(UNAUTHENTICATED);
  });

  it('recusa assinatura feita com outra chave', async () => {
    const intruder = await generateKeyPair('ES256');
    const token = await auth.signToken({ key: intruder.privateKey });

    await expect(verifier.verify(token)).rejects.toMatchObject(UNAUTHENTICATED);
  });

  it('recusa chave desconhecida (outro kid)', async () => {
    const intruder = await generateKeyPair('ES256');
    const token = await new SignJWT({ sub: SUB })
      .setProtectedHeader({ alg: 'ES256', kid: 'outra-chave' })
      .sign(intruder.privateKey);

    await expect(verifier.verify(token)).rejects.toMatchObject(UNAUTHENTICATED);
  });

  it('recusa alg none', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const payload = (await auth.signToken()).split('.')[1];

    await expect(
      verifier.verify(`${encode({ alg: 'none', typ: 'JWT' })}.${payload}.`),
    ).rejects.toMatchObject(UNAUTHENTICATED);
  });

  // Ataque clássico: usar a chave pública, que qualquer um conhece, como segredo do HMAC.
  it('recusa HS256 assinado com a chave pública', async () => {
    const secret = new TextEncoder().encode(await exportSPKI(auth.publicKey));
    const token = await new SignJWT({
      sub: SUB,
      app_metadata: { provider: 'google' },
    })
      .setProtectedHeader({ alg: 'HS256', kid: 'chave-de-teste' })
      .setIssuer(`${SUPABASE_URL}/auth/v1`)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(secret);

    await expect(verifier.verify(token)).rejects.toMatchObject(UNAUTHENTICATED);
  });

  it('no modo de teste aceita o provider email', async () => {
    const token = await auth.signToken({ claims: { app_metadata: { provider: 'email' } } });

    await expect(verifierWith(auth.jwks, true).verify(token)).resolves.toMatchObject({
      name: 'Pessoa de Teste',
    });
  });

  it('no modo de teste continua recusando outros providers', async () => {
    const token = await auth.signToken({ claims: { app_metadata: { provider: 'github' } } });

    await expect(verifierWith(auth.jwks, true).verify(token)).rejects.toMatchObject(
      UNAUTHENTICATED,
    );
  });

  // Supabase fora do ar não é sessão expirada: o app não pode deslogar a pessoa por isso.
  it.each([
    ['a rede falha', () => Promise.reject(new TypeError('fetch failed'))],
    ['o servidor responde 500', () => Promise.resolve(new Response('erro', { status: 500 }))],
    ['a resposta não é JSON', () => Promise.resolve(new Response('<html>', { status: 200 }))],
    ['a resposta não é um JWKS', () => Promise.resolve(Response.json({ outra: 'coisa' }))],
    ['o prazo estoura', () => Promise.reject(new DOMException('prazo', 'TimeoutError'))],
  ])(
    'erro interno, e não UNAUTHENTICATED, quando %s ao buscar as chaves',
    async (_label, fetch) => {
      const remote = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`), {
        [customFetch]: fetch,
      });
      const token = await auth.signToken();

      const error: unknown = await verifierWith(remote)
        .verify(token)
        .then(
          () => undefined,
          (reason: unknown) => reason,
        );

      expect(error).toBeDefined();
      expect(error).not.toHaveProperty('code', 'UNAUTHENTICATED');
      expect((error as Error).name).not.toBe('AppError');
    },
  );
});
