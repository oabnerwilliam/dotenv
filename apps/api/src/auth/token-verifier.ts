import { Inject, Injectable } from '@nestjs/common';
import { errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { z } from 'zod';
import { ENV, type Env } from '../config/env';
import { sessionExpired } from './session-expired';

/** As chaves públicas do Supabase (JWKS). Injetável para os testes usarem chaves próprias. */
export const JWKS = Symbol('JWKS');

const NAME_MAX = 120;
const URL_MAX = 2048;
const EMAIL_MAX = 320;

// Erros que significam "este token não serve". Qualquer outro (rede, prazo, resposta estranha ao
// buscar as chaves) é problema nosso e vira 500: não pode deslogar quem tem um token bom.
const BAD_TOKEN_ERRORS = [
  errors.JWTExpired,
  errors.JWTClaimValidationFailed,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
];

export interface VerifiedToken {
  /** Id da pessoa no Supabase Auth. É a única informação usada para decidir quem ela é. */
  supabaseId: string;
  /** Nome e avatar são editáveis pelo próprio usuário: só para exibir. */
  name: string;
  avatarUrl: string | null;
  /** O e-mail escrito no token. Só para exibir: nenhuma decisão de acesso se baseia nele. */
  claimedEmail: string | null;
}

const uuid = z.guid();

@Injectable()
export class TokenVerifier {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(JWKS) private readonly jwks: JWTVerifyGetKey,
  ) {}

  async verify(token: string): Promise<VerifiedToken> {
    const payload = await this.verifiedPayload(token);

    const supabaseId = uuid.safeParse(payload.sub);
    // O `app_metadata` só é alterado pelo Supabase; o `user_metadata`, pelo usuário.
    const provider = asRecord(payload.app_metadata).provider;
    const allowed = provider === 'google' || (this.env.AUTH_TEST_MODE && provider === 'email');
    if (!supabaseId.success || !allowed) throw sessionExpired();

    const metadata = asRecord(payload.user_metadata);
    return {
      supabaseId: supabaseId.data,
      name: displayName(metadata.full_name) ?? displayName(metadata.name) ?? 'Sem nome',
      avatarUrl: httpsUrl(metadata.avatar_url),
      claimedEmail: shortText(payload.email, EMAIL_MAX),
    };
  }

  // Assinatura, emissor, audiência e validade, conferidos localmente com as chaves públicas.
  private async verifiedPayload(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${this.env.SUPABASE_URL}/auth/v1`,
        audience: 'authenticated',
        // Só assinaturas de chave pública: recusa `none` e HMAC (HS256).
        algorithms: ['ES256', 'RS256'],
        // Sem isto, um token sem `exp` valeria para sempre.
        requiredClaims: ['exp', 'sub'],
      });
      return payload;
    } catch (error) {
      if (BAD_TOKEN_ERRORS.some((type) => error instanceof type)) throw sessionExpired();
      throw error;
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function displayName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  // `Array.from` corta por caractere, sem partir um emoji ao meio.
  const name = Array.from(value.trim()).slice(0, NAME_MAX).join('').trim();
  return name || undefined;
}

function shortText(value: unknown, max: number): string | null {
  return typeof value === 'string' && value && value.length <= max ? value : null;
}

// A URL vai para um `<img src>` no navegador: só `https`.
function httpsUrl(value: unknown): string | null {
  const url = shortText(value, URL_MAX);
  return url && URL.canParse(url) && new URL(url).protocol === 'https:' ? url : null;
}
