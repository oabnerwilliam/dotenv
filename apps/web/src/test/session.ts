// Sessão de mentira para os testes: o `supabase-js` real lê o que gravamos aqui, como leria
// depois de um login de verdade. Nada do Supabase é substituído por simulação.
import { http, HttpResponse } from 'msw';
import { server } from './server';

export const SUPABASE_URL = 'http://127.0.0.1:54321';
const STORAGE_KEY = 'env.auth';

type SessionOptions = { userId?: string; accessToken?: string };

export function fakeSession({
  userId = 'user-alex',
  accessToken = 'token-alex',
}: SessionOptions = {}) {
  return {
    access_token: accessToken,
    refresh_token: `refresh-${userId}`,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id: userId,
      aud: 'authenticated',
      email: 'alex@acme.example',
      app_metadata: { provider: 'google' },
      user_metadata: {},
      created_at: '2026-01-01T00:00:00Z',
    },
  };
}

export function seedSession(options?: SessionOptions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession(options)));
}

export function storedSession() {
  return localStorage.getItem(STORAGE_KEY);
}

/** Responde o logout do Supabase e devolve a lista dos escopos pedidos. */
export function logoutAnswers(status: 204 | 500) {
  const scopes: Array<string | null> = [];
  server.use(
    http.post(`${SUPABASE_URL}/auth/v1/logout`, ({ request }) => {
      scopes.push(new URL(request.url).searchParams.get('scope'));
      return status === 204
        ? new HttpResponse(null, { status })
        : HttpResponse.json({ message: 'falhou' }, { status });
    }),
  );
  return scopes;
}
