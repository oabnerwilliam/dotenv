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

**Pré-requisito:** Docker Desktop em execução. Convenções: `docs/superpowers/plans/2026-11-26-env-fase1-convencoes.md`.

### Tarefa 1 — Workspace e `shared` [back]
**Arquivos:** `package.json` (`packageManager: pnpm@10.33.0`, `engines.node: >=22.14`), `pnpm-workspace.yaml`, `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`), `eslint.config.mjs`, `.prettierrc`, `packages/shared/{package.json,tsconfig.json,tsup.config.ts,vitest.config.ts,src/index.ts,src/health.ts,src/health.test.ts}`
**Produz:** `healthSchema = z.object({ status: z.literal('ok'), database: z.enum(['up','down']) })`; `type Health`. `shared` gera ESM e CJS com tipos (`exports` com `import` e `require`), pois a API é CommonJS e o web é ESM.
- [ ] `pnpm-workspace.yaml` com `minimumReleaseAge: 4320` (só instala versões com 3 dias de publicadas).
- [ ] O lint recusa `dangerouslySetInnerHTML` (`no-restricted-syntax` sobre o `JSXAttribute`).
- [ ] Teste `healthSchema aceita database up e down e rejeita outro valor`.
- [ ] Implementar; `pnpm --filter @env/shared build` gera as duas saídas e os `.d.ts`.
- [ ] Commit `chore: monorepo pnpm com pacote shared`.

### Tarefa 2 — Supabase local e Prisma [back]
**Arquivos:** `supabase/config.toml` (via `supabase init`), `apps/api/prisma/schema.prisma`, `apps/api/prisma.config.ts`, migração `0_init`, `scripts/db-test-setup.mjs`
**Detalhes:** gerador `prisma-client` com `output` em `src/generated/prisma` (ignorado no git) e formato CJS; adaptador `@prisma/adapter-pg`; `prisma.config.ts` carrega o `.env` e lê `DATABASE_URL`. A migração `0_init` só executa `ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;` (se o Prisma não permitir, usar uma tabela mínima e registrar o motivo).
**Scripts na raiz:** `db:start`, `db:stop`, `db:migrate`, `db:test:setup` (cria o banco `env_test` se não existir e aplica as migrações nele).
- [ ] `pnpm db:start && pnpm db:migrate && pnpm db:test:setup` termina sem erro, também na segunda execução.
- [ ] Commit `chore: supabase local e prisma`.

### Tarefa 3 — API com `/health` [back]
**Arquivos:** `apps/api/src/{main.ts,app.module.ts}`, `src/config/env.ts`, `src/prisma/{prisma.module,prisma.service}.ts`, `src/health/*`, `src/common/{app-error.ts,error.filter.ts,zod.pipe.ts,clock.ts}`, `packages/shared/src/errors.ts`, `apps/api/.env.example`, configs do Jest
**Produz:** `loadEnv(source: NodeJS.ProcessEnv): Env` com `PORT` (padrão 3333), `DATABASE_URL`, `WEB_ORIGIN`; `PrismaService`; `AppError`, `ErrorFilter`, `ZodValidationPipe`, `CLOCK`, conforme as convenções.
- [ ] `env.spec`: `loadEnv({})` lança erro cuja mensagem cita `DATABASE_URL` e `WEB_ORIGIN`.
- [ ] `error.filter.spec`: `AppError('NOT_FOUND', …)` vira 404 com `{code,message}`; erro desconhecido vira 500 `INTERNAL` sem vazar a mensagem original.
- [ ] `zod.pipe.spec`: entrada inválida vira 400 `VALIDATION` com `fields` por caminho.
- [ ] `health.int-spec`: `GET /health` → 200 `{status:'ok',database:'up'}`; com o Prisma falhando → 200 `database:'down'`.
- [ ] CORS restrito a `WEB_ORIGIN`.
- [ ] `helmet` ligado: int-spec confere os cabeçalhos em `/health`.
- [ ] `error.filter.spec`: o erro desconhecido é registrado sem cabeçalhos nem corpo da requisição.
- [ ] Commit `feat(api): endpoint de saúde e tratamento de erros`.

### Tarefa 4 — Web consumindo `/health` [front]
**Arquivos:** `apps/web/{index.html,vite.config.ts,vitest.config.ts,.env.example}`, `src/{main.tsx,index.css}`, `src/lib/{api.ts,env.ts,queryKeys.ts}`, `src/pages/StatusPage.tsx` e teste
**Produz:** `apiFetch` e `ApiError` (convenções); variável `VITE_API_URL`; `QueryClientProvider` em `main.tsx`, com a `StatusPage` usando `useQuery`.
- [ ] `api.test`: resposta de erro vira `ApiError` com `status` e `code`; falha de rede vira `ApiError` com `status 0`.
- [ ] `StatusPage.test`: mostra "API no ar" e "Banco conectado"; com a API fora, mostra alerta com "Tentar de novo".
- [ ] Commit `feat(web): tela inicial consultando a api`.

### Tarefa 5 — Portões, e2e, CI e README [back]
**Arquivos:** `playwright.config.ts`, `e2e/health.spec.ts`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `README.md`, scripts na raiz
**Scripts:** `dev` (web e API em paralelo, `shared` em watch), `lint`, `typecheck`, `test` (unidade e integração), `test:e2e`, `build`. O `playwright.config` sobe a API (apontando para `env_test`) e o web.
- [ ] e2e `a tela inicial mostra a API e o banco conectados`.
- [ ] CI: Node 22, pnpm, `supabase start`, `db:test:setup`, cinco portões, em `pull_request` e push na `main`. Sem segredos.
- [ ] CI com `permissions: contents: read`, actions fixadas por SHA, `pnpm audit --prod --audit-level high` e `gitleaks` em versão fixa sobre o histórico completo (`fetch-depth: 0`).
- [ ] `dependabot.yml` para npm e GitHub Actions, ignorando versões principais.
- [ ] Orquestrador: conferir se secret scanning e push protection estão ligados no repositório; se não, pedir ao usuário.
- [ ] README: pré-requisitos, primeira execução no Windows, scripts.
- [ ] Os cinco portões passam localmente e no PR.
- [ ] Commit `ci: portões de qualidade e guia de execução`.
