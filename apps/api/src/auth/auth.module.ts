import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { createRemoteJWKSet } from 'jose';
import { ENV, type Env } from '../config/env';
import { IdentityVerifier, SUPABASE_ADMIN } from './identity-verifier';
import { JWKS, TokenVerifier } from './token-verifier';

const SUPABASE_TIMEOUT_MS = 5000;

@Module({
  providers: [
    {
      provide: JWKS,
      inject: [ENV],
      // Busca as chaves no primeiro token e as guarda em memória; busca de novo quando aparece
      // uma chave desconhecida. Nada é pedido na partida.
      useFactory: (env: Env) =>
        createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`)),
    },
    {
      provide: SUPABASE_ADMIN,
      inject: [ENV],
      useFactory: (env: Env) =>
        createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
          // Servidor: não há sessão de ninguém para guardar nem renovar.
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            // O `fetch` não tem prazo próprio: sem isto, um Auth travado prenderia a requisição.
            fetch: (input, init) =>
              fetch(input, { ...init, signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS) }),
          },
        }),
    },
    TokenVerifier,
    IdentityVerifier,
  ],
  exports: [TokenVerifier, IdentityVerifier],
})
export class AuthModule {}
