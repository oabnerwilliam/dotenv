import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ATLAS, HYDRA, projectsAnswers } from '../../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { seedSession } from '../../../test/session';

async function openAsMember(path: string, title: string) {
  seedSession();
  meAnswers(MEMBER);
  const app = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: title });
  return app;
}

const select = () => screen.getByRole('combobox', { name: 'Projeto' });

describe('ProjectSelect', () => {
  it('mostra o slug atual e navega ao escolher outro', async () => {
    projectsAnswers([ATLAS, HYDRA]);
    const app = await openAsMember('/p/atlas/historico', 'Histórico');

    expect(select()).toHaveTextContent('~/projetos/atlas');
    // O prefixo é enfeite: o nome do controle é só "Projeto".
    expect(screen.getByText('~/projetos/')).toHaveAttribute('aria-hidden', 'true');

    select().focus();
    await app.user.keyboard('{Enter}');
    const option = await screen.findByRole('option', { name: 'atlas' });
    await waitFor(() => expect(option).toHaveFocus());
    await app.user.keyboard('{ArrowDown}');
    await waitFor(() => expect(screen.getByRole('option', { name: 'hydra' })).toHaveFocus());
    await app.user.keyboard('{Enter}');

    await waitFor(() => expect(app.path()).toBe('/p/hydra'));
    expect(select()).toHaveTextContent('~/projetos/hydra');
  });

  it('fora de um projeto mostra "escolher"', async () => {
    const app = await openAsMember('/equipe/membros', 'Membros');

    expect(select()).toBeEnabled();
    expect(select()).toHaveTextContent('escolher');

    select().focus();
    await app.user.keyboard('{Enter}');
    await app.user.click(await screen.findByRole('option', { name: 'atlas' }));
    await waitFor(() => expect(app.path()).toBe('/p/atlas'));
  });

  it('sem projeto fica desativado, com "nenhum"', async () => {
    projectsAnswers([]);
    await openAsMember('/', 'Nenhum projeto ainda');

    expect(select()).toBeDisabled();
    expect(select()).toHaveTextContent('nenhum');
  });
});
