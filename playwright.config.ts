import { defineConfig, devices } from '@playwright/test';
import { supabaseStatus } from './apps/api/test/support/supabase-status';
import { testDatabaseUrl } from './e2e/support/db';

const API_URL = 'http://localhost:3333';
const WEB_URL = 'http://localhost:5173';

// Recusa qualquer banco que não termine em `_test`.
const databaseUrl = testDatabaseUrl();

// Endereço e chaves do Supabase local, lidos da CLI para não ficarem escritos no repositório.
const supabase = supabaseStatus();

export default defineConfig({
  testDir: 'e2e',
  // No CI, um `test.only` esquecido derruba a execução em vez de pular os outros testes.
  forbidOnly: !!process.env.CI,
  // Um teste por vez: o `resetDb()` apaga o banco que todos compartilham.
  workers: 1,
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
        SUPABASE_URL: supabase.API_URL,
        SUPABASE_SECRET_KEY: supabase.SECRET_KEY,
        OWNER_EMAIL: 'dono@acme.example',
        // Login por senha para os testes. A API só aceita com `NODE_ENV=test`, definido apenas
        // neste processo: no do web, mudaria o build do Vite.
        NODE_ENV: 'test',
        AUTH_TEST_MODE: 'true',
        // Alto: a suíte inteira sai do mesmo IP.
        RATE_LIMIT_PER_MINUTE: '10000',
      },
    },
    {
      name: 'web',
      command: 'pnpm --filter @env/web run dev',
      url: WEB_URL,
      reuseExistingServer: false,
      env: {
        VITE_API_URL: API_URL,
        VITE_SUPABASE_URL: supabase.API_URL,
        VITE_SUPABASE_PUBLISHABLE_KEY: supabase.PUBLISHABLE_KEY,
      },
    },
  ],
});
