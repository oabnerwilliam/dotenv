import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { seedSession } from '../../../test/session';

describe('AppShell', () => {
  it('ordem do Tab: botão do menu, logo, seletor, avatar, menu lateral, conteúdo', async () => {
    seedSession();
    meAnswers(MEMBER);
    // No "não encontrado" o conteúdo tem um link: dá para ver o Tab chegar a ele.
    const app = renderApp('/p/draco');
    await screen.findByRole('heading', { level: 1, name: 'Projeto não encontrado' });

    const order = [
      screen.getByRole('button', { name: 'Alternar menu lateral' }),
      screen.getByRole('link', { name: '.env, início' }),
      screen.getByRole('combobox', { name: 'Projeto' }),
      screen.getByRole('button', { name: 'Equipe Acme' }),
      screen.getByRole('link', { name: 'Atlas' }),
      screen.getByRole('button', { name: 'Novo projeto' }),
      screen.getByRole('button', { name: 'Recolher menu lateral' }),
      screen.getByRole('link', { name: 'Voltar ao início' }),
    ];
    for (const element of order) {
      await app.user.tab();
      expect(element).toHaveFocus();
    }
  });

  it('o logo leva ao início e não há busca', async () => {
    seedSession();
    meAnswers(MEMBER);
    const app = renderApp('/p/atlas/historico');
    await screen.findByRole('heading', { level: 1, name: 'Histórico' });

    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Buscar/ })).not.toBeInTheDocument();
    await app.user.click(screen.getByRole('link', { name: '.env, início' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(app.path()).toBe('/p/atlas');
  });
});
