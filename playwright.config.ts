import { defineConfig, devices } from '@playwright/test';

const API_URL = 'http://localhost:3333';
const WEB_URL = 'http://localhost:5173';
const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/env_test';

const databaseUrl = process.env.TEST_DATABASE_URL || DEFAULT_DATABASE_URL;

// Mesma trava do `db:test:setup` e do Jest. A mensagem não cita a URL, que carrega a senha.
if (!new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL precisa apontar para um banco terminado em _test.');
}

export default defineConfig({
  testDir: 'e2e',
  // No CI, um `test.only` esquecido derruba a execução em vez de pular os outros testes.
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // O Playwright sobe a API e o web antes dos testes e encerra os dois no fim.
  // `reuseExistingServer: false`: reaproveitar um `pnpm dev` aberto rodaria o e2e no banco
  // de desenvolvimento. O `env` abaixo vence o ambiente do terminal e os arquivos `.env`.
  webServer: [
    {
      name: 'api',
      command: 'pnpm --filter @env/api exec nest start',
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      env: {
        PORT: '3333',
        DATABASE_URL: databaseUrl,
        WEB_ORIGIN: WEB_URL,
      },
    },
    {
      name: 'web',
      command: 'pnpm --filter @env/web run dev',
      url: WEB_URL,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
});
