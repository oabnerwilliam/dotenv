// Contas de teste no Supabase Auth local.
import { randomBytes } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseStatus } from '../../apps/api/test/support/supabase-status';

/** A chave com que o app guarda a sessão no `localStorage` (`apps/web/src/lib/supabase.ts`). */
export const SESSION_KEY = 'env.auth';

// Só endereços fictícios: o Auth local é o mesmo do desenvolvimento, e a conta de uma pessoa de
// verdade nunca pode ter a senha trocada por um teste.
const TEST_DOMAIN = '@acme.example';
const PAGE_SIZE = 200;

export interface TestUser {
  email: string;
  name: string;
}

const NO_PERSISTENCE = { persistSession: false, autoRefreshToken: false };

function adminClient(): SupabaseClient {
  const { API_URL, SECRET_KEY } = supabaseStatus();
  return createClient(API_URL, SECRET_KEY, { auth: NO_PERSISTENCE });
}

async function findUserId(admin: SupabaseClient, email: string): Promise<string> {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`Falha ao listar as contas de teste: ${error.message}`);
    const found = data.users.find((user) => user.email === email);
    if (found) return found.id;
    if (data.users.length < PAGE_SIZE) throw new Error('Conta de teste não encontrada.');
  }
}

// Cria a conta já confirmada ou, se ela sobrou de uma execução anterior, troca a senha.
async function ensureUser({ email, name }: TestUser, password: string): Promise<void> {
  const admin = adminClient();
  const attributes = { password, email_confirm: true, user_metadata: { full_name: name } };

  const { error } = await admin.auth.admin.createUser({ email, ...attributes });
  if (!error) return;
  if (error.code !== 'email_exists') {
    throw new Error(`Falha ao criar a conta de teste: ${error.message}`);
  }

  const id = await findUserId(admin, email);
  const updated = await admin.auth.admin.updateUserById(id, attributes);
  if (updated.error) {
    throw new Error(`Falha ao atualizar a conta de teste: ${updated.error.message}`);
  }
}

/**
 * Entra no Supabase local com uma conta de teste e devolve a sessão no formato em que o
 * `supabase-js` a guarda, pronta para o `localStorage` do app.
 */
export async function createTestSession(user: TestUser): Promise<string> {
  if (!user.email.endsWith(TEST_DOMAIN)) {
    throw new Error(`Contas de teste usam só endereços ${TEST_DOMAIN}.`);
  }

  // Gerada na hora e esquecida em seguida: nenhuma senha fica escrita no repositório.
  const password = randomBytes(24).toString('base64url');
  await ensureUser(user, password);

  // Um armazenamento em memória no lugar do `localStorage`: é o próprio `supabase-js` que
  // monta o texto da sessão.
  const stored = new Map<string, string>();
  const { API_URL, PUBLISHABLE_KEY } = supabaseStatus();
  const client = createClient(API_URL, PUBLISHABLE_KEY, {
    auth: {
      storageKey: SESSION_KEY,
      autoRefreshToken: false,
      storage: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => void stored.set(key, value),
        removeItem: (key) => void stored.delete(key),
      },
    },
  });

  const { error } = await client.auth.signInWithPassword({ email: user.email, password });
  if (error) throw new Error(`Falha ao entrar com a conta de teste: ${error.message}`);

  const session = stored.get(SESSION_KEY);
  if (!session) throw new Error('O supabase-js não guardou a sessão.');
  return session;
}
