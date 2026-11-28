// Conferências de acessibilidade e de layout usadas por mais de um teste.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

const TARGETS =
  'button, a[href], input, textarea, [role="combobox"], [role="radio"], [role="switch"], [role="option"], [role="menuitem"]';

/** As violações sérias ou críticas que o axe encontra na página. */
export async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target.join(' ')) }));
}

/** Mede os alvos visíveis de uma região. Os elementos auxiliares do Radix são `aria-hidden`. */
function measureTargets(region: Locator) {
  return region.locator(TARGETS).evaluateAll((elements) =>
    elements
      .filter((element) => !element.closest('[aria-hidden="true"]'))
      .filter((element) => element.checkVisibility({ visibilityProperty: true }))
      .map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return {
          name:
            element.getAttribute('aria-label') ??
            (element.textContent?.trim() || element.outerHTML),
          iconOnly: element.tagName === 'BUTTON' && !element.textContent?.trim(),
          width,
          height,
        };
      }),
  );
}

/** Exige pelo menos 44px de altura em todo alvo, e de largura nos botões só com ícone. */
export async function expectTargetSizes(region: Locator, where: string) {
  const targets = await measureTargets(region);
  expect(targets, `${where}: nenhum alvo encontrado`).not.toEqual([]);

  // Folga para arredondamento de subpixel.
  const small = targets.filter(
    ({ height, width, iconOnly }) => height < 43.9 || (iconOnly && width < 43.9),
  );
  expect(small, where).toEqual([]);
  return targets;
}

export const VIEWPORTS = [
  { name: 'desktop', size: { width: 1280, height: 720 } },
  { name: '375px', size: { width: 375, height: 667 } },
];

/** Axe, tamanho dos alvos e largura, no desktop e no celular. */
export async function expectAccessibleScreen(page: Page, screen: string) {
  for (const { name, size } of VIEWPORTS) {
    const where = `${screen} (${name})`;
    await page.setViewportSize(size);
    expect(await seriousViolations(page), where).toEqual([]);
    await expectTargetSizes(page.locator('body'), where);
    await expectNoHorizontalScroll(page, where);
  }
}

/** O conteúdo não pode passar da largura da janela. */
export async function expectNoHorizontalScroll(page: Page, where: string) {
  const { content, viewport } = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(content, `${where}: rolagem horizontal`).toBeLessThanOrEqual(viewport);
}
