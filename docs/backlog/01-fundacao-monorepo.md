# 01 — Fundação do monorepo

**Estado:** a fazer · **Depende de:** — · **Spec:** §5

Como desenvolvedor, quero o monorepo funcionando de ponta a ponta para as próximas histórias começarem sobre uma base verificada.

## Critérios de aceite
- [ ] `pnpm install` na raiz instala `apps/web`, `apps/api` e `packages/shared`.
- [ ] `pnpm dev` sobe web e API juntos.
- [ ] `GET /health` responde 200 e informa se o banco está acessível.
- [ ] A tela inicial do web consome `/health` usando um tipo de `packages/shared`.
- [ ] Supabase local sobe com um comando; Prisma tem a primeira migração.
- [ ] `lint`, `typecheck`, `test`, `test:e2e` e `build` rodam na raiz e passam, cada um com ao menos um teste real.
- [ ] GitHub Actions roda os cinco portões em cada PR.
- [ ] `.env.example` em cada app; a API falha na partida com mensagem clara se faltar variável.
- [ ] README explica pré-requisitos e como rodar no Windows.
- [ ] A API envia os cabeçalhos de segurança do `helmet` e não registra dados sensíveis em log.
- [ ] O CI procura segredos e vulnerabilidades, com permissão só de leitura; o Dependabot está configurado.

## Notas técnicas
- TypeScript estrito em todos os pacotes.
- Verificar a documentação atual das versões instaladas de Vite, Tailwind v4, NestJS, Prisma e Supabase CLI antes de configurar.

## Fora de escopo
Autenticação, telas do produto, publicação.

## Plano de implementação

**Pré-requisito:** Docker Desktop em execução. Convenções e versões: `docs/superpowers/plans/2026-11-26-env-fase1-convencoes.md`.

**Ordem:** Tarefa 1 (contrato) primeiro. Depois, Tarefas 2 e 3 (back, nesta ordem) podem correr em paralelo com a Tarefa 4 (front). A Tarefa 5 fecha. Back e front mexem no mesmo `pnpm-lock.yaml`: rodar `pnpm add` um de cada vez.

### Instalação (vale para todas as tarefas)
- Nunca `pnpm add <pacote>` sem versão: o `latest` do npm já está em outra versão principal para `typescript`, `vite`, `vitest`, `eslint`, `@eslint/js`, `msw`, `@nestjs/*`, `jest`, `tsup`, `supabase` e `prisma` (este é uma pré-versão 8). Usar a faixa da tabela das convenções.
- `prisma`, `@prisma/client`, `@prisma/adapter-pg` (`7.10.1`) e `supabase` (`2.122.1`) ficam **exatos**, sem `^`.
- Cada pacote declara o que importa (pnpm não expõe dependência transitiva).
- Se o `pnpm install` falhar por `minimumReleaseAge`, escolher uma versão mais antiga dentro da mesma faixa. Não criar `minimumReleaseAgeExclude` nem baixar o prazo sem perguntar ao usuário.
- Se aparecer aviso de script de build ignorado, avaliar o pacote e registrá-lo em `allowBuilds` (`true` ou `false`), citando no PR.

### Tarefa 1 — Workspace e `shared` [back]
**Arquivos e responsabilidades:**
- `package.json` (raiz): `private`, `packageManager: pnpm@10.33.0`, `engines.node: >=22.14`, scripts e ferramentas comuns (`typescript`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks`, `globals`, `prettier`, `@types/node`).
- `pnpm-workspace.yaml`:
  ```yaml
  packages: ['apps/*', 'packages/*']
  minimumReleaseAge: 4320        # só instala versões com 3 dias de publicadas
  allowBuilds:                   # pnpm 10 não roda scripts de dependências sem permissão
    esbuild: true
    prisma: true
    '@prisma/engines': true
    msw: false                   # o script só serve ao worker de navegador, que não usamos
  overrides:
    vite: ~7.3.0                 # sem isto o Vitest pode puxar o Vite 8
  ```
- `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `target ES2022`, `esModuleInterop`, `skipLibCheck`. `module` e `moduleResolution` ficam em cada pacote.
- `eslint.config.mjs`: flat config; `tseslint.configs.recommended` (sem regras com tipos, para o lint não depender de build); para `apps/web`, `reactHooks.configs.flat.recommended` e `jsxA11y.flatConfigs.recommended`; ignora `**/dist/**`, `**/coverage/**`, `apps/api/src/generated/**`, `playwright-report/**`, `test-results/**`, `docs/**`.
- `.prettierrc`; `.gitignore` ganha `apps/api/src/generated/`.
- `packages/shared/{package.json,tsconfig.json,tsup.config.ts,vitest.config.ts,src/{index.ts,health.ts,health.test.ts,errors.ts,errors.test.ts}}`
- `docs/adr/0001-api-commonjs-shared-duplo.md`: por que a API é CommonJS (NestJS 11 + Jest; o NestJS 12, só ESM, ficou fora) e `shared` gera as duas saídas.

**Contrato (produz):**
- `healthSchema = z.object({ status: z.literal('ok'), database: z.enum(['up','down']) })`; `type Health`.
- `errorCodeSchema = z.enum([...])` com os códigos das convenções; `type ErrorCode`.
- `apiErrorSchema = z.object({ code: errorCodeSchema, message: z.string(), fields: z.record(z.string(), z.string()).optional() })`; `type ApiErrorBody`.

**`packages/shared`:** `"type": "module"`; tsup com `format: ['esm','cjs']`, `dts: true` e `clean: !options.watch` (limpar em watch apagaria o `dist` que a API e o web estão lendo). `package.json` com `exports["."].import` (`types: ./dist/index.d.ts`, `default: ./dist/index.js`) e `.require` (`types: ./dist/index.d.cts`, `default: ./dist/index.cjs`), **mais** `main: ./dist/index.cjs` e `types: ./dist/index.d.ts`, porque a API resolve com `moduleResolution: node10`, que ignora `exports`. `zod` em `dependencies`. Scripts `build`, `dev` (`tsup --watch`), `typecheck`, `test` (`vitest run`).

**Scripts na raiz (primeira versão):** `codegen` (`pnpm --filter @env/shared build`), `lint` (`eslint .`), `typecheck` (`pnpm run codegen && pnpm -r run typecheck`), `test` e `build` (mesmo padrão com `pnpm -r run ...`).

- [x] Teste `healthSchema aceita database up e down e rejeita outro valor`.
- [x] Teste `apiErrorSchema aceita erro com e sem fields e rejeita code desconhecido`.
- [x] O lint recusa `dangerouslySetInnerHTML` (`no-restricted-syntax` com seletor `JSXAttribute[name.name='dangerouslySetInnerHTML']`). Conferir com um arquivo temporário, que não é commitado.
- [x] Implementar; `pnpm --filter @env/shared build` gera `index.js`, `index.cjs`, `index.d.ts` e `index.d.cts`.
- [x] `pnpm install` termina sem aviso de script de build ignorado e `pnpm why vite` mostra só a 7.3.
- [ ] Commit `chore: monorepo pnpm com pacote shared`.

### Tarefa 2 — Supabase local e Prisma [back]
**Arquivos e responsabilidades:**
- `supabase/config.toml` e `supabase/.gitignore` (via `pnpm exec supabase init`; responder "não" a perguntas de editor). Ajustes: `project_id = "dotenv"`; `enabled = false` em `[analytics]` (no Windows exigiria expor o daemon do Docker sem TLS), `[realtime]`, `[storage]` e `[edge_runtime]` (não usados). Portas padrão mantidas.
- `apps/api/package.json` (`@env/api`, **sem** `"type": "module"`): `@prisma/client` e `@prisma/adapter-pg` em `dependencies`, `prisma` em dev, `dotenv` em `dependencies`; script `generate` (`prisma generate`).
- `apps/api/.env.example` (começa com `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`, credencial padrão do Supabase local).
- `apps/api/prisma/schema.prisma`:
  ```prisma
  generator client {
    provider     = "prisma-client"
    output       = "../src/generated/prisma"
    moduleFormat = "cjs"
    importFileExtension = "js" // ajustado na Tarefa 3: o padrão sem tsconfig era `.ts`, que não roda compilado
  }
  datasource db {
    provider = "postgresql"
  }
  ```
- `apps/api/prisma.config.ts`: primeira linha `import 'dotenv/config'`; `defineConfig` com `schema`, `migrations.path` e `datasource.url: process.env.DATABASE_URL ?? ''`. **Não usar `env('DATABASE_URL')`:** ele faria o `prisma generate` falhar no CI, que não tem `.env`. O Prisma 7.10 também procura `prisma7.config.ts`; `prisma.config.ts` continua aceito.
- `apps/api/prisma/migrations/0_init/migration.sql` e `migrations/migration_lock.toml` (`provider = "postgresql"`).
  ```sql
  ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  ```
  O `IF EXISTS` é para o banco sombra do `migrate dev`, onde a tabela pode não existir. Se o Prisma ainda assim recusar, usar uma tabela mínima com RLS e registrar o motivo.
- `scripts/db-test-setup.mjs`: usa `pg` (devDependency da raiz) para criar `env_test` se não existir e roda `pnpm --filter @env/api exec prisma migrate deploy` com `DATABASE_URL` apontando para ele. URL: `TEST_DATABASE_URL` ou o padrão `postgresql://postgres:postgres@127.0.0.1:54322/env_test`. Recusa banco cujo nome não termine em `_test`.

**Scripts na raiz:** `db:start` (`supabase start`), `db:stop` (`supabase stop`), `db:migrate` (`pnpm --filter @env/api exec prisma migrate dev && pnpm --filter @env/api run generate`; o Prisma 7 não gera o client sozinho), `db:test:setup` (`node scripts/db-test-setup.mjs`). `codegen` passa a incluir `&& pnpm --filter @env/api run generate`. `supabase` é devDependency da raiz (a 2.x baixa o binário por `optionalDependencies`, sem script de instalação).

- [x] Com `apps/api/.env` copiado do exemplo: `pnpm db:start && pnpm db:migrate && pnpm db:test:setup` termina sem erro, também na segunda execução.
- [x] `pnpm --filter @env/api run generate` funciona sem `.env` e sem `DATABASE_URL`.
- [ ] Commit `chore: supabase local e prisma`.

### Tarefa 3 — API com `/health` [back]
**Arquivos e responsabilidades** (em `apps/api`):
- `src/main.ts`: primeira linha `import 'dotenv/config'` (o Nest não lê `.env`); chama `loadEnv` antes de criar o app, para falhar com mensagem clara; `configureApp`; `enableShutdownHooks`; escuta em `PORT`.
- `src/app.setup.ts`: `configureApp(app, env)` liga `helmet` e CORS. Usado por `main.ts` **e** pelos int-specs, para testar a mesma configuração.
- `src/app.module.ts`: módulos e `APP_FILTER` com o `ErrorFilter`.
- `src/config/{env.ts,env.module.ts}`: `loadEnv` com Zod; módulo global que fornece o token `ENV`.
- `src/prisma/{prisma.module,prisma.service}.ts`: `PrismaService extends PrismaClient` com `new PrismaPg({ connectionString, connectionTimeoutMillis: 3000 })`; importa de `../generated/prisma/client`; **sem** `$connect()` na partida (a API sobe com o banco fora e o `/health` informa); `$disconnect` ao encerrar.
- `src/health/{health.module,health.controller,health.service}.ts`: `SELECT 1` via `$queryRaw`.
- `src/common/{app-error.ts,error.filter.ts,zod.pipe.ts,clock.ts,common.module.ts}`.
- `package.json` (scripts `dev` = `nest start --watch`, `build` = `nest build`, `start` = `node dist/main.js`, `typecheck`, `test` = `jest --runInBand`), `nest-cli.json`, `tsconfig.json`, `tsconfig.build.json`, `jest.config.cjs`, `test/env.setup.ts`, `.env.example` completo.

**Configuração que não pode faltar:**
- `tsconfig.json`: `module: "commonjs"`, `moduleResolution: "node10"`, `experimentalDecorators`, `emitDecoratorMetadata`; inclui `src`, `test` e `prisma.config.ts`.
- `tsconfig.build.json`: `rootDir: "src"`, `outDir: "dist"`, inclui só `src`, exclui `**/*.spec.ts`. Sem isso a saída vira `dist/src/main.js`.
- Jest: `ts-jest`, `testEnvironment: 'node'`, `testMatch` para `src/**/*.spec.ts` e `test/**/*.int-spec.ts`, `moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }` (o client gerado importa com `.js`). O `module: commonjs` faz os `import()` do Prisma virarem `require`; se ainda aparecer erro de `--experimental-vm-modules`, rodar o Jest por `node --experimental-vm-modules node_modules/jest/bin/jest.js` e registrar no PR.
- `test/env.setup.ts` (em `setupFiles`): **sempre** sobrescreve `DATABASE_URL` com `TEST_DATABASE_URL` ou o padrão de `env_test`, e define `WEB_ORIGIN`. O CI não tem `.env`, e teste nunca pode tocar o banco de desenvolvimento.

**Contrato (produz):**
- `GET /health` → 200 `Health`, com o banco acessível ou não.
- `loadEnv(source: NodeJS.ProcessEnv): Env` com `PORT` (padrão 3333), `DATABASE_URL`, `WEB_ORIGIN` (URL). A mensagem de erro cita os nomes das variáveis, nunca os valores.
- `AppError`, `ErrorFilter`, `ZodValidationPipe`, `CLOCK`/`Clock`, conforme as convenções. Em `fields`, a chave é o caminho unido por ponto (`_` quando o erro é na raiz).
- `ErrorFilter`: `AppError` → status do código; erro HTTP do próprio Nest ou do parser de corpo → 404 vira `NOT_FOUND`, demais 4xx viram `VALIDATION` mantendo o status, com mensagem em português; resto → 500 `INTERNAL`.
- Log de erro desconhecido: método, caminho sem query string, nome do erro e as linhas de pilha **sem** a mensagem (mensagens do Prisma podem trazer valores). Nunca cabeçalhos ou corpo.

- [x] `env.spec` `loadEnv cita as variáveis ausentes`: `loadEnv({})` lança erro cuja mensagem contém `DATABASE_URL` e `WEB_ORIGIN`; e `usa a porta 3333 por padrão`.
- [x] `error.filter.spec`: `AppError('NOT_FOUND', …)` vira 404 com `{code,message}`; erro desconhecido vira 500 `INTERNAL` sem vazar a mensagem original.
- [x] `error.filter.spec`: o erro desconhecido é registrado sem cabeçalhos, corpo, query string nem a mensagem original.
- [x] `zod.pipe.spec`: entrada inválida vira `AppError` `VALIDATION` com `fields` por caminho.
- [x] `health.int-spec`: `GET /health` → 200 `{status:'ok',database:'up'}` contra o `env_test`; com o `PrismaService` substituído por um que falha → 200 `database:'down'`.
- [x] `health.int-spec`: `Access-Control-Allow-Origin` é sempre `WEB_ORIGIN`, mesmo com outro `Origin`.
- [x] `health.int-spec`: `/health` traz `content-security-policy`, `strict-transport-security` e `x-content-type-options: nosniff`, e não traz `x-powered-by`.
- [x] `errors.int-spec`: rota inexistente → 404 `NOT_FOUND`; JSON malformado → 400 `VALIDATION`.
- [x] `db.int-spec`: `_prisma_migrations` está com RLS ligado (`pg_class.relrowsecurity`).
- [x] `pnpm --filter @env/api build` e, com o `.env`, `pnpm --filter @env/api start` respondem `/health` com `database: 'up'` (confirma o client Prisma em CommonJS fora do Jest).
- [ ] Commit `feat(api): endpoint de saúde e tratamento de erros`.

### Tarefa 4 — Web consumindo `/health` [front]
**Arquivos e responsabilidades** (em `apps/web`):
- `package.json` (`@env/web`, `"type": "module"`; `@env/shared` como `workspace:*`; `zod`; scripts `dev` = `vite --port 5173 --strictPort`, `build` = `tsc --noEmit && vite build`, `typecheck`, `test` = `vitest run`).
- `index.html` (`lang="pt-BR"`), `vite.config.ts` (plugins `@vitejs/plugin-react` e `@tailwindcss/vite`), `tsconfig.json` (`module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `types: ['vite/client']`).
- `vitest.config.ts`: ambiente `jsdom`, `env.VITE_API_URL: 'http://localhost:3333'`, `setupFiles: ['src/test/setup.ts']`.
- `src/test/setup.ts`: `@testing-library/jest-dom/vitest`, `cleanup` e servidor `msw/node` com `onUnhandledRequest: 'error'`.
- `.env.example`: `VITE_API_URL=http://localhost:3333` (vai para o navegador: sem segredos).
- `src/main.tsx` (`QueryClientProvider`), `src/index.css` (`@import "tailwindcss";`; tokens e fontes são da história 02, sem hex solto).
- `src/lib/{env.ts,api.ts,queryKeys.ts}`: `env.ts` valida `VITE_API_URL` com Zod; `queryKeys.health`.
- `src/pages/StatusPage.tsx` e `StatusPage.test.tsx`; `src/lib/api.test.ts`.
- Dependências de teste: `vitest`, `jsdom`, `@testing-library/{react,dom,user-event,jest-dom}`, `msw`.

**Contrato:** consome `healthSchema`, `Health`, `apiErrorSchema` e `ErrorCode`. Produz `apiFetch<T>(path, schema, init?)` e `ApiError { status, code, message, fields? }` (sem token até a história 03). Falha de rede → `status 0`, `code 'INTERNAL'`. Resposta fora do contrato (erro sem o formato, ou sucesso que o schema recusa) → `ApiError` com o status HTTP e `code 'INTERNAL'`.

**Tela:** carregando "Consultando a API…"; sucesso "API no ar" com "Banco conectado" ou "Banco indisponível"; falha com `role="alert"` e botão "Tentar de novo" (altura mínima de 44px) que chama `refetch`. Nos testes, `retry: false`.

- [ ] `api.test`: `resposta de erro vira ApiError com status e code`; `falha de rede vira ApiError com status 0`; `resposta fora do contrato vira ApiError INTERNAL`.
- [ ] `StatusPage.test`: `mostra a API no ar e o banco conectado`; `mostra banco indisponível quando database é down`; `com a API fora, mostra alerta e Tentar de novo refaz a consulta`.
- [ ] Commit `feat(web): tela inicial consultando a api`.

### Tarefa 5 — Portões, e2e, CI e README [back]
**Arquivos e responsabilidades:**
- `playwright.config.ts`, `e2e/health.spec.ts`, `tsconfig.e2e.json` (typecheck dos dois); `@playwright/test` na raiz.
- `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`, scripts na raiz.

**Scripts finais:**

| Script | Comando |
|---|---|
| `dev` | `pnpm run codegen && pnpm -r --parallel run dev` |
| `lint` | `eslint .` |
| `typecheck` | `pnpm run codegen && tsc --noEmit -p tsconfig.e2e.json && pnpm -r run typecheck` |
| `test` | `pnpm run codegen && pnpm -r run test` (unidade e integração) |
| `test:e2e` | `pnpm run codegen && playwright test` |
| `build` | `pnpm run codegen && pnpm -r run build` |

O `codegen` existe porque, num clone novo, o `dist` de `shared` e o client do Prisma não existem, e o `test:e2e` roda antes do `build`.

**Playwright:** só Chromium; `baseURL http://localhost:5173`; dois itens em `webServer`, ambos com `reuseExistingServer: false` (reaproveitar um `pnpm dev` aberto rodaria o e2e no banco de desenvolvimento):
- API: `pnpm --filter @env/api exec nest start`, `url http://localhost:3333/health`, `env` com `PORT=3333`, `DATABASE_URL` do `env_test` e `WEB_ORIGIN=http://localhost:5173`;
- web: `pnpm --filter @env/web run dev`, `url http://localhost:5173`, `env` com `VITE_API_URL=http://localhost:3333`.

**CI** (`runs-on: ubuntu-24.04`; `pull_request` e push na `main`; `permissions: contents: read`; sem segredos). Actions fixadas por SHA, com a versão em comentário:
- `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1` (v7.0.1), com `fetch-depth: 0` e `persist-credentials: false`;
- `actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1` (v7.1.0), com `node-version: 22.14.0` e `package-manager-cache: false`;
- pnpm via `corepack enable` (lê o `packageManager`; dispensa action de terceiro).

Passos, em ordem:
1. checkout;
2. `gitleaks` 8.30.1: baixar `https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz` em `$RUNNER_TEMP`, conferir o SHA-256 `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` e rodar `gitleaks git --redact .`;
3. setup-node, `corepack enable`, `pnpm install --frozen-lockfile`;
4. auditoria: `pnpm dlx pnpm@11.28.0 --pm-on-fail=ignore audit --prod --audit-level high`. O `pnpm audit` do pnpm 10 usa um endpoint que o npm está aposentando (erro 410) e a correção só saiu no pnpm 11; o projeto continua no 10. Não usar `--ignore-registry-errors`;
5. `pnpm db:start`, `pnpm db:test:setup`;
6. `pnpm exec playwright install --with-deps chromium`;
7. `pnpm lint`, `typecheck`, `test`, `test:e2e`, `build`.

**Dependabot:** `npm` (diretório `/`, cobre o workspace) e `github-actions`, semanal, `cooldown.default-days: 3` (alinhado ao `minimumReleaseAge`) e `ignore` de `version-update:semver-major` para `dependency-name: "*"`.

**README (PowerShell):** pré-requisitos (Node 22.14, pnpm 10.33, Docker Desktop em execução); primeira execução: `pnpm install`, `Copy-Item apps/api/.env.example apps/api/.env`, o mesmo para `apps/web`, `pnpm db:start`, `pnpm db:migrate`, `pnpm db:test:setup`, `pnpm exec playwright install chromium`, `pnpm dev`; scripts; avisos: fechar o `pnpm dev` antes do e2e; `pnpm test` exige o Supabase ligado; se uma porta falhar, conferir `netsh interface ipv4 show excludedportrange protocol=tcp`. Atualizar a linha "Estado".

- [ ] e2e `a tela inicial mostra a API e o banco conectados`.
- [ ] CI conforme acima.
- [ ] Rodar localmente o comando de auditoria e anotar o resultado no PR. Vulnerabilidade alta sem correção dentro das faixas: parar e perguntar.
- [ ] `dependabot.yml`.
- [x] Orquestrador: conferir se secret scanning e push protection estão ligados no repositório (ligados, junto com os alertas e correções de segurança do Dependabot).
- [ ] README.
- [ ] Os cinco portões passam localmente (inclusive num estado limpo, sem `dist` e sem `src/generated`) e no PR.
- [ ] Commit `ci: portões de qualidade e guia de execução`.
