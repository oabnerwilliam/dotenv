// Projetos e navegação de ponta a ponta: navegador, web, API e banco de testes.
import { expect, test, type Page } from '@playwright/test';
import { expectAccessibleScreen, expectNoHorizontalScroll } from './support/a11y';
import { resetDb } from './support/db';
import { loginAs } from './support/login';

const OWNER = { email: 'dono@acme.example', name: 'Dona Acme' };

const DESKTOP = { width: 1280, height: 720 };
const PHONE = { width: 375, height: 667 };

// Cada teste começa sem equipe, sem depender da ordem de execução.
test.beforeEach(async () => {
  await resetDb();
});

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const textbox = (page: Page, name: string) => page.getByRole('textbox', { name });
const dialog = (page: Page, name: string) => page.getByRole('dialog', { name });
const sidebar = (page: Page) => page.getByRole('complementary', { name: 'Menu lateral' });
const projectsNav = (page: Page) => page.getByRole('navigation', { name: 'Projetos' });
const toggle = (page: Page) => button(page, 'Alternar menu lateral');

/** Entra como dona e cria a equipe pela tela, chegando ao primeiro projeto. */
async function createTeam(page: Page, team: string, project: string) {
  await loginAs(page, OWNER);
  await page.goto('/onboarding/equipe');
  await textbox(page, 'Nome da equipe').fill(team);
  await textbox(page, 'Primeiro projeto').fill(project);
  await button(page, 'Criar equipe').click();
  await expect(heading(page, 'Board')).toBeVisible();
}

/** Cria um projeto pelo modal, enviando com Enter (o botão fica fora do `<form>`). */
async function createProject(page: Page, name: string, slug?: string) {
  await button(page, 'Novo projeto').click();
  await expect(textbox(page, 'Nome do projeto')).toBeFocused();
  await textbox(page, 'Nome do projeto').fill(name);
  if (slug) await textbox(page, 'Endereço').fill(slug);
  await textbox(page, 'Nome do projeto').press('Enter');
}

test('criar, renomear e arquivar um projeto', async ({ page }) => {
  await createTeam(page, 'Acme', 'Atlas');

  await createProject(page, 'Draco');
  await expect(page).toHaveURL('/p/draco');
  await expect(heading(page, 'Board')).toBeVisible();
  await page.reload();
  await expect(projectsNav(page).getByTitle('Draco')).toBeVisible();

  // O endereço é único na equipe: a repetição volta no próprio campo.
  await createProject(page, 'Outro Draco', 'draco');
  await expect(textbox(page, 'Endereço')).toHaveAccessibleDescription(
    /Este endereço já é usado por um projeto, mesmo que arquivado\./,
  );
  await page.keyboard.press('Escape');
  await expect(button(page, 'Novo projeto')).toBeFocused();

  await projectsNav(page).getByRole('link', { name: 'Configurações' }).click();
  await button(page, 'Renomear').click();
  await expect(textbox(page, 'Nome do projeto')).toHaveValue('Draco');
  await textbox(page, 'Nome do projeto').fill('Draco Web');
  await textbox(page, 'Nome do projeto').press('Enter');
  await expect(dialog(page, 'Renomear projeto')).toBeHidden();
  await expect(button(page, 'Renomear')).toBeFocused();
  await page.reload();
  await expect(projectsNav(page).getByTitle('Draco Web')).toBeVisible();
  await expect(page).toHaveURL('/p/draco/configuracoes');

  await button(page, 'Arquivar').click();
  await button(page, 'Arquivar projeto').click();
  await expect(page).toHaveURL('/p/atlas');
  await expect(heading(page, 'Board')).toBeFocused();
  await expect(projectsNav(page).getByText('Draco Web')).toHaveCount(0);
  await page.reload();
  await expect(projectsNav(page).getByTitle('Atlas')).toBeVisible();
  await expect(projectsNav(page).getByText('Draco Web')).toHaveCount(0);

  await page.goto('/p/draco');
  await expect(heading(page, 'Projeto não encontrado')).toBeVisible();
  await page.getByRole('link', { name: 'Voltar ao início' }).click();
  await expect(page).toHaveURL('/p/atlas');

  // O último também pode ser arquivado; a equipe fica sem projeto até criar outro.
  await projectsNav(page).getByRole('link', { name: 'Configurações' }).click();
  await button(page, 'Arquivar').click();
  await expect(dialog(page, 'Arquivar projeto')).toContainText('último projeto da equipe');
  await button(page, 'Arquivar projeto').click();
  await expect(page).toHaveURL('/');
  await expect(heading(page, 'Nenhum projeto ainda')).toBeFocused();
  await page.reload();
  await expect(heading(page, 'Nenhum projeto ainda')).toBeVisible();

  await button(page, 'Criar projeto').click();
  await textbox(page, 'Nome do projeto').fill('Lyra');
  await textbox(page, 'Nome do projeto').press('Enter');
  await expect(page).toHaveURL('/p/lyra');
  await expect(heading(page, 'Board')).toBeFocused();
});

test('o menu lateral recolhido continua assim ao recarregar', async ({ page }) => {
  await createTeam(page, 'Acme', 'Atlas');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');

  // Pelo teclado, o foco segue para o botão que substitui o usado.
  await button(page, 'Recolher menu lateral').press('Enter');
  await expect(button(page, 'Expandir menu lateral')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(button(page, 'Recolher menu lateral')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await page.reload();
  await expect(button(page, 'Expandir menu lateral')).toBeVisible();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');

  // Na tela estreita, o recolhido não ocupa espaço; aberto, continua aberto ao recarregar.
  await page.setViewportSize(PHONE);
  await expect(sidebar(page)).toBeHidden();
  await toggle(page).click();
  await expect(sidebar(page)).toBeVisible();
  await page.reload();
  await expect(sidebar(page)).toBeVisible();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');

  // Recolhido na tela estreita, o menu some: o foco vai ao botão da nav.
  await button(page, 'Recolher menu lateral').press('Enter');
  await expect(sidebar(page)).toBeHidden();
  await expect(toggle(page)).toBeFocused();
});

test('sem escolha salva, o menu começa fechado na tela estreita', async ({ page }) => {
  await page.setViewportSize(PHONE);
  await createTeam(page, 'Acme', 'Atlas');

  await expect(sidebar(page)).toBeHidden();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});

// O jsdom não mede layout nem cor: contraste, tamanho e quebra de linha só no navegador.
test('casca, menu da equipe e modais são acessíveis', async ({ page }) => {
  test.slow();
  // Nomes no limite, com e sem espaços, e endereços de 40 letras.
  const team = 'Acme Laboratório de Homologação Integrada';
  const first = 'Atlas Plataforma de Homologação Integrada Multisserviço';
  const unbroken = `Vega${'x'.repeat(56)}`;
  await createTeam(page, team, first);
  await createProject(page, unbroken, 'v'.repeat(40));
  await expect(page).toHaveURL(`/p/${'v'.repeat(40)}`);
  await expect(heading(page, 'Board')).toBeVisible();
  await expectAccessibleScreen(page, 'board, menu sem escolha salva');

  // Menu aberto nas duas larguras.
  await page.setViewportSize(PHONE);
  await toggle(page).click();
  await expectAccessibleScreen(page, 'board, menu aberto');

  await page.setViewportSize(DESKTOP);
  await button(page, 'Recolher menu lateral').click();
  await expectAccessibleScreen(page, 'board, menu recolhido');
  await page.setViewportSize(DESKTOP);
  await button(page, 'Expandir menu lateral').click();

  await page.getByRole('combobox', { name: 'Projeto' }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await expectAccessibleScreen(page, 'seletor de projeto aberto');
  await page.keyboard.press('Escape');

  const avatar = button(page, `Equipe ${team}`);
  await avatar.click();
  await expect(page.getByRole('menu', { name: 'Equipe' })).toBeVisible();
  await expectAccessibleScreen(page, 'menu da equipe');
  await page.keyboard.press('Escape');
  await expect(avatar).toBeFocused();

  // Clique fora também fecha, e o foco volta.
  await avatar.click();
  await page.mouse.click(5, 300);
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(avatar).toBeFocused();

  // Ordem do Tab, também com a nav em duas linhas.
  await page.setViewportSize(PHONE);
  await page.reload();
  await expect(heading(page, 'Board')).toBeVisible();
  for (const control of [
    toggle(page),
    page.getByRole('link', { name: '.env, início' }),
    page.getByRole('combobox', { name: 'Projeto' }),
    avatar,
  ]) {
    await page.keyboard.press('Tab');
    await expect(control).toBeFocused();
  }

  await page.setViewportSize(DESKTOP);
  await button(page, 'Novo projeto').click();
  await expectAccessibleScreen(page, 'novo projeto');
  await button(page, 'Criar projeto').click();
  await expect(textbox(page, 'Nome do projeto')).toHaveAttribute('aria-invalid', 'true');
  await expectAccessibleScreen(page, 'novo projeto com erros');
  await page.keyboard.press('Escape');

  await page.setViewportSize(DESKTOP);
  await projectsNav(page).getByRole('link', { name: 'Histórico' }).click();
  await expect(heading(page, 'Histórico')).toBeVisible();
  await expectAccessibleScreen(page, 'histórico');

  await page.setViewportSize(DESKTOP);
  await projectsNav(page).getByRole('link', { name: 'Configurações' }).click();
  await expect(heading(page, 'Configurações')).toBeVisible();
  await expectAccessibleScreen(page, 'configurações');

  await button(page, 'Renomear').click();
  await expectAccessibleScreen(page, 'renomear projeto');
  await page.keyboard.press('Escape');

  await button(page, 'Arquivar').click();
  await expectAccessibleScreen(page, 'arquivar projeto');
  await page.keyboard.press('Escape');

  await page.goto('/equipe/membros');
  await expect(heading(page, 'Membros')).toBeVisible();
  await expectAccessibleScreen(page, 'membros');

  await page.goto(`/p/${'z'.repeat(200)}`);
  await expect(heading(page, 'Projeto não encontrado')).toBeVisible();
  await expectAccessibleScreen(page, 'projeto não encontrado');
  for (const width of [360, 320]) {
    await page.setViewportSize({ width, height: 667 });
    await expectNoHorizontalScroll(page, `não encontrado, ${width}px`);
  }
});

test('equipe sem projeto é acessível, com "Configurações" indisponível no menu', async ({
  page,
}) => {
  await createTeam(page, 'Acme', 'Atlas');
  await page.goto('/p/atlas/configuracoes');
  await button(page, 'Arquivar').click();
  await expectAccessibleScreen(page, 'arquivar o último projeto');
  await button(page, 'Arquivar projeto').click();
  await expect(heading(page, 'Nenhum projeto ainda')).toBeVisible();
  await expectAccessibleScreen(page, 'nenhum projeto');

  await button(page, 'Equipe Acme').click();
  await expect(page.getByRole('menuitem', { name: /Configurações/ })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  await expectAccessibleScreen(page, 'menu da equipe sem projeto');
});
