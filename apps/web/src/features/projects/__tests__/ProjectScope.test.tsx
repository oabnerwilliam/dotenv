import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../../../lib/queryKeys';
import { ATLAS, HYDRA, projectsAnswers, projectsHeld } from '../../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { seedSession } from '../../../test/session';

function openAsMember(path: string) {
  seedSession();
  meAnswers(MEMBER);
  return renderApp(path);
}

const heading = (name: string) => screen.findByRole('heading', { level: 1, name });
const FAILURE = { code: 'INTERNAL', message: 'Erro interno.' };

describe('rotas de projeto', () => {
  it.each([
    ['/p/atlas', 'Board', '~/projetos/atlas', 'env status --project=atlas'],
    ['/p/atlas/historico', 'Histórico', '~/projetos/atlas/historico', 'env log --project=atlas'],
    ['/p/atlas/configuracoes', 'Configurações', '~/projetos/atlas/configuracoes', null],
  ])('%s mostra o título da seção do projeto', async (path, title, breadcrumb, command) => {
    openAsMember(path);

    expect(await heading(title)).toBeInTheDocument();
    expect(screen.getByText(breadcrumb)).toBeInTheDocument();
    if (command) expect(screen.getByText(command)).toBeInTheDocument();
  });

  it('o board e o histórico avisam que ainda estão em construção', async () => {
    const app = openAsMember('/p/atlas');

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Board em construção' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent(
      'Os ambientes do projeto Atlas vão aparecer aqui.',
    );

    await act(() => app.router.navigate('/p/atlas/historico'));
    expect(
      screen.getByRole('heading', { level: 2, name: 'Histórico em construção' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveTextContent(
      'Os eventos do projeto Atlas vão aparecer aqui.',
    );
  });

  it.each(['/p/draco', '/p/draco/historico', '/p/draco/configuracoes'])(
    'slug desconhecido em %s mostra "Projeto não encontrado" com volta',
    async (path) => {
      const app = openAsMember(path);

      expect(await heading('Projeto não encontrado')).toBeInTheDocument();
      expect(screen.getByText('env status --project=draco')).toBeInTheDocument();
      expect(
        screen.getByText('O endereço pode estar errado, ou o projeto foi arquivado.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: 'Projeto' })).toHaveTextContent('escolher');

      const back = screen.getByRole('link', { name: 'Voltar ao início' });
      expect(back).toHaveAttribute('href', '/p/atlas');
      await app.user.click(back);
      expect(await heading('Board')).toBeInTheDocument();
    },
  );

  it.each([
    ['o padrão, se estiver na lista', [ATLAS, HYDRA], 'hydra', '/p/hydra'],
    ['o primeiro, se o padrão não estiver nela', [ATLAS, HYDRA], 'sumiu', '/p/atlas'],
    ['o início, sem projeto', [], null, '/'],
  ])('a volta leva a: %s', async (_case, projects, defaultProjectSlug, href) => {
    seedSession();
    meAnswers({ ...MEMBER, defaultProjectSlug });
    projectsAnswers(projects);

    renderApp('/p/draco');

    expect(await screen.findByRole('link', { name: 'Voltar ao início' })).toHaveAttribute(
      'href',
      href,
    );
  });

  it('carregando a lista tem role="status" e um título para o leitor de tela', async () => {
    const release = projectsHeld([ATLAS]);
    openAsMember('/p/atlas');

    const title = await heading('Projeto');
    expect(title).toHaveClass('sr-only');
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Carregando projetos');
    expect(screen.getByRole('combobox', { name: 'Projeto' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Projeto' })).toHaveTextContent('carregando…');

    release();
    expect(await heading('Board')).toBeInTheDocument();
  });

  it('falha ao listar mostra "Tentar de novo", que refaz a consulta', async () => {
    const failed = projectsAnswers(FAILURE, 500);
    const app = openAsMember('/p/atlas');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar os projetos');
    expect(alert).toHaveTextContent('Confira sua conexão e tente de novo.');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Falha ao carregar os projetos' }),
    ).toHaveClass('sr-only');
    expect(screen.getByRole('combobox', { name: 'Projeto' })).toHaveTextContent('indisponível');
    expect(failed.count).toBe(4);

    const release = projectsHeld([ATLAS]);
    const retry = screen.getByRole('button', { name: 'Tentar de novo' });
    await app.user.click(retry);
    await waitFor(() => expect(retry).toBeDisabled());

    release();
    expect(await heading('Board')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('falha ao atualizar mantém a tela e mostra a faixa', async () => {
    const app = openAsMember('/p/atlas');
    await heading('Board');

    projectsAnswers(FAILURE, 500);
    await act(() => app.client.refetchQueries({ queryKey: queryKeys.projects('user-alex') }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível atualizar os projetos');
    expect(alert).toHaveTextContent(
      'Mostrando os últimos dados carregados. Confira sua conexão e tente de novo.',
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Projeto' })).toHaveTextContent('atlas');

    projectsAnswers([ATLAS]);
    await app.user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('slug desconhecido durante uma atualização mostra carregando, não "não encontrado"', async () => {
    const app = openAsMember('/p/atlas');
    await heading('Board');

    const release = projectsHeld([ATLAS, HYDRA]);
    act(() => {
      void app.client.refetchQueries({ queryKey: queryKeys.projects('user-alex') });
    });
    await act(() => app.router.navigate('/p/hydra'));

    expect(await heading('Projeto')).toBeInTheDocument();
    expect(screen.queryByText('Projeto não encontrado')).not.toBeInTheDocument();

    release();
    expect(await heading('Board')).toBeInTheDocument();
    expect(screen.getByText('~/projetos/hydra')).toBeInTheDocument();
  });
});
