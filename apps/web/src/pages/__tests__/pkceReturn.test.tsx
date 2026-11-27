// O retorno do Google de verdade: o `supabase-js` lê o endereço assim que é criado. Por isso o
// endereço, o verificador PKCE e as respostas são preparados antes de o app ser importado, num
// arquivo só para este caso.
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { beforeAll, expect, it } from 'vitest';
import { server } from '../../test/server';
import { fakeSession, SUPABASE_URL } from '../../test/session';

const exchanges: unknown[] = [];
let appModule: typeof import('../../test/renderApp');

// Importar o app inteiro aqui dentro demora; o prazo folgado é só para isso.
beforeAll(async () => {
  window.history.replaceState(null, '', '/auth/callback?code=codigo-do-google');
  localStorage.setItem('env.auth-code-verifier', JSON.stringify('verificador-deste-navegador'));
  sessionStorage.setItem('env.destino', '/p/atlas');
  server.use(
    http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
      exchanges.push(await request.json());
      return HttpResponse.json(fakeSession());
    }),
  );
  appModule = await import('../../test/renderApp');
}, 30_000);

it('troca o código pela sessão com o verificador PKCE e segue para o destino', async () => {
  appModule.meAnswers(appModule.MEMBER);

  const app = appModule.renderApp('/auth/callback?code=codigo-do-google');

  expect(await screen.findByRole('heading', { level: 1, name: 'Acme' })).toBeInTheDocument();
  await waitFor(() => expect(app.path()).toBe('/p/atlas'));
  expect(exchanges).toEqual([
    { auth_code: 'codigo-do-google', code_verifier: 'verificador-deste-navegador' },
  ]);
  expect(window.location.search).toBe('');
});
