/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.int-spec.ts'],
  transform: { '^.+\\.ts$': 'ts-jest' },
  // O client gerado pelo Prisma importa com `.js`, mas no teste o arquivo em disco é `.ts`.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  setupFiles: ['<rootDir>/test/env.setup.ts'],
};
