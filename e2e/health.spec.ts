import { expect, test } from '@playwright/test';

// Ponta a ponta de verdade: navegador, web, API e banco de testes, sem nada simulado.
test('a tela de status mostra a API e o banco conectados', async ({ page }) => {
  await page.goto('/status');

  const status = page.getByRole('status');
  await expect(status.getByText('API no ar')).toBeVisible();
  await expect(status.getByText('Banco conectado')).toBeVisible();
});
