import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Fonte nunca vira `data:` (há subconjunto de 2 KB): a CSP só aceitará arquivos do app.
    // `undefined` mantém a regra padrão do Vite para os outros arquivos.
    assetsInlineLimit: (filePath) => (filePath.endsWith('.woff2') ? false : undefined),
  },
});
