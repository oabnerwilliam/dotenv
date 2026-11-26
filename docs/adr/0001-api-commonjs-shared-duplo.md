# ADR 0001 — API em CommonJS e `shared` com duas saídas

**Estado:** aceita · **Data:** 2026-11-26

## Contexto
O `packages/shared` é consumido por dois programas com sistemas de módulos diferentes: o web (Vite), que usa ESM, e a API (NestJS), que roda no Node com os testes em Jest.

A API usa o NestJS 11 com Jest, combinação que funciona em CommonJS. O NestJS 12 é só ESM e ficou fora das versões fixadas nas convenções.

## Decisão
- A API é CommonJS (`module: commonjs`, `moduleResolution: node10`).
- O `shared` é escrito uma vez e o tsup gera ESM (`index.js`, `index.d.ts`) e CommonJS (`index.cjs`, `index.d.cts`).
- O `package.json` do `shared` declara `exports` com `import` e `require`, **mais** `main` e `types`, porque a resolução `node10` ignora `exports`.

## Consequências
- O `shared` precisa ser gerado antes de lint de tipos, testes e build: os scripts da raiz rodam `codegen` primeiro.
- Em modo watch o tsup não limpa o `dist`, para não apagar arquivos que a API e o web estão lendo.
- `moduleResolution: node10` é considerado antigo pelo TypeScript. Migrar a API para ESM (junto com o NestJS 12 ou posterior) exige uma nova decisão.
