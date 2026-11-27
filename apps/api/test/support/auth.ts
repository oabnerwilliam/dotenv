import { randomUUID } from 'node:crypto';
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTPayload,
  SignJWT,
  type CryptoKey,
} from 'jose';

const KEY_ID = 'chave-de-teste';

export interface TokenOptions {
  /** Sobrescreve ou acrescenta claims. Um valor `undefined` remove o claim. */
  claims?: JWTPayload;
  /** Para assinar com uma chave que a API não conhece. */
  key?: CryptoKey;
}

// Faz o papel do Supabase Auth: cria um par de chaves, publica a pública como JWKS e assina
// tokens com a privada. Assim os testes não dependem do Google nem da rede.
export async function createTestAuth(supabaseUrl: string) {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwks = createLocalJWKSet({
    keys: [{ ...(await exportJWK(publicKey)), kid: KEY_ID, alg: 'ES256', use: 'sig' }],
  });

  /** Um token válido de quem entrou com o Google, a menos que `claims` diga o contrário. */
  async function signToken({ claims = {}, key = privateKey }: TokenOptions = {}) {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      iss: `${supabaseUrl}/auth/v1`,
      aud: 'authenticated',
      sub: randomUUID(),
      iat: now,
      exp: now + 3600,
      email: 'pessoa@acme.example',
      app_metadata: { provider: 'google' },
      user_metadata: { full_name: 'Pessoa de Teste' },
      ...claims,
    })
      .setProtectedHeader({ alg: 'ES256', kid: KEY_ID })
      .sign(key);
  }

  return { jwks, publicKey, signToken };
}

// Faz o papel do `IdentityVerifier`, que consultaria o Supabase: o teste diz qual é o e-mail
// verificado de cada pessoa. Quem não está no mapa não tem e-mail verificado.
export function createIdentityStub() {
  const emails = new Map<string, string>();
  let waitFor = 1;
  let waiting: (() => void)[] = [];

  return {
    emails,

    /**
     * Segura as próximas `count` consultas até todas chegarem. Garante que requisições
     * simultâneas passem juntas deste ponto, para a disputa acontecer de verdade no banco.
     */
    holdUntil(count: number): void {
      waitFor = count;
    },

    reset(): void {
      emails.clear();
      waitFor = 1;
      waiting = [];
    },

    verifiedEmail: jest.fn(async (supabaseId: string): Promise<string | null> => {
      if (waitFor > 1) {
        await new Promise<void>((resolve) => {
          waiting.push(resolve);
          if (waiting.length === waitFor) {
            waiting.forEach((release) => release());
            waiting = [];
            waitFor = 1;
          }
        });
      }
      return emails.get(supabaseId) ?? null;
    }),
  };
}
