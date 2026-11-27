import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolve os pacotes como o build do navegador. Sem isto os testes carregam duas cópias do
  // react-router (uma pelo `react-router/dom`) e os componentes não enxergam o roteador.
  resolve: { conditions: ['module-sync', 'module', 'browser', 'development'] },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    // Endereços e chave fictícios: nos testes, quem responde por eles é o msw.
    env: {
      VITE_API_URL: 'http://localhost:3333',
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'chave-publicavel-de-teste',
    },
    setupFiles: ['src/test/setup.ts'],
    // Bem acima do `asyncUtilTimeout` do setup: quando uma busca falha, o erro mostrado é o dela
    // (com a tela daquele momento), e não só "o teste estourou o prazo".
    testTimeout: 20_000,
  },
});
