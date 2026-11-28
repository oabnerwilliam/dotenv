import { screen, waitFor, within } from '@testing-library/react';
import type { Project } from '@env/shared';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ATLAS, HYDRA, PROJECTS_URL, projectsBackend, VEGA } from '../../../test/projects';
import { ME_URL, MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { server } from '../../../test/server';
import { seedSession } from '../../../test/session';

const ARCHIVE_URL = `${PROJECTS_URL}/atlas/archive`;
const LAST_WARNING =
  'Este é o último projeto da equipe. Depois de arquivar, será preciso criar outro.';

async function openSettings(projects: Project[] = [ATLAS, HYDRA, VEGA]) {
  seedSession();
  meAnswers(MEMBER);
  const backend = projectsBackend(projects);
  const app = renderApp('/p/atlas/configuracoes');
  await screen.findByRole('heading', { level: 1, name: 'Configurações' });
  return { ...app, backend };
}

type App = Awaited<ReturnType<typeof openSettings>>;

const trigger = () => screen.getByRole('button', { name: 'Arquivar' });

async function openModal(app: App) {
  await app.user.click(trigger());
  const dialog = await screen.findByRole('dialog', { name: 'Arquivar projeto' });
  const modal = within(dialog);
  return {
    dialog,
    confirm: modal.getByRole('button', { name: 'Arquivar projeto' }),
    cancel: modal.getByRole('button', { name: 'Cancelar' }),
    status: modal.getByRole('status'),
    banner: () => modal.queryByRole('alert'),
  };
}

describe('ProjectArchiveModal', () => {
  it('explica o que acontece e só avisa do último projeto quando é o caso', async () => {
    const app = await openSettings();

    const { dialog } = await openModal(app);

    expect(dialog).toHaveTextContent('Arquivar o projeto Atlas?');
    expect(
      within(dialog)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'Ele some das listas de toda a equipe.',
      'Não dá para desfazer pelo app.',
      'O endereço atlas continua reservado e não pode ser usado em outro projeto.',
    ]);
    expect(dialog).not.toHaveTextContent(LAST_WARNING);
  });

  it('no último projeto, mostra o aviso', async () => {
    const app = await openSettings([ATLAS]);

    const { dialog } = await openModal(app);

    expect(dialog).toHaveTextContent(LAST_WARNING);
  });

  it('só arquiva depois de confirmar', async () => {
    const app = await openSettings();
    const { confirm } = await openModal(app);
    expect(app.backend.writes).toEqual([]);

    await app.user.click(confirm);

    await waitFor(() => expect(app.path()).toBe('/p/hydra'));
    expect(app.backend.writes).toEqual([
      { method: 'POST', path: '/projects/atlas/archive', body: null },
    ]);
  });

  it.each(['Escape', 'Cancelar', 'Fechar'])('%s não envia e devolve o foco', async (way) => {
    const app = await openSettings();
    const { dialog } = await openModal(app);

    if (way === 'Escape') await app.user.keyboard('{Escape}');
    else await app.user.click(within(dialog).getByRole('button', { name: way }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect(app.backend.writes).toEqual([]);
    expect(app.path()).toBe('/p/atlas/configuracoes');
  });

  it('vai para outro projeto, o arquivado some do menu e do seletor e o foco vai ao título', async () => {
    const app = await openSettings();
    const { confirm } = await openModal(app);

    await app.user.click(confirm);

    const title = await screen.findByRole('heading', { level: 1, name: 'Board' });
    expect(app.path()).toBe('/p/hydra');
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const menu = within(screen.getByRole('navigation', { name: 'Projetos' }));
    expect(menu.queryByText('Atlas')).not.toBeInTheDocument();

    const select = screen.getByRole('combobox', { name: 'Projeto' });
    select.focus();
    await app.user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'hydra',
      'vega',
    ]);
  });

  it('arquivar o último mostra "nenhum projeto", sem voltar ao arquivado', async () => {
    const app = await openSettings([ATLAS]);
    const { confirm } = await openModal(app);
    // O `/me` ainda cita o arquivado, e demora a responder.
    server.use(http.get(ME_URL, () => new Promise<Response>(() => {})));

    await app.user.click(confirm);

    const title = await screen.findByRole('heading', { level: 1, name: 'Nenhum projeto ainda' });
    expect(app.path()).toBe('/');
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Projeto' })).toHaveTextContent('nenhum');
  });

  it('falha mantém o modal aberto com a faixa', async () => {
    const app = await openSettings();
    server.use(
      http.post(ARCHIVE_URL, () =>
        HttpResponse.json({ code: 'INTERNAL', message: 'Erro interno.' }, { status: 500 }),
      ),
    );
    const { confirm, banner } = await openModal(app);

    await app.user.click(confirm);

    await waitFor(() => expect(banner()).toBeInTheDocument());
    expect(banner()).toHaveTextContent('Não foi possível arquivar o projeto');
    expect(banner()).toHaveTextContent('Erro interno.');
    expect(confirm).toBeEnabled();
    expect(app.path()).toBe('/p/atlas/configuracoes');
  });

  it('sem resposta, a faixa pede para conferir a conexão; reabrir começa sem ela', async () => {
    const app = await openSettings();
    server.use(http.post(ARCHIVE_URL, () => HttpResponse.error()));
    const { confirm, cancel, banner } = await openModal(app);
    await app.user.click(confirm);
    await waitFor(() => expect(banner()).toBeInTheDocument());
    expect(banner()).toHaveTextContent('Confira sua conexão e tente de novo.');

    await app.user.click(cancel);

    expect((await openModal(app)).banner()).not.toBeInTheDocument();
  });

  it('durante o envio só o botão principal desativa e a situação é anunciada', async () => {
    const app = await openSettings();
    server.use(http.post(ARCHIVE_URL, () => new Promise<Response>(() => {})));
    const { confirm, cancel, status } = await openModal(app);

    await app.user.click(confirm);

    await waitFor(() => expect(status).toHaveTextContent('Arquivando o projeto…'));
    expect(confirm).toBeDisabled();
    expect(cancel).toBeEnabled();
  });

  it('fechar não cancela o pedido enviado: a tela do arquivado é deixada', async () => {
    const app = await openSettings();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(ARCHIVE_URL, async () => {
        await gate;
        app.backend.set([HYDRA, VEGA]);
        return HttpResponse.json(ATLAS);
      }),
    );
    const { confirm, cancel } = await openModal(app);
    await app.user.click(confirm);
    await app.user.click(cancel);

    release();

    await waitFor(() => expect(app.path()).toBe('/p/hydra'));
  });

  it('quem saiu da tela durante o envio não é levado de volta', async () => {
    const app = await openSettings();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    server.use(
      http.post(ARCHIVE_URL, async () => {
        await gate;
        app.backend.set([HYDRA, VEGA]);
        return HttpResponse.json(ATLAS);
      }),
    );
    const { confirm, cancel } = await openModal(app);
    await app.user.click(confirm);
    await app.user.click(cancel);
    await app.user.click(screen.getByRole('link', { name: 'Vega' }));

    release();

    const menu = within(screen.getByRole('navigation', { name: 'Projetos' }));
    await waitFor(() => expect(menu.queryByText('Atlas')).not.toBeInTheDocument());
    expect(app.path()).toBe('/p/vega');
  });

  it('404 (outra pessoa arquivou) atualiza a lista e mostra "Projeto não encontrado"', async () => {
    const app = await openSettings();
    const { confirm } = await openModal(app);
    app.backend.set([HYDRA, VEGA]);

    await app.user.click(confirm);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Projeto não encontrado' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
