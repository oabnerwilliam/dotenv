import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { meAnswers, NOT_INVITED, renderApp } from '../../test/renderApp';
import { logoutAnswers, seedSession, storedSession } from '../../test/session';

const TITLE = { level: 1, name: 'Você não tem acesso a esta equipe' } as const;

describe('NoAccessPage', () => {
  it('mostra o título em h1, o e-mail em uso e só a ação "Sair"', async () => {
    seedSession();
    meAnswers(NOT_INVITED);

    renderApp('/sem-permissao');

    expect(await screen.findByRole('heading', TITLE)).toBeInTheDocument();
    expect(screen.getByRole('term')).toHaveTextContent('E-mail em uso');
    expect(screen.getByRole('definition')).toHaveTextContent('alex@acme.example');
    expect(screen.getByText(/Só entra quem faz parte da equipe/)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('"Sair" encerra a sessão deste navegador, limpa o cache e leva ao login', async () => {
    seedSession();
    meAnswers(NOT_INVITED);
    const logouts = logoutAnswers(204);
    const app = renderApp('/sem-permissao');
    await screen.findByRole('heading', TITLE);

    await app.user.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(app.path()).toBe('/login'));
    expect(storedSession()).toBeNull();
    const cached = app.client.getQueryCache().getAll();
    expect(cached.filter((query) => query.state.data !== undefined)).toEqual([]);
    expect(logouts).toEqual(['local']);
  });
});
