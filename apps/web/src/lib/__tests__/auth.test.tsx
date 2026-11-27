import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../test/server';
import { fakeSession, logoutAnswers, seedSession, storedSession } from '../../test/session';
import { AuthProvider, signInWithGoogle, useMe, useSession, useSignOut } from '../auth';
import { supabase } from '../supabase';

const ME_URL = 'http://localhost:3333/me';

function renderAuth() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
  const view = renderHook(() => ({ session: useSession(), me: useMe(), signOut: useSignOut() }), {
    wrapper,
  });
  return { ...view, client };
}

/** `/me` responde com o e-mail de quem está no token. */
function meAnswers() {
  server.use(
    http.get(ME_URL, ({ request }) => {
      const isBia = request.headers.get('Authorization') === 'Bearer token-bia';
      const email = isBia ? 'bia@acme.example' : 'alex@acme.example';
      return HttpResponse.json({ state: 'not_invited', email });
    }),
  );
}

/** Entra com sessão guardada e espera o `/me`, deixando também um dado qualquer em cache. */
async function renderSignedIn() {
  seedSession();
  meAnswers();
  const view = renderAuth();
  await waitFor(() => expect(view.result.current.me.data).toBeDefined());
  view.client.setQueryData(['segredo'], 'dado do alex');
  return view;
}

afterEach(() => vi.restoreAllMocks());

describe('signInWithGoogle', () => {
  it('usa o provedor google e o retorno /auth/callback', async () => {
    const signIn = vi
      .spyOn(supabase.auth, 'signInWithOAuth')
      .mockResolvedValue({ data: { provider: 'google', url: 'x' }, error: null });

    await signInWithGoogle();

    expect(signIn).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  });

  it('falha quando o Supabase devolve erro', async () => {
    vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({
      data: { provider: 'google', url: null },
      error: new Error('sem conexão'),
    } as never);

    await expect(signInWithGoogle()).rejects.toThrow('sem conexão');
  });
});

describe('sessão', () => {
  it('começa carregando e, sem sessão, não consulta /me', async () => {
    const { result } = renderAuth();

    expect(result.current.session.status).toBe('loading');
    await waitFor(() => expect(result.current.session.status).toBe('signed_out'));
    expect(result.current.me.fetchStatus).toBe('idle');
  });

  it('com sessão guardada, entra e consulta /me', async () => {
    const { result } = await renderSignedIn();

    expect(result.current.session).toEqual({ status: 'signed_in', userId: 'user-alex' });
    expect(result.current.me.data).toEqual({ state: 'not_invited', email: 'alex@acme.example' });
  });

  it.each([204, 500] as const)(
    'sair limpa o cache e a sessão deste navegador (Supabase responde %i)',
    async (status) => {
      const { result, client } = await renderSignedIn();
      const logouts = logoutAnswers(status);

      await act(() => result.current.signOut());

      expect(client.getQueryData(['segredo'])).toBeUndefined();
      expect(client.getQueryData(['me', 'user-alex'])).toBeUndefined();
      expect(storedSession()).toBeNull();
      await waitFor(() => expect(result.current.session.status).toBe('signed_out'));
      expect(logouts).toEqual(['local']);
    },
  );

  it('sair limpa o cache mesmo se o supabase-js lançar erro', async () => {
    const { result, client } = await renderSignedIn();
    vi.spyOn(supabase.auth, 'signOut').mockRejectedValue(new Error('falhou'));

    await act(() => result.current.signOut());

    expect(client.getQueryData(['segredo'])).toBeUndefined();
  });

  it('SIGNED_OUT vindo de fora (sessão expirada) também limpa o cache', async () => {
    const { result, client } = await renderSignedIn();
    logoutAnswers(204);

    // Sem passar pelo `useSignOut`: é o que acontece quando o supabase-js desiste da sessão.
    await act(() => supabase.auth.signOut({ scope: 'local' }));

    await waitFor(() => expect(result.current.session.status).toBe('signed_out'));
    expect(client.getQueryData(['segredo'])).toBeUndefined();
  });

  it('outra pessoa entrando em outra aba limpa o cache e consulta /me de novo', async () => {
    const { result, client } = await renderSignedIn();
    const other = fakeSession({ userId: 'user-bia', accessToken: 'token-bia' });
    localStorage.setItem('env.auth', JSON.stringify(other));

    // É por este canal que o supabase-js avisa as outras abas.
    const channel = new BroadcastChannel('env.auth');
    channel.postMessage({ event: 'SIGNED_IN', session: other });

    await waitFor(() =>
      expect(result.current.me.data).toEqual({ state: 'not_invited', email: 'bia@acme.example' }),
    );
    expect(client.getQueryData(['segredo'])).toBeUndefined();
    channel.close();
  });

  it('o mesmo usuário avisado de novo mantém o cache', async () => {
    const { client } = await renderSignedIn();
    const seen = vi.fn();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED') seen();
    });
    const channel = new BroadcastChannel('env.auth');

    channel.postMessage({ event: 'TOKEN_REFRESHED', session: fakeSession() });

    await waitFor(() => expect(seen).toHaveBeenCalled());
    expect(client.getQueryData(['segredo'])).toBe('dado do alex');
    data.subscription.unsubscribe();
    channel.close();
  });
});
