import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ATLAS, HYDRA, projectsAnswers } from '../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../test/renderApp';
import { seedSession } from '../../test/session';

function openHome(defaultProjectSlug: string | null) {
  seedSession();
  meAnswers({ ...MEMBER, defaultProjectSlug });
  return renderApp('/');
}

describe('HomePage', () => {
  it('vai ao projeto padrão', async () => {
    projectsAnswers([ATLAS, HYDRA]);

    const app = openHome('hydra');

    await waitFor(() => expect(app.path()).toBe('/p/hydra'));
  });

  it.each(['arquivado', null])('padrão fora da lista (%s) vai ao primeiro', async (slug) => {
    projectsAnswers([HYDRA, ATLAS]);

    const app = openHome(slug);

    await waitFor(() => expect(app.path()).toBe('/p/hydra'));
  });

  it('sem projeto mostra a casca com "nenhum projeto", mesmo que o /me ainda cite um', async () => {
    projectsAnswers([]);

    const app = openHome('atlas');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nenhum projeto ainda' }),
    ).toBeInTheDocument();
    expect(app.path()).toBe('/');
    expect(screen.getByText('env project list')).toBeInTheDocument();
    expect(
      screen.getByText('Crie um projeto para organizar os ambientes de homologação da equipe.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar projeto' })).toBeEnabled();
    expect(screen.getByRole('complementary', { name: 'Menu lateral' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Equipe Acme' })).toBeInTheDocument();
  });
});
