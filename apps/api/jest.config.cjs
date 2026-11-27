/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.int-spec.ts'],
  // `allowJs` serve ao `jose`, convertido abaixo.
  transform: { '^.+\\.[tj]s$': ['ts-jest', { tsconfig: { allowJs: true } }] },
  // O `jose` 6 só publica ESM, que o Jest 29 não carrega: é a única dependência que o ts-jest
  // converte para CommonJS. A primeira alternativa pula a pasta `.pnpm`, para a decisão valer
  // no `node_modules/<pacote>` de dentro dela. Rodando a API, o Node 22.14 carrega o ESM sozinho.
  transformIgnorePatterns: ['/node_modules/(?!\\.pnpm/|jose/)'],
  // O client gerado pelo Prisma importa com `.js`, mas no teste o arquivo em disco é `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  setupFiles: ['<rootDir>/test/env.setup.ts'],
};
