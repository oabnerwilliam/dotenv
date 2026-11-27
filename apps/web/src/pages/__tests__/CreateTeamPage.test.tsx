import { screen, waitFor } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
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

const TEAM_URL = 'http://localhost:3333/team';

/** Faz o `POST /team` responder e devolve os corpos recebidos. */
function teamAnswers(body: object, status = 201) {
  const received: unknown[] = [];
  server.use(
    http.post(TEAM_URL, async ({ request }) => {
      received.push(await request.json());
      return HttpResponse.json(body, { status });
    }),
  );
  return received;
}

/** Depois que a equipe existe, o `/me` não responde: só resta o que o POST devolveu. */
function meStopsAnswering() {
  server.use(
    http.get(ME_URL, async () => {
      await delay('infinite');
      return HttpResponse.json(NEEDS_TEAM);
    }),
  );
}

async function openPage() {
  seedSession();
  const me = meAnswers(NEEDS_TEAM);
  const app = renderApp('/onboarding/equipe');
  await screen.findByRole('heading', { level: 1, name: 'Crie a equipe' });
  const teamName = screen.getByRole('textbox', { name: 'Nome da equipe' });
  const address = screen.getByRole('textbox', { name: 'Endereço' });
  const project = screen.getByRole('textbox', { name: 'Primeiro projeto' });
  const submit = screen.getByRole('button', { name: 'Criar equipe' });
  return { ...app, me, teamName, address, project, submit };
}

async function openFilledPage() {
  const page = await openPage();
  await page.user.type(page.teamName, 'Acme');
  await page.user.type(page.project, 'Atlas');
  return page;
}

describe('CreateTeamPage', () => {
  it('começa vazia, com as dicas e as ações "Criar equipe" e "Sair"', async () => {
    const { teamName, address, project } = await openPage();

    for (const field of [teamName, address, project]) expect(field).toHaveValue('');
    expect(address).toHaveAccessibleDescription(
      'Letras minúsculas, números e hífens, de 2 a 40 caracteres.',
    );
    expect(address).toHaveClass('font-mono');
    expect(project).toHaveAccessibleDescription('Você pode adicionar outros depois.');
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      '>Criar equipe',
      'Sair',
    ]);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('o endereço acompanha o nome até a pessoa editar', async () => {
    const { user, teamName, address } = await openPage();

    await user.type(teamName, 'Estúdio Órion');
    expect(address).toHaveValue('estudio-orion');

    await user.clear(address);
    await user.type(address, 'orion');
    await user.type(teamName, ' Dois');

    expect(address).toHaveValue('orion');
  });

  it('envia o slug do projeto derivado do nome e vai ao projeto', async () => {
    const { user, path, teamName, project } = await openPage();
    meStopsAnswering();
    const received = teamAnswers({ ...MEMBER, defaultProjectSlug: 'portal-vega' });

    await user.type(teamName, '  Acme ');
    await user.type(project, 'Portal Vega{Enter}');

    // Sem o `/me` responder, só a resposta do POST gravada no cache leva ao projeto.
    await waitFor(() => expect(path()).toBe('/p/portal-vega'));
    expect(received).toEqual([
      { name: 'Acme', slug: 'acme', project: { name: 'Portal Vega', slug: 'portal-vega' } },
    ]);
    expect(await screen.findByRole('heading', { level: 1, name: 'Acme' })).toBeInTheDocument();
  });

  it('durante o envio, só "Criar equipe" fica desativado e a situação é anunciada', async () => {
    const { user, submit } = await openFilledPage();
    server.use(
      http.post(TEAM_URL, async () => {
        await delay('infinite');
        return HttpResponse.json(MEMBER);
      }),
    );

    await user.click(submit);

    await waitFor(() => expect(submit).toBeDisabled());
    expect(submit).toHaveAccessibleName('Criar equipe');
    expect(screen.getByRole('status')).toHaveTextContent('Criando a equipe…');
    expect(screen.getByRole('button', { name: 'Sair' })).toBeEnabled();
  });

  it('formulário vazio mostra os erros, foca o primeiro campo e não chama a API', async () => {
    const { user, teamName, address, project, submit } = await openPage();

    await user.click(submit);

    await waitFor(() => expect(teamName).toHaveAccessibleDescription('Informe o nome da equipe.'));
    expect(teamName).toHaveAttribute('aria-invalid', 'true');
    expect(teamName).toHaveFocus();
    expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(project).toHaveAccessibleDescription(
      'Você pode adicionar outros depois. Informe o nome do primeiro projeto.',
    );
  });

  it('endereço fora do formato explica o que usar', async () => {
    const { user, address, submit } = await openFilledPage();
    await user.clear(address);
    await user.type(address, 'Acme Corp');

    await user.click(submit);

    await waitFor(() => expect(address).toHaveAttribute('aria-invalid', 'true'));
    expect(address).toHaveAccessibleDescription(/Use só letras minúsculas, números e hífens\.$/);
    expect(address).toHaveFocus();
  });

  it('nome de projeto que não gera endereço válido mostra erro no campo', async () => {
    const { user, teamName, project, submit, path } = await openPage();
    await user.type(teamName, 'Acme');
    await user.type(project, '!!!');

    await user.click(submit);

    await waitFor(() => expect(project).toHaveAttribute('aria-invalid', 'true'));
    expect(project).toHaveAccessibleDescription(
      'Você pode adicionar outros depois. Use ao menos 2 letras ou números no nome do projeto.',
    );
    expect(project).toHaveFocus();
    expect(path()).toBe('/onboarding/equipe');

    // Corrigido o nome, o erro some sem precisar enviar.
    await user.clear(project);
    await user.type(project, 'Atlas');
    await waitFor(() => expect(project).not.toHaveAttribute('aria-invalid'));
  });

  it.each([
    ['slug', 'Endereço'],
    ['name', 'Nome da equipe'],
    ['project.name', 'Primeiro projeto'],
    ['project.slug', 'Primeiro projeto'],
  ])('fields.%s da API aparece no campo "%s", que recebe o foco', async (key, label) => {
    const { user, submit } = await openFilledPage();
    teamAnswers(
      { code: 'VALIDATION', message: 'Dados inválidos.', fields: { [key]: 'Recusado pela API.' } },
      400,
    );

    await user.click(submit);

    const field = screen.getByRole('textbox', { name: label });
    await waitFor(() => expect(field).toHaveAccessibleDescription(/Recusado pela API\.$/));
    expect(field).toHaveFocus();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.type(field, 'x');
    await waitFor(() => expect(field).not.toHaveAttribute('aria-invalid'));
  });

  it('409 mostra a faixa e consulta /me de novo', async () => {
    const { user, submit, me } = await openFilledPage();
    teamAnswers({ code: 'CONFLICT', message: 'A equipe já existe.' }, 409);

    await user.click(submit);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Não foi possível criar a equipe');
    expect(alert).toHaveTextContent('A equipe já existe.');
    await waitFor(() => expect(me.count).toBe(2));
  });

  it('409 segue para a tela do estado que o /me devolver', async () => {
    const { user, submit, path } = await openFilledPage();
    teamAnswers({ code: 'CONFLICT', message: 'A equipe já existe.' }, 409);
    meAnswers(NOT_INVITED);

    await user.click(submit);

    await waitFor(() => expect(path()).toBe('/sem-permissao'));
  });

  it('sem resposta da API, a faixa pede para conferir a conexão e os valores ficam', async () => {
    const { user, submit, teamName, project, me, path } = await openFilledPage();
    server.use(http.post(TEAM_URL, () => HttpResponse.error()));

    await user.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Confira sua conexão e tente de novo.',
    );
    expect(teamName).toHaveValue('Acme');
    expect(project).toHaveValue('Atlas');
    expect(submit).toBeEnabled();
    expect(me.count).toBe(1);

    teamAnswers(MEMBER);
    meStopsAnswering();
    await user.click(submit);
    await waitFor(() => expect(path()).toBe('/p/atlas'));
  });

  it('"Sair" encerra a sessão sem enviar o formulário', async () => {
    const { user, path } = await openFilledPage();
    logoutAnswers(204);

    await user.click(screen.getByRole('button', { name: 'Sair' }));

    await waitFor(() => expect(path()).toBe('/login'));
    expect(storedSession()).toBeNull();
  });
});
