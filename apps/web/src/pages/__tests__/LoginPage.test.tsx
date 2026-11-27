import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import { MEMBER, meAnswers, renderApp } from '../../test/renderApp';
import { seedSession } from '../../test/session';

const LOGIN_BUTTON = { name: 'Continuar com Google' };

// Só a ida ao Google é simulada: o jsdom não navega para fora.
function googleStarts() {
  return vi
    .spyOn(supabase.auth, 'signInWithOAuth')
    .mockResolvedValue({ data: { provider: 'google', url: 'x' }, error: null });
}

function backFromCache(persisted: boolean) {
  window.dispatchEvent(Object.assign(new Event('pageshow'), { persisted }));
}

afterEach(() => vi.restoreAllMocks());

describe('LoginPage', () => {
  it('há um único botão, "Continuar com Google", que inicia o login', async () => {
    const signIn = googleStarts();
    const app = renderApp('/login');

    expect(screen.getByRole('heading', { level: 1, name: 'Entrar no .env' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // A região de situação existe antes de ter texto, para a troca ser anunciada.
    expect(screen.getByRole('status')).toBeEmptyDOMElement();

    await app.user.tab();
    expect(screen.getByRole('button', LOGIN_BUTTON)).toHaveFocus();
    await app.user.keyboard('{Enter}');

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn.mock.calls[0]?.[0].provider).toBe('google');
    expect(screen.getByRole('button', LOGIN_BUTTON)).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Abrindo o Google…');
  });

  it('voltando do cache do navegador, o botão fica ativo de novo', async () => {
    googleStarts();
    const app = renderApp('/login');
    await app.user.click(screen.getByRole('button', LOGIN_BUTTON));
    expect(screen.getByRole('button', LOGIN_BUTTON)).toBeDisabled();

    backFromCache(false);
    expect(screen.getByRole('button', LOGIN_BUTTON)).toBeDisabled();
    backFromCache(true);

    await waitFor(() => expect(screen.getByRole('button', LOGIN_BUTTON)).toBeEnabled());
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('falha ao iniciar mostra a faixa e permite tentar de novo', async () => {
    const signIn = vi.spyOn(supabase.auth, 'signInWithOAuth').mockRejectedValue(new Error('x'));
    const app = renderApp('/login');

    await app.user.click(screen.getByRole('button', LOGIN_BUTTON));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível entrar');
    expect(alert).toHaveTextContent('O login com o Google não foi concluído. Tente de novo.');
    expect(alert).toHaveAttribute('data-status', 'bloqueado');
    expect(screen.getByRole('button', LOGIN_BUTTON)).toBeEnabled();

    signIn.mockResolvedValue({ data: { provider: 'google', url: 'x' }, error: null });
    await app.user.click(screen.getByRole('button', LOGIN_BUTTON));

    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('quem já entrou não fica na tela de login', async () => {
    seedSession();
    meAnswers(MEMBER);

    const app = renderApp('/login');

    await waitFor(() => expect(app.path()).toBe('/p/atlas'));
  });
});
