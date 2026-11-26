import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    env: { VITE_API_URL: 'http://localhost:3333' },
    setupFiles: ['src/test/setup.ts'],
  },
});
