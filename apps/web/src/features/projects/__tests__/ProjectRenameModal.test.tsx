import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ATLAS, HYDRA, PROJECTS_URL, projectsBackend } from '../../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { server } from '../../../test/server';
import { seedSession } from '../../../test/session';

async function openSettings() {
  seedSession();
  meAnswers(MEMBER);
  const backend = projectsBackend([ATLAS, HYDRA]);
  const app = renderApp('/p/atlas/configuracoes');
  await screen.findByRole('heading', { level: 1, name: 'Configurações' });
  return { ...app, backend };
}

type App = Awaited<ReturnType<typeof openSettings>>;

const panel = () => screen.getByRole('region', { name: 'Projeto' });
const trigger = () => screen.getByRole('button', { name: 'Renomear' });

async function openModal(app: App) {
  await app.user.click(trigger());
  const dialog = await screen.findByRole('dialog', { name: 'Renomear projeto' });
  const modal = within(dialog);
  return {
    dialog,
    name: modal.getByRole('textbox', { name: 'Nome do projeto' }),
    submit: modal.getByRole('button', { name: 'Salvar' }),
    cancel: modal.getByRole('button', { name: 'Cancelar' }),
    status: modal.getByRole('status'),
    banner: () => modal.queryByRole('alert'),
  };
}

describe('ProjectPanel', () => {
  it('mostra o nome e o endereço, só para leitura, com as duas ações', async () => {
    await openSettings();

    expect(within(panel()).getByRole('heading', { level: 2, name: 'Projeto' })).toBeInTheDocument();
    expect(
      within(panel())
        .getAllByRole('term')
        .map((term) => term.textContent),
    ).toEqual(['Nome', 'Endereço']);
    const [name, address] = within(panel()).getAllByRole('definition');
    expect(name).toHaveTextContent('Atlas');
    expect(address).toHaveTextContent('atlas');
    expect(address).toHaveClass('font-mono');
    expect(within(panel()).queryByRole('textbox')).not.toBeInTheDocument();
    expect(trigger()).toHaveClass('h-11');
    expect(screen.getByRole('button', { name: 'Arquivar' })).toHaveClass('h-11');
    expect(screen.getByText('Ambientes, serviços e regras chegam em breve.')).toBeInTheDocument();
  });
});

describe('ProjectRenameModal', () => {
  it('abre com o nome preenchido e focado, dizendo que o endereço não muda', async () => {
    const app = await openSettings();

    const { name, status } = await openModal(app);

    expect(name).toHaveValue('Atlas');
    expect(name).toHaveFocus();
    expect(name).toHaveAccessibleDescription('O endereço atlas não muda.');
    expect(status).toBeEmptyDOMElement();
  });

  it('salvar atualiza o nome no menu sem mudar o endereço', async () => {
    const app = await openSettings();
    const { name } = await openModal(app);

    await app.user.clear(name);
    await app.user.type(name, 'Atlas Web{Enter}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(app.backend.writes).toEqual([
      { method: 'PATCH', path: '/projects/atlas', body: { name: 'Atlas Web' } },
    ]);
    const menu = within(screen.getByRole('navigation', { name: 'Projetos' }));
    expect(menu.getByTitle('Atlas Web')).toBeInTheDocument();
    expect(within(panel()).getAllByRole('definition')[0]).toHaveTextContent('Atlas Web');
    expect(app.path()).toBe('/p/atlas/configuracoes');
    await waitFor(() => expect(trigger()).toHaveFocus());

    const again = await openModal(app);
    expect(again.name).toHaveValue('Atlas Web');
  });

  it.each(['Escape', 'Cancelar', 'Fechar'])('%s não envia, e reabre limpo', async (way) => {
    const app = await openSettings();
    const first = await openModal(app);
    await app.user.type(first.name, ' rascunho');

    if (way === 'Escape') await app.user.keyboard('{Escape}');
    else await app.user.click(within(first.dialog).getByRole('button', { name: way }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger()).toHaveFocus());
    expect((await openModal(app)).name).toHaveValue('Atlas');
    expect(app.backend.writes).toEqual([]);
  });

  it('nome vazio aparece no campo, sem enviar', async () => {
    const app = await openSettings();
    const { name, submit } = await openModal(app);

    await app.user.clear(name);
    await app.user.click(submit);

    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    expect(name).toHaveAccessibleDescription(expect.stringContaining('Informe o nome do projeto.'));
    expect(app.backend.writes).toEqual([]);
  });

  it('erro de campo vindo da API vai para o campo', async () => {
    const app = await openSettings();
    server.use(
      http.patch(`${PROJECTS_URL}/atlas`, () =>
        HttpResponse.json(
          { code: 'VALIDATION', message: 'Dados inválidos.', fields: { name: 'Nome recusado.' } },
          { status: 400 },
        ),
      ),
    );
    const { name, submit, banner } = await openModal(app);

    await app.user.click(submit);

    await waitFor(() =>
      expect(name).toHaveAccessibleDescription(expect.stringContaining('Nome recusado.')),
    );
    expect(name).toHaveFocus();
    expect(banner()).not.toBeInTheDocument();
  });

  it('falha mantém o modal aberto com a faixa e o digitado', async () => {
    const app = await openSettings();
    server.use(http.patch(`${PROJECTS_URL}/atlas`, () => HttpResponse.error()));
    const { name, submit, banner } = await openModal(app);
    await app.user.type(name, ' Web');

    await app.user.click(submit);

    await waitFor(() => expect(banner()).toBeInTheDocument());
    expect(banner()).toHaveTextContent('Não foi possível renomear o projeto');
    expect(banner()).toHaveTextContent('Confira sua conexão e tente de novo.');
    expect(name).toHaveValue('Atlas Web');
    expect(submit).toBeEnabled();
  });

  it('durante o envio só "Salvar" desativa e a situação é anunciada', async () => {
    const app = await openSettings();
    server.use(http.patch(`${PROJECTS_URL}/atlas`, () => new Promise<Response>(() => {})));
    const { submit, cancel, status } = await openModal(app);

    await app.user.click(submit);

    await waitFor(() => expect(status).toHaveTextContent('Salvando o nome…'));
    expect(submit).toBeDisabled();
    expect(cancel).toBeEnabled();
  });

  it('404 (outra pessoa arquivou) atualiza a lista e mostra "Projeto não encontrado"', async () => {
    const app = await openSettings();
    const { submit } = await openModal(app);
    app.backend.set([HYDRA]);

    await app.user.click(submit);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Projeto não encontrado' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
