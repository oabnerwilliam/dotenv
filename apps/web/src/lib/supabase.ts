// No front, o Supabase serve só para o login. Dados vêm sempre da API.
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  // PKCE: o Google devolve um código que só este navegador consegue trocar pela sessão.
  // `storageKey` é fixa porque o e2e grava a sessão nela.
  auth: { flowType: 'pkce', storageKey: 'env.auth' },
});

/**
 * Encerra a sessão só neste navegador. A cópia local é apagada antes da chamada ao servidor,
 * então a pessoa sai mesmo que o Supabase falhe; por isso a falha é ignorada.
 */
export async function endLocalSession(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // Nada a fazer: quem chamou segue em frente.
  }
}
