# .env Fase 1 — Convenções e contratos

Vale para todos os planos em `docs/backlog/`. Leia junto com o plano da história.

## Como executar um plano
- Cada **Tarefa** é um ciclo TDD: escreva os testes listados, veja-os falhar, implemente, veja-os passar, rode `pnpm lint && pnpm typecheck` e entregue com a mensagem de commit indicada.
- Os planos fixam arquivos, assinaturas, valores e asserções. O corpo das funções é de quem implementa.
- Antes de usar API de framework, confira a documentação da versão instalada. Se o plano estiver errado, corrija o plano no mesmo PR e registre o motivo.
- `[back]` é do `dev-back`, `[front]` do `dev-front`.

## Versões fixadas (conferidas no npm em 2026-11-26)
Fixar por motivo de compatibilidade com Node 22.14 e entre si; não subir de versão principal sem decisão.

| Pacote | Versão |
|---|---|
| Node / pnpm | 22.14 / 10.33 |
| typescript | 5.9.3 |
| vite, @vitejs/plugin-react | 7.3, 5.2 |
| react, react-dom | 19 |
| react-router | 7.18 (a 8 exige Node ≥ 22.22) |
| tailwindcss, @tailwindcss/vite | 4.3 |
| @tanstack/react-query | 5 |
| react-hook-form, @hookform/resolvers | 7, 7 |
| zustand, nuqs | 5, 2 |
| @nestjs/throttler, helmet | 6, 8 |
| radix-ui, lucide-react | 1, 1 |
| @fontsource-variable/inter | 5 |
| @fontsource-variable/jetbrains-mono | 5 |
| vitest, jsdom | 4.1, 26.1 |
| @testing-library/react, user-event, msw | 16, 14, 2 |
| @nestjs/* (core, common, testing, cli) | 11 |
| jest, ts-jest, supertest | 29, 29.4, 7 |
| prisma, @prisma/client, @prisma/adapter-pg | 7.10.1 |
| zod, jose, re2js | 4, 6, 2 |
| @supabase/supabase-js, supabase (CLI) | 2, 2 |
| @playwright/test, @axe-core/playwright | 1.65, 4 |
| eslint, typescript-eslint, jsx-a11y, react-hooks | 9, 8, 6, 7 |
| tsup | 8 (a 9 exige Node ≥ 22.18) |
| @eslint/js, globals, prettier | 9, 17, 3 |
| @types/node, @types/react, @types/react-dom | 22, 19, 19 |
| @testing-library/dom, jest-dom | 10, 6 |
| @nestjs/cli | 11.0 |
| @nestjs/platform-express, rxjs, reflect-metadata | 11, 7, 0.2 |
| @types/jest, @types/supertest | 29, 6 |
| pg, dotenv | 8, 17 |

Detalhe das linhas acima (conferido no npm em 2026-11-26):
- `supabase` fica exato em `2.122.1` (tag `v2.stable`). A `latest` é a 3.x, que muda comandos e configuração.
- `prisma`, `@prisma/client` e `@prisma/adapter-pg` ficam exatos em `7.10.1`. A `latest` do `prisma` é uma pré-versão 8.
- A `latest` já está em outra versão principal para `typescript`, `vite`, `vitest`, `eslint`, `msw`, `@nestjs/*`, `jest` e `tsup`: instalar sempre com a faixa da tabela.
- ESLint 9 aparece como sem suporte no npm. Mantido porque o `eslint-plugin-jsx-a11y` 6 não aceita o 10.
- pnpm 10: scripts de build liberados em `allowBuilds`; `vite` preso por `overrides`. A auditoria no CI roda com pnpm 11 via `dlx`, porque o `pnpm audit` do 10 usa um endpoint que o npm está aposentando.
- API em CommonJS (`module: commonjs`, `moduleResolution: node10`); `shared` publica ESM e CJS. Os scripts da raiz geram `shared` e o client do Prisma antes dos portões (`pnpm run codegen`).

## Estrutura
```
apps/api/src/<módulo>/{<módulo>.module,controller,service}.ts   testes: *.spec.ts ao lado; integração: apps/api/test/*.int-spec.ts
apps/api/prisma/{schema.prisma,migrations/}
apps/web/src/{app,pages,features/<área>,components/ui,components/env,lib}   testes: *.test.tsx ao lado
packages/shared/src/{<área>.ts,index.ts}                        testes: *.test.ts ao lado
e2e/*.spec.ts · playwright.config.ts na raiz
```
Pacotes: `@env/web`, `@env/api`, `@env/shared`.

## Ambiente local
- API em `http://localhost:3333`, web em `http://localhost:5173`, Supabase local em `54321`, Postgres em `54322`.
- Desenvolvimento usa o banco `postgres`; testes de integração e e2e usam o banco `env_test`, para não apagar dados de desenvolvimento.
- Requer Docker Desktop em execução.

## API
- Sem prefixo global. JSON. Datas em ISO 8601 UTC.
- Toda entrada validada por `ZodValidationPipe(schema)` com schema de `@env/shared`.
- Erro: `{ code: ErrorCode; message: string; fields?: Record<string, string> }`, mensagem em português.

```ts
type ErrorCode =
  | 'VALIDATION' | 'UNAUTHENTICATED' | 'NOT_INVITED' | 'FORBIDDEN' | 'NOT_FOUND'
  | 'CONFLICT' | 'VERSION_CONFLICT' | 'STATE_CHANGED' | 'RATE_LIMITED' | 'INTERNAL';
// 400, 401, 403, 403, 404, 409, 409, 409, 429, 500
class AppError extends Error { constructor(code: ErrorCode, message: string, fields?: Record<string,string>) }
```
- Recurso de outra equipe responde `NOT_FOUND`, nunca `FORBIDDEN`.
- Serviços recebem `teamId` explicitamente; nenhuma consulta de negócio sem ele.
- Serviços que dependem de tempo recebem `Clock { now(): Date }` por injeção.

## Banco
- Ids `uuid`. Tabelas e colunas em `snake_case` via `@map`/`@@map`.
- **Toda migração que cria tabela** termina com `ALTER TABLE "<tabela>" ENABLE ROW LEVEL SECURITY;`.
- Índices parciais são escritos em SQL na migração.

## Web
- `apiFetch<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T>` em `lib/api.ts` anexa o token e lança `ApiError { status, code, message, fields? }`.
- Chaves do React Query em `lib/queryKeys.ts`.
- Testes de tela usam msw; consultas por papel e nome acessível.
- Cada biblioteca é instalada na primeira história que a usa.

### Estado
- **Servidor:** só React Query (`useQuery`, `useMutation`). Não copiar a resposta para `useState` ou Zustand.
- **Formulários:** React Hook Form com `zodResolver(schema)` de `@env/shared`. `register` em inputs; `Controller` em `Select`, `Switch` e `ChipRadioGroup`. Os `fields` do `ApiError` vão para o campo com `applyApiErrors(error, setError)` em `lib/forms.ts`.
- **Global do navegador:** Zustand, um store pequeno por assunto, com seletores. Token e sessão ficam com o `supabase-js`.
- **URL:** nuqs, com os parsers em `lib/urlState.ts`; valor desconhecido cai no padrão. Testes com `NuqsTestingAdapter`.

## Segurança
- Schemas de entrada têm tamanho máximo em todo texto e lista.
- Logs nunca incluem `Authorization`, tokens, e-mails ou corpo de requisição.
- `dangerouslySetInnerHTML` é proibido (regra de lint).
- Variáveis `VITE_*` vão para o navegador: nunca colocar segredo nelas.

## Rotas da API (visão geral)
| História | Rotas |
|---|---|
| 01 | `GET /health` |
| 03 | `GET /me`, `POST /team` |
| 04 | `GET /members`, `POST /invites`, `DELETE /invites/:id`, `PATCH /members/:id`, `DELETE /members/:id` |
| 05 | `GET/POST /projects`, `PATCH /projects/:project`, `POST /projects/:project/archive` |
| 06 | `.../services`, `.../services/order`, `.../environments`, `.../rules` |
| 07 | `GET /projects/:project/board` |
| 08 | `PATCH /projects/:project/environments/:env/details` |
| 09 | `POST .../environments/:env/reservation`, `POST .../environments/:env/release` |
| 10 | `POST .../environments/:env/block`, `POST .../environments/:env/unblock` |
| 11 | `GET /projects/:project/events` |

`:project` e `:env` são slugs, resolvidos dentro da equipe.
