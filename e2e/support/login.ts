import type { Page } from '@playwright/test';
import { createTestSession, SESSION_KEY, type TestUser } from './supabase';

/**
 * Deixa o navegador com a sessão de uma conta de teste. Quem chama navega em seguida para a
 * tela que quer testar.
 */
export async function loginAs(page: Page, user: TestUser): Promise<void> {
  const session = await createTestSession(user);

  // O `localStorage` pertence ao endereço do app: é preciso estar nele para gravar. A tela de
  // status é pública e não depende de sessão.
  await page.goto('/status');
  // Uma gravação só. Um `addInitScript` reporia a sessão a cada página, inclusive depois de
  // "Sair".
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: SESSION_KEY,
    value: session,
  });
}
