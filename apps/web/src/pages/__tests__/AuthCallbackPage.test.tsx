import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MEMBER, meAnswers, renderApp } from '../../test/renderApp';
import { seedSession } from '../../test/session';

describe('AuthCallbackPage', () => {
  it('mostra o carregamento e vai ao destino guardado, uma vez só', async () => {
    seedSession();
    meAnswers(MEMBER);
    sessionStorage.setItem('env.destino', '/p/vega?x=1');

    const app = renderApp('/auth/callback');

    expect(screen.getByRole('status')).toHaveTextContent('Carregando sua sessão');
    await waitFor(() => expect(app.path()).toBe('/p/vega'));
    expect(app.router.state.location.search).toBe('?x=1');
    expect(sessionStorage.getItem('env.destino')).toBeNull();
  });

  it('ignora destino externo', async () => {
    seedSession();
    meAnswers(MEMBER);
    sessionStorage.setItem('env.destino', '//site');

    const app = renderApp('/auth/callback');

    await waitFor(() => expect(app.path()).toBe('/p/atlas'));
  });

  it.each([
    '/auth/callback?error=access_denied&error_description=Texto+do+invasor',
    '/auth/callback#error=server_error&error_description=Texto+do+invasor',
  ])('com erro na URL, volta ao login com texto fixo: %s', async (url) => {
    const app = renderApp(url);

    const alert = await screen.findByRole('alert');
    expect(app.path()).toBe('/login');
    expect(app.router.state.location.search).toBe('');
    expect(alert).toHaveTextContent('Não foi possível entrar');
    expect(document.body).not.toHaveTextContent(/invasor|access_denied|server_error/);
  });

  it('sem sessão depois do retorno, volta ao login com a faixa', async () => {
    const app = renderApp('/auth/callback');

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar');
    expect(app.path()).toBe('/login');
  });
});
