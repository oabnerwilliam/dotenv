import { normalizeEmail } from '@env/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { ENV, type Env } from '../config/env';

/** Cliente do Supabase com a chave secreta. */
export const SUPABASE_ADMIN = Symbol('SUPABASE_ADMIN');

// Descobre o e-mail em que se pode confiar para decidir acesso (ADR 0002). Não usa o token: lê a
// identidade do Google guardada pelo Supabase, que o usuário não consegue editar.
@Injectable()
export class IdentityVerifier {
  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(SUPABASE_ADMIN) private readonly supabase: SupabaseClient,
  ) {}

  /** O e-mail verificado, normalizado; `null` se a pessoa não tiver um. */
  async verifiedEmail(supabaseId: string): Promise<string | null> {
    const { data, error } = await this.supabase.auth.admin.getUserById(supabaseId);
    if (error) {
      if (error.code === 'user_not_found') return null;
      // Erro interno. A mensagem original fica de fora: pode repetir dados da pessoa.
      throw new Error(`Falha ao consultar o Supabase Auth (status ${error.status}).`);
    }

    const email = googleEmail(data.user) ?? this.testEmail(data.user);
    return email ? normalizeEmail(email) : null;
  }

  // Login por e-mail e senha, só para o teste ponta a ponta. O Supabase deixa `email_verified`
  // falso nessa identidade, mesmo quando a conta é criada já confirmada.
  private testEmail(user: User): string | undefined {
    if (!this.env.AUTH_TEST_MODE) return undefined;
    const hasEmailIdentity = user.identities?.some((identity) => identity.provider === 'email');
    return hasEmailIdentity && user.email_confirmed_at ? user.email : undefined;
  }
}

function googleEmail(user: User): string | undefined {
  for (const { provider, identity_data: data } of user.identities ?? []) {
    if (provider === 'google' && data?.email_verified === true && typeof data.email === 'string') {
      return data.email;
    }
  }
  return undefined;
}
