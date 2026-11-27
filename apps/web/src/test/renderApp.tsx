// Monta o app inteiro (rotas, sessão e cache de verdade) num roteador em memória.
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { createMemoryRouter, type InitialEntry } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { routes } from '../app/router';
import { AuthProvider } from '../lib/auth';
import { createQueryClient } from '../lib/queryClient';
import { server } from './server';

export const ME_URL = 'http://localhost:3333/me';

export const MEMBER = {
  state: 'member',
  user: { id: 'u1', name: 'Alex Souza', email: 'alex@acme.example', avatarUrl: null },
  team: { id: 't1', name: 'Acme', slug: 'acme' },
  role: 'admin',
  defaultProjectSlug: 'atlas',
} as const;

export const NEEDS_TEAM = { state: 'needs_team', email: 'alex@acme.example' } as const;
export const NOT_INVITED = { state: 'not_invited', email: 'alex@acme.example' } as const;

/** Faz o `/me` responder e devolve quantas vezes foi consultado. */
export function meAnswers(body: object, status = 200) {
  const calls = { count: 0 };
  server.use(
    http.get(ME_URL, () => {
      calls.count += 1;
      return HttpResponse.json(body, { status });
    }),
  );
  return calls;
}

export function renderApp(entry: InitialEntry) {
  const client = createQueryClient();
  // Mantém a regra de repetição do app, sem esperar entre as tentativas.
  const { queries } = client.getDefaultOptions();
  client.setDefaultOptions({ queries: { ...queries, retryDelay: 0 } });
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { client, router, user, path: () => router.state.location.pathname };
}
