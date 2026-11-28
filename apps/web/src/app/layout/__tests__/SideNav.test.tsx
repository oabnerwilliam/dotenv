import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setNarrow } from '../../../test/matchMedia';
import { ATLAS, HYDRA, projectsAnswers, projectsHeld, VEGA } from '../../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { seedSession } from '../../../test/session';

async function openAsMember(path = '/p/atlas', title = 'Board') {
  seedSession();
  meAnswers(MEMBER);
  const app = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: title });
  return app;
}

const sidebar = () => screen.getByRole('complementary', { name: 'Menu lateral' });
const projectsNav = () => within(sidebar()).getByRole('navigation', { name: 'Projetos' });
const toggle = () => screen.getByRole('button', { name: 'Alternar menu lateral' });
const current = (link: HTMLElement) => link.getAttribute('aria-current');

describe('SideNav', () => {
  it('lista os projetos e marca a seção atual com aria-current', async () => {
    projectsAnswers([ATLAS, HYDRA, VEGA]);
    const app = await openAsMember('/p/atlas/historico', 'Histórico');
    const nav = within(projectsNav());

    // O atual não é link: embaixo dele ficam as seções.
    expect(nav.queryByRole('link', { name: 'Atlas' })).not.toBeInTheDocument();
    expect(nav.getByTitle('Atlas')).toHaveTextContent('Atlas');
    expect(nav.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Board',
      'Histórico',
      'Configurações',
      'Hydra',
      'Vega',
    ]);
    expect(current(nav.getByRole('link', { name: 'Histórico' }))).toBe('page');
    expect(current(nav.getByRole('link', { name: 'Board' }))).toBeNull();

    await app.user.click(nav.getByRole('link', { name: 'Board' }));
    expect(app.path()).toBe('/p/atlas');
    expect(current(nav.getByRole('link', { name: 'Board' }))).toBe('page');
    expect(current(nav.getByRole('link', { name: 'Histórico' }))).toBeNull();
  });

  it('outro projeto leva ao board dele', async () => {
    projectsAnswers([ATLAS, HYDRA]);
    const app = await openAsMember('/p/atlas/configuracoes', 'Configurações');

    await app.user.click(within(projectsNav()).getByRole('link', { name: 'Hydra' }));

    expect(app.path()).toBe('/p/hydra');
    expect(await screen.findByText('env status --project=hydra')).toBeInTheDocument();
    expect(within(projectsNav()).getByRole('link', { name: 'Atlas' })).toBeInTheDocument();
    expect(within(projectsNav()).getByRole('link', { name: 'Board' })).toHaveAttribute(
      'href',
      '/p/hydra',
    );
  });

  it('mostra a equipe, sem ação, com o nome completo no título', async () => {
    await openAsMember();

    expect(within(sidebar()).getByTitle('Acme')).toHaveTextContent('Acme');
    expect(within(sidebar()).queryByRole('button', { name: /Acme/ })).not.toBeInTheDocument();
  });

  it('recolhido mantém os nomes acessíveis', async () => {
    projectsAnswers([ATLAS, HYDRA]);
    const app = await openAsMember();

    await app.user.click(within(sidebar()).getByRole('button', { name: 'Recolher menu lateral' }));

    const rail = within(sidebar());
    expect(rail.getByRole('img', { name: 'Equipe Acme' })).toHaveAttribute('title', 'Acme');
    const atlas = rail.getByRole('link', { name: 'Atlas' });
    expect(current(atlas)).toBe('true');
    expect(atlas).toHaveAttribute('title', 'Atlas');
    expect(within(atlas).getByText('At')).toHaveAttribute('aria-hidden', 'true');
    expect(current(rail.getByRole('link', { name: 'Hydra' }))).toBeNull();
    expect(rail.getByRole('button', { name: 'Novo projeto' })).toHaveAttribute(
      'title',
      'Novo projeto',
    );

    const sections = within(rail.getByRole('navigation', { name: 'Seções do projeto' }));
    for (const name of ['Board', 'Histórico', 'Configurações']) {
      expect(sections.getByRole('link', { name })).toHaveAttribute('title', name);
    }
    expect(current(sections.getByRole('link', { name: 'Board' }))).toBe('page');

    await app.user.click(rail.getByRole('button', { name: 'Expandir menu lateral' }));
    expect(within(sidebar()).getByText('Recolher')).toBeInTheDocument();
  });

  it('o botão da nav alterna o menu e o aria-expanded', async () => {
    const app = await openAsMember();
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(toggle()).toHaveAttribute('title', 'Menu lateral');

    await app.user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(sidebar()).getByRole('button', { name: 'Expandir menu lateral' }),
    ).toBeInTheDocument();

    await app.user.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it.each([
    ['Enter', '{Enter}'],
    ['Espaço', ' '],
  ])(
    'pelos botões do próprio menu, com %s, o foco segue para o botão que os substitui',
    async (_key, key) => {
      const app = await openAsMember();
      const own = (name: string) => within(sidebar()).getByRole('button', { name });

      own('Recolher menu lateral').focus();
      await app.user.keyboard(key);
      expect(own('Expandir menu lateral')).toHaveFocus();

      await app.user.keyboard(key);
      expect(own('Recolher menu lateral')).toHaveFocus();
    },
  );

  it('em tela estreita, recolher pelo menu o esconde e leva o foco ao botão da nav', async () => {
    setNarrow(true);
    const app = await openAsMember();
    await app.user.click(toggle());

    within(sidebar()).getByRole('button', { name: 'Recolher menu lateral' }).focus();
    await app.user.keyboard('{Enter}');

    expect(toggle()).toHaveFocus();
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it('não move o foco ao carregar, pelo botão da nav nem quando a largura muda', async () => {
    const app = await openAsMember();
    expect(document.body).toHaveFocus();

    act(() => setNarrow(true));
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(document.body).toHaveFocus();
    act(() => setNarrow(false));
    expect(document.body).toHaveFocus();

    await app.user.click(toggle());
    expect(toggle()).toHaveFocus();
    await app.user.keyboard('{Enter}');
    expect(toggle()).toHaveFocus();
  });

  it('em tela estreita começa fechado e navegar não o fecha', async () => {
    setNarrow(true);
    projectsAnswers([ATLAS, HYDRA]);
    const app = await openAsMember();

    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    // Fechado, não é exibido na tela estreita.
    expect(sidebar()).toHaveClass('max-md:hidden');

    await app.user.click(toggle());
    expect(sidebar()).not.toHaveClass('max-md:hidden');
    await app.user.click(within(projectsNav()).getByRole('link', { name: 'Hydra' }));

    expect(app.path()).toBe('/p/hydra');
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
  });

  it('carregando a lista: nav ocupada, texto para o leitor de tela e "Novo projeto" desativado', async () => {
    const release = projectsHeld([ATLAS]);
    await openAsMember('/p/atlas', 'Projeto');

    expect(projectsNav()).toHaveAttribute('aria-busy', 'true');
    expect(within(projectsNav()).getByText('Carregando projetos')).toHaveClass('sr-only');
    expect(within(projectsNav()).getByRole('button', { name: 'Novo projeto' })).toBeDisabled();

    release();
    await screen.findByRole('heading', { level: 1, name: 'Board' });
    expect(projectsNav()).not.toHaveAttribute('aria-busy');
    expect(within(projectsNav()).getByRole('button', { name: 'Novo projeto' })).toBeEnabled();
  });

  it('falha ao listar aparece no menu, com "Novo projeto" desativado', async () => {
    projectsAnswers({ code: 'INTERNAL', message: 'Erro interno.' }, 500);
    await openAsMember('/p/atlas', 'Falha ao carregar os projetos');

    expect(
      within(projectsNav()).getByText('Não foi possível carregar os projetos.'),
    ).toBeInTheDocument();
    expect(within(projectsNav()).getByRole('button', { name: 'Novo projeto' })).toBeDisabled();
  });

  it('sem projeto, diz que não há nenhum e deixa criar', async () => {
    projectsAnswers([]);
    await openAsMember('/', 'Nenhum projeto ainda');

    expect(within(projectsNav()).getByText('Nenhum projeto.')).toBeInTheDocument();
    expect(within(projectsNav()).getByRole('button', { name: 'Novo projeto' })).toBeEnabled();
  });
});
