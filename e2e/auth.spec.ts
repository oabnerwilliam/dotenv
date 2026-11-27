// Fluxo de acesso de ponta a ponta: navegador, web, API, Supabase Auth local e banco de testes.
// Só a ida ao Google fica de fora: `loginAs` entra com e-mail e senha, aceitos no modo de teste.
import { expect, test, type Page } from '@playwright/test';
import { expectNoHorizontalScroll, expectTargetSizes, seriousViolations } from './support/a11y';
import { resetDb } from './support/db';
import { loginAs } from './support/login';

const OWNER = { email: 'dono@acme.example', name: 'Dona Acme' };
const STRANGER = { email: 'estranho@acme.example', name: 'Pessoa de Fora' };

const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 720 } },
  { name: '375px', size: { width: 375, height: 667 } },
];

// Cada teste começa sem equipe, sem depender da ordem de execução.
test.beforeEach(async () => {
  await resetDb();
});

const heading = (page: Page, name: string) => page.getByRole('heading', { level: 1, name });

/** Axe, tamanho dos alvos e largura, no desktop e no celular. */
async function expectAccessibleScreen(page: Page, screen: string) {
  for (const { name, size } of VIEWPORTS) {
    const where = `${screen} (${name})`;
    await page.setViewportSize(size);
    expect(await seriousViolations(page), where).toEqual([]);
    await expectTargetSizes(page.locator('body'), where);
    await expectNoHorizontalScroll(page, where);
  }
}

test('sem sessão, a rota protegida leva ao login', async ({ page }) => {
  await page.goto('/p/atlas');

  await expect(page).toHaveURL('/login');
  await expect(heading(page, 'Entrar no .env')).toBeVisible();
  await expect(page.getByRole('button')).toHaveText([/Continuar com Google/]);
});

test('o dono cria a equipe e chega ao projeto', async ({ page }) => {
  await loginAs(page, OWNER);
  await page.goto('/');

  await expect(page).toHaveURL('/onboarding/equipe');
  await page.getByRole('textbox', { name: 'Nome da equipe' }).fill('Acme');
  await expect(page.getByRole('textbox', { name: 'Endereço' })).toHaveValue('acme');
  await page.getByRole('textbox', { name: 'Primeiro projeto' }).fill('Atlas');
  await page.getByRole('button', { name: 'Criar equipe' }).click();

  await expect(page).toHaveURL('/p/atlas');
  await expect(heading(page, 'Acme')).toBeVisible();

  // Recarregar apaga o cache do navegador: a equipe e a sessão precisam vir de novo.
  await page.reload();
  await expect(heading(page, 'Acme')).toBeVisible();
  await expect(page).toHaveURL('/p/atlas');
});

test('um estranho vê sem permissão e consegue sair', async ({ page }) => {
  await loginAs(page, STRANGER);
  await page.goto('/');

  await expect(page).toHaveURL('/sem-permissao');
  await expect(heading(page, 'Você não tem acesso a esta equipe')).toBeVisible();
  await expect(page.getByText(STRANGER.email)).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL('/login');

  // A sessão acabou de verdade: voltar à página inicial não entra de novo.
  await page.goto('/');
  await expect(page).toHaveURL('/login');
  await expect(heading(page, 'Entrar no .env')).toBeVisible();
});

test('a tela de login é acessível', async ({ page }) => {
  await page.goto('/login');
  await expect(heading(page, 'Entrar no .env')).toBeVisible();

  await expectAccessibleScreen(page, 'login');
});

test('a tela de criar equipe é acessível, também com erros nos campos', async ({ page }) => {
  await loginAs(page, OWNER);
  await page.goto('/onboarding/equipe');
  await expect(heading(page, 'Crie a equipe')).toBeVisible();

  await expectAccessibleScreen(page, 'criar equipe');

  await page.getByRole('button', { name: 'Criar equipe' }).click();
  await expect(page.getByRole('textbox', { name: 'Nome da equipe' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expectAccessibleScreen(page, 'criar equipe com erros');
});

test('a tela sem permissão é acessível', async ({ page }) => {
  await loginAs(page, STRANGER);
  await page.goto('/sem-permissao');
  await expect(heading(page, 'Você não tem acesso a esta equipe')).toBeVisible();

  await expectAccessibleScreen(page, 'sem permissão');
});
