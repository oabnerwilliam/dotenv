import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MEMBER, meAnswers, renderApp } from '../../test/renderApp';
import { logoutAnswers, seedSession } from '../../test/session';

describe('ProjectPlaceholderPage', () => {
  it('mostra a equipe na caixa original, o projeto do endereço e "Sair"', async () => {
    seedSession();
    meAnswers(MEMBER);
    logoutAnswers(500);

    const app = renderApp('/p/atlas');

    expect(await screen.findByRole('heading', { level: 1, name: 'Acme' })).toBeInTheDocument();
    expect(screen.getByText('env status --project=atlas')).toBeInTheDocument();
    expect(screen.getByText('atlas', { selector: 'span.font-mono' })).toBeInTheDocument();
    expect(screen.getByText(/ainda está em construção/)).toBeInTheDocument();

    // Mesmo com o servidor de login falhando, a pessoa sai.
    await app.user.click(screen.getByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(app.path()).toBe('/login'));
  });
});
