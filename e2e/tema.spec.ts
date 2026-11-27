import { expect, test } from '@playwright/test';

test('a tela usa os tokens do design', async ({ page }) => {
  await page.goto('/status');

  const body = page.locator('body');
  await expect(body).toHaveCSS('background-color', 'rgb(11, 13, 16)');
  await expect(body).toHaveCSS('color', 'rgb(230, 237, 243)');
  await expect(body).toHaveCSS('font-family', /^"Inter Variable"/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS(
    'font-family',
    /^"JetBrains Mono Variable"/,
  );
});

test('as fontes vêm do próprio app', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', (request) => {
    const url = new URL(request.url());
    // `data:` não sai do navegador; o `check-bundle` é quem proíbe fonte embutida.
    if (url.protocol !== 'data:') hosts.add(url.hostname);
  });

  await page.goto('/status');
  await expect(page.getByText('API no ar')).toBeVisible();

  // `document.fonts.check` responde `true` quando nenhuma face foi declarada. Por isso a
  // lista olha as faces que o navegador de fato carregou.
  const loadedFamilies = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === 'loaded')
      .map((face) => face.family.replaceAll('"', ''));
  });

  expect(loadedFamilies).toContain('Inter Variable');
  expect(loadedFamilies).toContain('JetBrains Mono Variable');
  expect([...hosts]).toEqual(['localhost']);
});
