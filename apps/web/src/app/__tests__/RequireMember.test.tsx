import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { queryKeys } from '../../lib/queryKeys';
import { projectsAnswers } from '../../test/projects';
import {
  ME_URL,
  MEMBER,
  meAnswers,
  NEEDS_TEAM,
  NOT_INVITED,
  renderApp,
} from '../../test/renderApp';
import { server } from '../../test/server';
import { logoutAnswers, seedSession, storedSession } from '../../test/session';

const LOGIN_BUTTON = { name: 'Continuar com Google' };

describe('rotas protegidas', () => {
  it.each(['/', '/p/atlas?x=1', '/onboarding/equipe', '/sem-permissao'])(
    'sem sessão, %s leva ao login e guarda o destino',
    async (destination) => {
      const app = renderApp(destination);

      expect(await screen.findByRole('button', LOGIN_BUTTON)).toBeInTheDocument();
      expect(app.path()).toBe('/login');
      expect(sessionStorage.getItem('env.destino')).toBe(destination);
    },
  );

  it('enquanto carrega, mostra o esqueleto anunciado ao leitor de tela', async () => {
    seedSession();
    meAnswers(MEMBER);

    renderApp('/p/atlas');

    const loading = screen.getByRole('status');
    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveTextContent('Carregando sua sessão');
    expect(screen.getByRole('heading', { level: 1, name: '.env' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
  });

  it('membro em / vai para o projeto padrão', async () => {
    seedSession();
    meAnswers(MEMBER);

    const app = renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(app.path()).toBe('/p/atlas');
  });

  it('endereço desconhecido cai em / e segue o mesmo caminho', async () => {
    seedSession();
    meAnswers(MEMBER);

    const app = renderApp('/nao-existe');

    await waitFor(() => expect(app.path()).toBe('/p/atlas'));
  });

  it('membro sem projeto ativo fica em /, sem ficar redirecionando', async () => {
    seedSession();
    meAnswers({ ...MEMBER, defaultProjectSlug: null });
    projectsAnswers([]);

    const app = renderApp('/');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Nenhum projeto ainda' }),
    ).toBeInTheDocument();
    expect(app.path()).toBe('/');
  });

  it.each([
    [NEEDS_TEAM, '/', '/onboarding/equipe'],
    [NEEDS_TEAM, '/p/atlas', '/onboarding/equipe'],
    [NEEDS_TEAM, '/sem-permissao', '/onboarding/equipe'],
    [NOT_INVITED, '/', '/sem-permissao'],
    [NOT_INVITED, '/p/atlas', '/sem-permissao'],
    [NOT_INVITED, '/onboarding/equipe', '/sem-permissao'],
    [MEMBER, '/onboarding/equipe', '/p/atlas'],
    [MEMBER, '/sem-permissao', '/p/atlas'],
  ])('quem está em $state e abre %2$s é levado ao lugar certo', async (me, from, to) => {
    seedSession();
    meAnswers(me);

    const app = renderApp(from);

    await waitFor(() => expect(app.path()).toBe(to));
  });

  it('falha ao consultar /me mostra "Tentar de novo", que refaz a consulta', async () => {
    seedSession();
    const failed = meAnswers({ code: 'INTERNAL', message: 'Erro interno.' }, 500);
    const app = renderApp('/p/atlas');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível carregar sua conta');
    expect(alert).toHaveTextContent('Confira sua conexão e tente de novo.');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Falha ao carregar a conta' }),
    ).toBeInTheDocument();
    expect(failed.count).toBe(4);

    // A resposta fica presa até o teste liberar, para ver o botão durante a nova tentativa.
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.get(ME_URL, async () => {
        await gate;
        return HttpResponse.json(MEMBER);
      }),
    );
    const retry = screen.getByRole('button', { name: 'Tentar de novo' });
    await app.user.tab();
    expect(retry).toHaveFocus();
    await app.user.keyboard('{Enter}');

    await waitFor(() => expect(retry).toBeDisabled());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    release();
    expect(await screen.findByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(app.path()).toBe('/p/atlas');
  });

  it('na falha ao consultar /me, "Sair" encerra a sessão e leva ao login', async () => {
    seedSession();
    meAnswers({ code: 'INTERNAL', message: 'Erro interno.' }, 500);
    const logouts = logoutAnswers(204);
    const app = renderApp('/p/atlas');
    await screen.findByRole('alert');

    // Depois de "Tentar de novo", na ordem do Tab.
    await app.user.tab();
    await app.user.tab();
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveFocus();
    // 44px de altura, como o outro botão da faixa.
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveClass('h-11');
    await app.user.keyboard('{Enter}');

    expect(await screen.findByRole('button', LOGIN_BUTTON)).toBeInTheDocument();
    expect(app.path()).toBe('/login');
    expect(storedSession()).toBeNull();
    expect(logouts).toEqual(['local']);
  });

  it('falha numa atualização em segundo plano mantém a tela com os últimos dados', async () => {
    seedSession();
    meAnswers(MEMBER);
    const app = renderApp('/p/atlas');
    await screen.findByRole('heading', { level: 1, name: 'Board' });

    meAnswers({ code: 'INTERNAL', message: 'Erro interno.' }, 500);
    await act(() => app.client.refetchQueries({ queryKey: queryKeys.me('user-alex') }));

    expect(screen.getByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sessão que expira leva ao login', async () => {
    seedSession();
    meAnswers(MEMBER);
    const app = renderApp('/p/atlas');
    await screen.findByRole('heading', { level: 1, name: 'Board' });

    logoutAnswers(204);
    meAnswers({ code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente.' }, 401);
    await act(() => app.client.refetchQueries({ queryKey: queryKeys.me('user-alex') }));

    expect(await screen.findByRole('button', LOGIN_BUTTON)).toBeInTheDocument();
    expect(app.path()).toBe('/login');
    expect(storedSession()).toBeNull();
    expect(sessionStorage.getItem('env.destino')).toBe('/p/atlas');
  });

  it('401 já na primeira consulta leva ao login', async () => {
    seedSession();
    logoutAnswers(204);
    meAnswers({ code: 'UNAUTHENTICATED', message: 'Sua sessão expirou. Entre novamente.' }, 401);

    const app = renderApp('/p/atlas');

    expect(await screen.findByRole('button', LOGIN_BUTTON)).toBeInTheDocument();
    expect(app.path()).toBe('/login');
  });

  it('/status continua pública', async () => {
    server.use(
      http.get('http://localhost:3333/health', () =>
        HttpResponse.json({ status: 'ok', database: 'up' }),
      ),
    );

    const app = renderApp('/status');

    expect(await screen.findByText('API no ar')).toBeInTheDocument();
    expect(app.path()).toBe('/status');
  });
});
