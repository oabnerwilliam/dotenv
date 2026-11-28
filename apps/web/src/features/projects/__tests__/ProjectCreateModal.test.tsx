import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { ATLAS, PROJECTS_URL, projectsBackend, projectsHeld, VEGA } from '../../../test/projects';
import { MEMBER, meAnswers, renderApp } from '../../../test/renderApp';
import { server } from '../../../test/server';
import { seedSession } from '../../../test/session';

async function openBoard() {
  seedSession();
  const me = meAnswers(MEMBER);
  const backend = projectsBackend([ATLAS, VEGA]);
  const app = renderApp('/p/atlas');
  await screen.findByRole('heading', { level: 1, name: 'Board' });
  return { ...app, me, backend };
}

type App = Awaited<ReturnType<typeof openBoard>>;

const trigger = () => screen.getByRole('button', { name: 'Novo projeto' });

async function openModal(app: App) {
  await app.user.click(trigger());
  const dialog = await screen.findByRole('dialog', { name: 'Novo projeto' });
  const modal = within(dialog);
  return {
    dialog,
    name: modal.getByRole('textbox', { name: 'Nome do projeto' }),
    address: modal.getByRole('textbox', { name: 'Endereço' }),
    submit: modal.getByRole('button', { name: 'Criar projeto' }),
    cancel: modal.getByRole('button', { name: 'Cancelar' }),
    status: modal.getByRole('status'),
    banner: () => modal.queryByRole('alert'),
  };
}

/** Responde o `POST /projects` com o que o teste pedir. */
function createAnswers(respond: () => Response | Promise<Response>) {
  const calls = { count: 0 };
  server.use(
    http.post(PROJECTS_URL, async () => {
      calls.count += 1;
      return respond();
    }),
  );
  return calls;
}

const menuLinks = () => within(screen.getByRole('navigation', { name: 'Projetos', hidden: true }));

describe('ProjectCreateModal', () => {
  it('abre vazio, com o foco no nome e a dica do endereço', async () => {
    const app = await openBoard();

    const { name, address, status } = await openModal(app);

    expect(name).toHaveFocus();
    expect(name).toHaveValue('');
    expect(address).toHaveValue('');
    expect(address).toHaveClass('font-mono');
    expect(address).toHaveAccessibleDescription(
      'Letras minúsculas, números e hífens, de 2 a 40 caracteres. Não dá para mudar depois.',
    );
    expect(status).toBeEmptyDOMElement();
  });

  it('o endereço acompanha o nome até ser editado', async () => {
    const app = await openBoard();
    const { name, address } = await openModal(app);

    await app.user.type(name, 'Estúdio Órion');
    expect(address).toHaveValue('estudio-orion');

    await app.user.clear(address);
    await app.user.type(address, 'orion');
    await app.user.type(name, ' Dois');

    expect(address).toHaveValue('orion');
  });

  it('criar envia nome e slug, fecha e navega ao novo projeto, que aparece no menu', async () => {
    const app = await openBoard();
    const { name, submit } = await openModal(app);
    const meBefore = app.me.count;
    const readsBefore = app.backend.reads.count;

    await app.user.type(name, '  Draco ');
    // O Enter com o botão fora do `<form>` só o navegador de verdade reproduz: está no e2e.
    await app.user.click(submit);

    await waitFor(() => expect(app.path()).toBe('/p/draco'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(app.backend.writes).toEqual([
      { method: 'POST', path: '/projects', body: { name: 'Draco', slug: 'draco' } },
    ]);
    expect(screen.getByText('env status --project=draco')).toBeInTheDocument();
    expect(menuLinks().getByTitle('Draco')).toBeInTheDocument();
    // A lista e o `/me` são consultados de novo.
    await waitFor(() => expect(app.me.count).toBeGreaterThan(meBefore));
    await waitFor(() => expect(app.backend.reads.count).toBeGreaterThan(readsBefore));
  });

  it('usa a resposta do POST sem esperar a lista ser consultada de novo', async () => {
    const app = await openBoard();
    const { name, submit } = await openModal(app);
    await app.user.type(name, 'Draco');
    projectsHeld([]);

    await app.user.click(submit);

    expect(await screen.findByText('env status --project=draco')).toBeInTheDocument();
    expect(
      menuLinks()
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(expect.arrayContaining(['Atlas', 'Vega']));
  });

  it('o estado vazio também cria, e leva ao board do primeiro projeto', async () => {
    seedSession();
    meAnswers({ ...MEMBER, defaultProjectSlug: null });
    projectsBackend([]);
    const app = renderApp('/');

    await app.user.click(await screen.findByRole('button', { name: 'Criar projeto' }));
    const dialog = await screen.findByRole('dialog', { name: 'Novo projeto' });
    await app.user.type(within(dialog).getByLabelText('Nome do projeto'), 'Lyra');
    await app.user.click(within(dialog).getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() => expect(app.path()).toBe('/p/lyra'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Board' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o menu recolhido também abre o modal', async () => {
    const app = await openBoard();
    await app.user.click(screen.getByRole('button', { name: 'Recolher menu lateral' }));

    await openModal(app);
  });

  it('erros do formulário aparecem nos campos, sem enviar', async () => {
    const app = await openBoard();
    const { name, address, submit } = await openModal(app);

    await app.user.click(submit);

    await waitFor(() => expect(name).toHaveAttribute('aria-invalid', 'true'));
    expect(name).toHaveAccessibleDescription('Informe o nome do projeto.');
    expect(name).toHaveFocus();

    await app.user.type(name, 'Draco');
    await app.user.clear(address);
    await app.user.type(address, 'Draco 2');
    await app.user.click(submit);

    await waitFor(() => expect(address).toHaveFocus());
    expect(address).toHaveAccessibleDescription(
      expect.stringContaining('Use só letras minúsculas, números e hífens.'),
    );
    expect(app.backend.writes).toEqual([]);
  });

  it('409 aparece no campo Endereço, sem faixa', async () => {
    const app = await openBoard();
    const message = 'Este endereço já é usado por um projeto, mesmo que arquivado.';
    createAnswers(() =>
      HttpResponse.json({ code: 'CONFLICT', message, fields: { slug: message } }, { status: 409 }),
    );
    const { name, address, submit, banner } = await openModal(app);
    await app.user.type(name, 'Vega');

    await app.user.click(submit);

    await waitFor(() => expect(address).toHaveAttribute('aria-invalid', 'true'));
    expect(address).toHaveAccessibleDescription(expect.stringContaining(message));
    expect(address).toHaveFocus();
    expect(banner()).not.toBeInTheDocument();
    expect(name).toHaveValue('Vega');
    expect(submit).toBeEnabled();
  });

  it.each([
    [
      'da API',
      () => HttpResponse.json({ code: 'INTERNAL', message: 'Erro interno.' }, { status: 500 }),
      'Erro interno.',
    ],
    ['sem resposta', () => HttpResponse.error(), 'Confira sua conexão e tente de novo.'],
  ])('falha %s sem campo vira faixa e mantém o digitado', async (_case, respond, detail) => {
    const app = await openBoard();
    createAnswers(respond);
    const { name, address, submit, banner } = await openModal(app);
    await app.user.type(name, 'Draco');

    await app.user.click(submit);

    await waitFor(() => expect(banner()).toBeInTheDocument());
    expect(banner()).toHaveTextContent('Não foi possível criar o projeto');
    expect(banner()).toHaveTextContent(detail);
    expect(name).toHaveValue('Draco');
    expect(address).toHaveValue('draco');
    expect(submit).toBeEnabled();
    expect(app.path()).toBe('/p/atlas');
  });

  it('durante o envio só o botão principal desativa e a situação é anunciada', async () => {
    const app = await openBoard();
    const calls = createAnswers(() => new Promise<Response>(() => {}));
    const { name, submit, cancel, status } = await openModal(app);
    await app.user.type(name, 'Draco');

    await app.user.click(submit);

    await waitFor(() => expect(status).toHaveTextContent('Criando o projeto…'));
    expect(submit).toBeDisabled();
    expect(cancel).toBeEnabled();
    await app.user.click(submit);
    expect(calls.count).toBe(1);
  });

  it('fechar não cancela o pedido enviado, mas não leva a pessoa a outra tela', async () => {
    const app = await openBoard();
    let release = () => {};
    const gate = new Promise<void>((resolve) => (release = resolve));
    createAnswers(async () => {
      await gate;
      const draco = { id: 'p9', name: 'Draco', slug: 'draco' };
      app.backend.set([ATLAS, draco, VEGA]);
      return HttpResponse.json(draco, { status: 201 });
    });
    const { name, submit, cancel } = await openModal(app);
    await app.user.type(name, 'Draco');
    await app.user.click(submit);
    await app.user.click(cancel);

    release();

    expect(await menuLinks().findByRole('link', { name: 'Draco' })).toBeInTheDocument();
    expect(app.path()).toBe('/p/atlas');
  });

  it.each(['Escape', 'Cancelar', 'Fechar'])(
    '%s fecha, devolve o foco e reabre limpo',
    async (way) => {
      const app = await openBoard();
      const first = await openModal(app);
      await app.user.type(first.name, 'Rascunho');

      if (way === 'Escape') await app.user.keyboard('{Escape}');
      else await app.user.click(within(first.dialog).getByRole('button', { name: way }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() => expect(trigger()).toHaveFocus());

      const again = await openModal(app);
      expect(again.name).toHaveValue('');
      expect(again.address).toHaveValue('');
      expect(app.backend.writes).toEqual([]);
    },
  );
});
