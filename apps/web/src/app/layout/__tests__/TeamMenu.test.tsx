import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ATLAS, HYDRA, projectsAnswers } from '../../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { logoutAnswers, seedSession, storedSession } from '../../../test/session';

async function openAsMember(path = '/p/atlas', title = 'Board', me: object = MEMBER) {
  seedSession();
  meAnswers(me);
  const app = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: title });
  return app;
}

type App = Awaited<ReturnType<typeof openAsMember>>;

const avatar = () => screen.getByRole('button', { name: 'Equipe Acme' });

async function openMenu(app: App) {
  await app.user.click(avatar());
  return screen.findByRole('menu', { name: 'Equipe' });
}

const item = (name: string | RegExp) => screen.getByRole('menuitem', { name });

describe('TeamMenu', () => {
  it('mostra equipe, Membros, Configurações, nome, e-mail e Sair', async () => {
    const app = await openAsMember();
    expect(avatar()).toHaveAttribute('aria-haspopup', 'menu');
    expect(avatar()).toHaveAttribute('aria-expanded', 'false');
    expect(within(avatar()).getByText('Ac')).toHaveAttribute('aria-hidden', 'true');

    const menu = await openMenu(app);

    // Com o menu aberto o resto da página sai da árvore acessível.
    expect(screen.getByRole('button', { name: 'Equipe Acme', hidden: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(menu).getByText('Acme')).toBeInTheDocument();
    expect(within(menu).getByText('acme')).toHaveClass('font-mono');
    expect(within(menu).getByText('Alex Souza')).toBeInTheDocument();
    expect(within(menu).getByText('alex@acme.example')).toBeInTheDocument();
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((node) => node.textContent),
    ).toEqual(['Membros', 'Configurações', 'Sair']);
    // Fora da fase 1.
    expect(menu).not.toHaveTextContent(/Conexões|Trocar|Criar nova|Buscar/);
    expect(screen.queryByRole('searchbox', { hidden: true })).not.toBeInTheDocument();
  });

  it('Esc fecha, e o foco volta ao avatar', async () => {
    const app = await openAsMember();
    await openMenu(app);

    await app.user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(avatar()).toHaveFocus());
  });

  it('clique fora fecha, e o foco volta ao avatar', async () => {
    const app = await openAsMember();
    await openMenu(app);

    // Com o menu aberto o Radix desliga os cliques no resto da página (`pointer-events`), e é
    // no `body` que o clique de fora chega.
    await app.user.click(document.documentElement);

    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(avatar()).toHaveFocus());
  });

  it('Membros leva a /equipe/membros, que mostra o marcador dentro da casca', async () => {
    const app = await openAsMember();
    await openMenu(app);
    expect(item('Membros')).toHaveAttribute('href', '/equipe/membros');

    await app.user.click(item('Membros'));

    expect(await screen.findByRole('heading', { level: 1, name: 'Membros' })).toBeInTheDocument();
    expect(app.path()).toBe('/equipe/membros');
    expect(screen.getByText('~/equipe/membros')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Em breve' })).toBeInTheDocument();
    expect(
      screen.getByText('A gestão de membros e convites da equipe chega em breve.'),
    ).toBeInTheDocument();
    // Dentro da casca, sem projeto atual.
    const sidebar = screen.getByRole('complementary', { name: 'Menu lateral' });
    expect(within(sidebar).getByRole('link', { name: 'Atlas' })).toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: 'Board' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    await waitFor(() => expect(avatar()).toHaveFocus());
  });

  it('pelo teclado, Enter no item escolhe', async () => {
    const app = await openAsMember();
    avatar().focus();
    await app.user.keyboard('{Enter}');
    await screen.findByRole('menu');
    await waitFor(() => expect(item('Membros')).toHaveFocus());

    await app.user.keyboard('{Enter}');

    await waitFor(() => expect(app.path()).toBe('/equipe/membros'));
  });

  it('Configurações leva às do projeto atual', async () => {
    projectsAnswers([ATLAS, HYDRA]);
    const app = await openAsMember('/p/hydra');
    await openMenu(app);

    await app.user.click(item('Configurações'));

    await waitFor(() => expect(app.path()).toBe('/p/hydra/configuracoes'));
  });

  it('fora de um projeto, Configurações leva às do padrão', async () => {
    projectsAnswers([ATLAS, HYDRA]);
    const app = await openAsMember('/equipe/membros', 'Membros', {
      ...MEMBER,
      defaultProjectSlug: 'hydra',
    });
    await openMenu(app);

    await app.user.click(item('Configurações'));

    await waitFor(() => expect(app.path()).toBe('/p/hydra/configuracoes'));
  });

  it('sem projeto, Configurações fica indisponível, com a dica', async () => {
    projectsAnswers([]);
    const app = await openAsMember('/', 'Nenhum projeto ainda');
    await openMenu(app);

    const settings = item(/Configurações/);
    expect(settings).toHaveAttribute('aria-disabled', 'true');
    expect(settings).toHaveTextContent('sem projeto');
    expect(settings).not.toHaveAttribute('href');
  });

  it('Sair encerra a sessão e leva ao login', async () => {
    const logouts = logoutAnswers(204);
    const app = await openAsMember();
    await openMenu(app);

    await app.user.click(item('Sair'));

    expect(await screen.findByRole('button', { name: 'Continuar com Google' })).toBeInTheDocument();
    expect(app.path()).toBe('/login');
    expect(storedSession()).toBeNull();
    expect(logouts).toEqual(['local']);
  });

  it('mesmo com o servidor de login falhando, a pessoa sai', async () => {
    logoutAnswers(500);
    const app = await openAsMember();
    await openMenu(app);

    await app.user.click(item('Sair'));

    await waitFor(() => expect(app.path()).toBe('/login'));
  });
});
