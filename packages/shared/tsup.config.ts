import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // Limpar em modo watch apagaria o dist que a API e o web estão lendo.
  clean: !options.watch,
}));
