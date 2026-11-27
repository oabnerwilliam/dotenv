import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectTargetSizes, seriousViolations } from './support/a11y';

const ACCENT = 'rgb(190, 242, 100)';
const TRANSPARENT = 'rgba(0, 0, 0, 0)';

test.beforeEach(async ({ page }) => {
  await page.goto('/dev/componentes');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Vitrine de componentes' }),
  ).toBeVisible();
});

async function openSelect(page: Page) {
  await page.getByRole('combobox', { name: 'Motivo', exact: true }).click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  return list;
}

async function openModal(page: Page) {
  await page.getByRole('button', { name: 'Abrir modal' }).click();
  const modal = page.getByRole('dialog', { name: 'Reservar Vega' });
  await expect(modal).toBeVisible();
  return modal;
}

async function openDrawer(page: Page) {
  await page.getByRole('button', { name: 'Abrir drawer' }).click();
  const drawer = page.getByRole('dialog', { name: 'Ambiente Lyra' });
  await expect(drawer).toBeVisible();
  return drawer;
}

test('a vitrine não tem violações sérias de acessibilidade', async ({ page }) => {
  expect(await seriousViolations(page), 'página').toEqual([]);

  // Única exceção. Com a lista aberta, o Radix Select esconde o resto da página (`#root`) com
  // `aria-hidden`, e o axe acusa os controles focáveis que ficaram lá. É falso positivo: o foco
  // fica preso na lista e o Tab é cancelado, o que as linhas abaixo conferem.
  const list = await openSelect(page);
  const selectViolations = (await seriousViolations(page)).filter(
    ({ id, targets }) => !(id === 'aria-hidden-focus' && targets.join() === '#root'),
  );
  expect(selectViolations, 'select aberto').toEqual([]);
  for (const key of ['Tab', 'Shift+Tab']) {
    await page.keyboard.press(key);
    await expect(list.locator(':focus')).toHaveCount(1);
  }
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();

  await openModal(page);
  expect(await seriousViolations(page), 'modal aberto').toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await openDrawer(page);
  expect(await seriousViolations(page), 'drawer aberto').toEqual([]);
});

test('todo alvo tem pelo menos 44px', async ({ page }) => {
  const targets = await expectTargetSizes(page.locator('body'), 'página');
  expect(targets.some(({ iconOnly }) => iconOnly)).toBe(true);

  await expectTargetSizes(await openSelect(page), 'select aberto');
  await page.keyboard.press('Escape');

  const modal = await openModal(page);
  await expectTargetSizes(modal, 'modal aberto');
  await modal.getByRole('combobox').click();
  await expectTargetSizes(page.getByRole('listbox'), 'select dentro do modal');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await expectTargetSizes(await openDrawer(page), 'drawer aberto');
});

/** Anda com Tab até o elemento receber o foco: só assim vale o `:focus-visible` do teclado. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 100; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`O Tab não chegou em ${target.toString()}`);
}

const background = (locator: Locator) =>
  locator.evaluate((element) => getComputedStyle(element).backgroundColor);

test('hover e foco dos botões', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Botões padrão' });
  const accent = group.getByRole('button', { name: 'Salvar alterações' });
  const green = group.getByRole('button', { name: 'Reservar' });
  const orange = group.getByRole('button', { name: 'Bloquear' });
  const ghost = group.getByRole('button', { name: 'Cancelar' });

  await green.hover();
  await expect(green).toHaveCSS('background-color', 'rgb(74, 222, 128)');
  await orange.hover();
  await expect(orange).toHaveCSS('background-color', 'rgb(251, 146, 60)');

  for (const button of [accent, ghost]) {
    await page.mouse.move(0, 0);
    await expect(button).toHaveCSS('background-color', TRANSPARENT);
    await button.hover();
    await expect(button).not.toHaveCSS('background-color', TRANSPARENT);
  }

  const disabled = page.getByRole('group', { name: 'Botões desativados' }).getByRole('button');
  await expect(disabled).toHaveCount(4);
  for (const button of await disabled.all()) {
    await page.mouse.move(0, 0);
    const before = await background(button);
    await button.hover();
    expect(await background(button)).toBe(before);
  }

  // Na ordem em que aparecem na página.
  const focusable = [
    accent,
    green,
    orange,
    ghost,
    page.getByRole('button', { name: 'Sincronizar agora' }),
    page.getByRole('textbox', { name: 'Nome do ambiente' }),
    page.getByRole('textbox', { name: 'Descrição' }),
  ];
  await page.mouse.move(0, 0);
  for (const target of focusable) {
    await tabTo(page, target);
    await expect(target).toHaveCSS('outline-style', 'solid');
    await expect(target).toHaveCSS('outline-color', ACCENT);
  }
});

test('o select aberto fica abaixo do gatilho, com a mesma largura', async ({ page }) => {
  const modal = await openModal(page);
  const trigger = modal.getByRole('combobox', { name: 'Motivo da reserva' });
  // Medido antes de abrir: com a lista aberta, o Radix esconde o resto dos leitores de tela.
  const triggerBox = (await trigger.boundingBox())!;
  await trigger.click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  const listBox = (await list.boundingBox())!;
  expect(listBox.y).toBeGreaterThanOrEqual(triggerBox.y + triggerBox.height);
  expect(Math.abs(listBox.width - triggerBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(listBox.x - triggerBox.x)).toBeLessThanOrEqual(1);

  // O clique do Playwright falha se o modal estiver por cima da opção.
  await page.getByRole('option', { name: 'Demonstração' }).click();
  await expect(list).toBeHidden();
  await expect(trigger).toHaveText('Demonstração');
  await expect(modal).toBeVisible();
});

test('em 375px o drawer ocupa a largura toda e o modal cabe na tela', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const pageWidth = () => page.evaluate(() => document.documentElement.scrollWidth);
  expect(await pageWidth(), 'sem rolagem horizontal').toBeLessThanOrEqual(375);

  const drawer = await openDrawer(page);
  expect(await drawer.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 667 });
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  const modal = await openModal(page);
  const box = (await modal.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(16);
  expect(box.x + box.width).toBeLessThanOrEqual(375 - 16);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(667);
  // O rodapé fica à vista; quem rola é o corpo.
  await expect(modal.getByRole('button', { name: 'Confirmar reserva' })).toBeInViewport({
    ratio: 1,
  });
});

test('movimento reduzido desliga a animação do esqueleto', async ({ page }) => {
  const skeleton = page.locator('.animate-skeleton').first();
  await expect(skeleton).toHaveCSS('animation-name', 'skeleton');

  await page.emulateMedia({ reducedMotion: 'reduce' });

  await expect(skeleton).toHaveCSS('animation-name', 'none');
});
