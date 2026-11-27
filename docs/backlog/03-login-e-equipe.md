# 03 — Login e equipe

**Estado:** a fazer · **Depende de:** 02 · **Spec:** §5, §8 · **Telas:** `App-Login`, `App-Onb-Empresa`, `App-Sem-Permissao`

Como dono do app, quero entrar com Google e criar minha equipe, sem que desconhecidos acessem nada.

## Critérios de aceite
- [ ] A tela de login tem só "Continuar com Google" e funciona via Supabase Auth.
- [ ] A API recusa com 401 token ausente, expirado, de outro emissor ou com assinatura inválida.
- [ ] E-mail não verificado é recusado.
- [ ] Sem equipe existente, só o `OWNER_EMAIL` pode criá-la (nome, slug, primeiro projeto) e vira admin.
- [ ] Duas tentativas simultâneas de criar a primeira equipe resultam em uma só.
- [ ] Quem não é membro nem convidado vê "sem permissão", com opção de sair.
- [ ] Rotas protegidas levam ao login; sessão expirada também.
- [ ] RLS ligado em todas as tabelas, com teste provando que a chave pública não lê nada.
- [ ] Toda rota de negócio passa por um guard que resolve a equipe do usuário.
- [ ] Testes usam tokens assinados localmente, sem depender do Google.
- [ ] `docs/operacao/google-oauth.md` guia a criação das credenciais.
- [ ] O login usa PKCE e só retorna para URLs cadastradas.
- [ ] Excesso de requisições do mesmo IP recebe 429 com mensagem em português.
- [ ] Os papéis `anon` e `authenticated` não têm acesso às tabelas.
- [ ] Sair limpa os dados em cache no navegador.

## Notas técnicas
- Tabelas: Team, User, Membership, Invite (spec §6). Comparar e-mails normalizados (sem espaços, minúsculos).
- Validar o JWT pelas chaves públicas (JWKS) do Supabase.

## Fora de escopo
Tela de convites (04), CRUD de projetos (05), login com GitHub.

## Plano de implementação

Conferido contra a `main` (`cdcf35b`) em 2026-11-27. Convenções: `docs/superpowers/plans/2026-11-26-env-fase1-convencoes.md`.

**Pré-requisitos:** Docker Desktop em execução e só este Supabase local ligado (as portas conflitam com outros projetos locais).

**Ordem:** T0 (designer) e T1 (`shared`) primeiro. Depois T2 a T4 (back, em sequência) em paralelo com T5 a T7 (front, em sequência). T8 fecha. Back e front mexem no mesmo `pnpm-lock.yaml`: rodar `pnpm add` um de cada vez.

### Decisão de segurança
Registrada em [`docs/adr/0002-identidade-pelo-supabase.md`](../adr/0002-identidade-pelo-supabase.md). O `user_metadata` do token pode ser editado pelo próprio usuário e **não** serve para provar e-mail. A API usa o token só para saber *quem é* (`sub`) e exige `app_metadata.provider = google`. O e-mail, usado ao criar a equipe ou aceitar convite, é lido no Supabase com a chave secreta, a partir da identidade Google verificada. Nome e avatar vêm do `user_metadata` apenas para exibição.

### Ponto de partida na `main`
- API: existem `AppError`, `ErrorFilter` (já mapeia `UNAUTHENTICATED`, `NOT_INVITED`, `RATE_LIMITED`), `ZodValidationPipe`, `CLOCK`, `PrismaService` (sem `statement_timeout`), `configureApp` (CORS com origem fixa) e `loadEnv`. O schema do Prisma não tem modelos; há só a migração `0_init`. `test/rls.int-spec.ts` já confere RLS ligado e ausência de políticas: **estender**, não recriar.
- `shared`: `errors`, `health`, `status`. Nenhum código de erro novo é necessário.
- Web: sem router, sem React Hook Form, sem Supabase. `main.tsx` escolhe a vitrine pelo `pathname`; `/` é a `StatusPage`, usada por `e2e/health.spec.ts` e `e2e/tema.spec.ts`. Componentes prontos: `Button` (`variant="accent" prompt`), `Field`, `Banner`, `EmptyState`, `Skeleton`. Classes `.scanline`, `.accent-line` e `.cursor-blink` já estão no `index.css`. `TERMO_EQUIPE` está em `lib/termos.ts`.
- `supabase/config.toml`: `site_url = "http://127.0.0.1:3000"` (defasado) e sem `[auth.external.google]`.
- CI: prepara só o `env_test`; não há `.env`.

### Ajustes ao plano original (decisões técnicas, citar no PR)
- **Sem `signing_keys_path`.** O CLI 2.122.1 já usa por padrão uma chave ES256 embutida (`apps/cli-go/pkg/config/config.go`, `NewConfig`). Não gerar nem versionar arquivo de chave. Conferir na T3: `http://127.0.0.1:54321/auth/v1/.well-known/jwks.json` devolve uma chave `ES256`. Se não devolver, usar `supabase gen signing-key` com arquivo ignorado pelo Git e avisar.
- **`SUPABASE_URL` é `http://127.0.0.1:54321`** (não `localhost`): o emissor do token é comparado texto a texto. Conferir o `iss` de um token real.
- **`jose` 6 é só ESM** e o Jest 29 não o carrega. Manter a versão e, no `jest.config.cjs`, transformar o pacote para CommonJS: `ts-jest` também em `.js` com `allowJs` e `transformIgnorePatterns` que libere `jose` dentro de `node_modules/.pnpm`. No `nest start` e no `start` compilado vale o `require(esm)` do Node 22.14 (um `ExperimentalWarning` é esperado; conferir os dois). Se não funcionar, parar e perguntar antes de descer para o `jose` 5.
- **E-mail no modo de teste:** a identidade `email` criada pela API administrativa fica com `email_verified: false` mesmo com `email_confirm`. Só com `AUTH_TEST_MODE`, o `IdentityVerifier` aceita a identidade `email` e usa `email_confirmed_at`. O plano anterior liberava o provider só no token, e o e2e nunca passaria do `not_invited`.
- **Limite por IP de verdade:** a chave padrão do `@nestjs/throttler` é por rota e IP. Sobrescrever `generateKey`. A exceção padrão (`ThrottlerException`) cairia no `ErrorFilter` como `VALIDATION`: sobrescrever `throwThrottlingException`.
- **`NODE_ENV=test` só no servidor da API** do `playwright.config`, não no processo do web.
- **Chaves locais do Supabase não são escritas no repositório** (o `gitleaks` pode acusá-las): testes e e2e as leem de `pnpm exec supabase status -o env` (`API_URL`, `PUBLISHABLE_KEY`, `SECRET_KEY`); nos `.env` locais o usuário cola os valores.
- **Prova com a chave pública:** o PostgREST local só enxerga o banco `postgres`, que o CI hoje não migra, e "sem linhas" passaria com banco vazio. O teste exige a recusa `42501` (permissão negada), e o CI ganha um passo de migração no `postgres`.
- **Conflito ao criar a equipe:** com uma equipe só, não existe conflito de slug em `POST /team`. O 409 significa "a equipe já existe", sem `fields`. O teste "conflito aparece no campo" virou "erros com `fields` aparecem no campo".
- **Slug do primeiro projeto** é derivado do nome (a tela do design não tem esse campo).
- **Destino após o login** fica em `sessionStorage` (a URL de retorno é uma lista fechada e a ida ao Google recarrega a página). Sem `nuqs` nem Zustand nesta história.
- **`useSignOut()`** no lugar de `signOut()` solto, porque precisa do `queryClient`.
- **Página provisória de projeto:** o `member` vai para `/p/:slug`, que só ganha conteúdo na 05. Sem ela não haveria onde clicar em "Sair".
- **`Logo` e `AuthLayout`** nascem aqui, em `app/layout/`; a 05 reaproveita o `Logo`.
- **e2e com `workers: 1`:** `resetDb()` apaga o banco compartilhado.

### Contratos (`packages/shared/src/{auth,team}.ts`)
```ts
roleSchema = z.enum(['admin', 'member']);    type Role
normalizeEmail(email: string): string        // trim + minúsculas
slugify(texto: string): string               // sem acento, minúsculo, hífens, sem hífen nas pontas, no máximo 40
slugSchema                                   // ^[a-z0-9]+(-[a-z0-9]+)*$, 2..40, mensagem em português
createTeamSchema = { name: trim 1..60; slug: slugSchema; project: { name: trim 1..60; slug: slugSchema } }
meSchema = z.discriminatedUnion('state', [
  { state:'member', user:{id,name,email,avatarUrl: string|null}, team:{id,name,slug}, role, defaultProjectSlug: string|null },
  { state:'needs_team', email }, { state:'not_invited', email } ])
type Me, CreateTeamInput
```

| Rota | Sucesso | Erros |
|---|---|---|
| `GET /health` | 200 `Health`, pública e sem limite | — |
| `GET /me` | 200 `Me` | 401 `UNAUTHENTICATED`, 429 `RATE_LIMITED` |
| `POST /team` (corpo `createTeamSchema`) | 201 `Me` (`state: 'member'`) | 400 `VALIDATION` (`fields`: `name`, `slug`, `project.name`, `project.slug`), 401, 403 `FORBIDDEN` (não é o dono ou e-mail não verificado), 409 `CONFLICT` (já existe equipe), 429 |
| qualquer rota de negócio | — | 403 `NOT_INVITED` (não membro), 403 `FORBIDDEN` (`@AdminOnly` com membro comum) |

Autenticação: `Authorization: Bearer <access_token>`. Mensagens: 401 "Sua sessão expirou. Entre novamente."; 429 "Muitas requisições. Aguarde um instante e tente de novo."

### Dependências
| Pacote | Faixa | Onde |
|---|---|---|
| `jose` | `^6` | api |
| `@nestjs/throttler` | `^6` | api |
| `@supabase/supabase-js` | `^2` | api, web e raiz (`devDependencies`, para o e2e) |
| `react-router` | `~7.18` | web |
| `react-hook-form`, `@hookform/resolvers` | tabela das convenções | web |
| `@types/pg` | `^8` | raiz (`devDependencies`) |

Conferir no npm a versão de `@hookform/resolvers` compatível com Zod 4 e corrigir a tabela das convenções se divergir. Se `minimumReleaseAge` recusar, usar versão anterior da mesma faixa. Conferir as assinaturas nos `.d.ts` instalados antes de usar.

### T0 — Telas da fase 1 [designer]
**Arquivos:** `docs/design/screens/{App-Login,App-Onb-Empresa,App-Sem-Permissao}.html`, `docs/design/docs/SCREENS.md`.
- [ ] Login só com "Continuar com Google"; sem e-mail, senha e links. Estados: redirecionando (botão desativado) e falha no retorno (faixa).
- [ ] Criar equipe sem o stepper; estados: erro no campo, enviando, faixa de erro geral. Ações "Criar equipe" e "Sair".
- [ ] Sem permissão fora da casca do app (ela só existe na 05), sem "Pedir acesso" e sem administradores: cadeado, `h1`, texto sobre a equipe, e-mail em uso e "Sair".
- [ ] Carregando a sessão, falha ao consultar `/me` ("Tentar de novo") e página provisória de projeto (nome da equipe e "Sair"). Desktop e 375px.
- [ ] Commit `docs(design): telas de acesso da fase 1`.

### T1 — Contratos em `shared` [back]
**Arquivos:** `packages/shared/src/{auth.ts,team.ts,index.ts}`, `src/__tests__/{auth,team}.test.ts`.
- [x] `auth.test` `normalizeEmail tira espaços e usa minúsculas`.
- [x] `team.test` `slugify`: "Estúdio Órion!" vira `estudio-orion`; texto longo é cortado em 40 sem hífen no fim; só símbolos vira `''`.
- [x] `team.test` `slugSchema` aceita `acme-2` e recusa maiúsculas, espaços, hífen nas pontas, 1 e 41 caracteres.
- [x] `team.test` `createTeamSchema` apara espaços e aponta o caminho do erro (`project.name`).
- [x] `auth.test` `meSchema` aceita os três estados e recusa estado desconhecido.
- [ ] Commit `feat(shared): contratos de acesso e equipe`.

### T2 — Schema e acesso ao banco [back]
**Arquivos:** `apps/api/prisma/schema.prisma`, migração `auth_equipe` (`prisma migrate dev --create-only`, depois editar o SQL), `test/rls.int-spec.ts`, `test/support/supabase-status.ts`, `.github/workflows/ci.yml`.

**Modelos** (ids `uuid`; tabelas e colunas em `snake_case` com `@map`/`@@map`; enums `Role`, `InviteStatus`, `DefaultDuration`):
- `Team(id, name, slug unique, singleton Boolean default true, createdAt)` com índice único parcial `(singleton) WHERE singleton`: uma só equipe na fase 1, e testes podem criar outra com `singleton false`.
- `User(id, supabaseId unique, email unique, name, avatarUrl?)`.
- `Membership(id, teamId, userId unique, role, createdAt)`.
- `Invite(id, teamId, email, role, status 'pending'|'accepted'|'canceled' default 'pending', invitedById (User), createdAt)` com índice único parcial `(team_id, email) WHERE status='pending'`.
- `Project(id, teamId, name, slug, ticketRegex default '[A-Z]+-\d+', defaultDuration 'H4'|'D1'|'D3'|'UNTIL_RELEASED' default 'D1', validateConsistency default true, archivedAt?, createdAt)` único `(teamId, slug)`.

Os índices parciais são escritos em SQL, **sem** o preview `partialIndexes`. Cada tabela nova recebe `ENABLE ROW LEVEL SECURITY`. A migração revoga de `anon` e `authenticated` o acesso a tabelas, sequências e funções do schema `public`, também nos privilégios padrão (`ALTER DEFAULT PRIVILEGES`). Esses papéis são criados pelo Supabase: um bloco `DO` só executa o `REVOKE` para o papel que existir (`pg_roles`), para também rodar num Postgres comum. O `EXECUTE` de funções vem também de `PUBLIC`: não há funções hoje, e a história que criar a primeira precisa revogá-lo.

- [ ] `rls.int-spec` (os dois testes atuais continuam) `anon e authenticated não têm concessão no banco de desenvolvimento`: conexão `pg` só de leitura no banco `postgres` (onde o Supabase concede por padrão; o `env_test` passaria sem a migração). Confere que as tabelas novas existem, que não há concessão de tabela ou sequência e que `pg_default_acl` do papel que migra não concede nada a eles no schema `public`.
- [ ] `rls.int-spec` `a chave pública não lê nenhuma tabela`: para cada tabela, `GET ${API_URL}/rest/v1/<tabela>` com a chave publicável responde 401 com código `42501`; tabela inexistente (404) faz o teste falhar. Ver falhar antes da migração com o `REVOKE`.
- [ ] CI: depois de `db:test:setup`, aplicar `prisma migrate deploy` no banco `postgres` (efêmero no CI). Localmente é o `pnpm db:migrate`.
- [ ] Depois da migração, um segundo `prisma migrate dev` não gera nada (o Prisma não tenta remover os índices parciais). Se tentar, parar e rever: há defeitos conhecidos com predicado booleano quando o preview está ligado.
- [ ] Commit `feat(api): modelos de equipe e acesso`.

### T3 — Token e limite de requisições [back]
**Arquivos:**
- `src/config/env.ts`, `src/config/__tests__/env.spec.ts`, `.env.example`, `test/env.setup.ts`, `playwright.config.ts`: `SUPABASE_URL` (http(s), sem barra no fim), `SUPABASE_SECRET_KEY`, `OWNER_EMAIL` (normalizado), `AUTH_TEST_MODE` (`'true'|'false'`, padrão `false`), `RATE_LIMIT_PER_MINUTE` (inteiro positivo, padrão 300). Os int-specs usam valores fictícios fixos e limite alto.
- `src/auth/{auth.module,auth.guard,token-verifier,identity-verifier,decorators}.ts` e `__tests__/`; `src/common/rate-limit.guard.ts`; `app.module.ts` (guards globais como `APP_GUARD`, na ordem limite, autenticação, equipe, registrados no mesmo módulo); `health.controller.ts` (`@Public()`, `@SkipThrottle()`); `jest.config.cjs`; `test/support/auth.ts`; `test/auth.int-spec.ts`.

**Produz:**
- `TokenVerifier.verify(token): Promise<{ supabaseId; name; avatarUrl: string|null }>` com `jwtVerify` do `jose`: JWKS de `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (provider injetável, para o teste usar `createLocalJWKSet`), emissor `${SUPABASE_URL}/auth/v1`, audiência `authenticated`, `algorithms: ['ES256','RS256']`, `requiredClaims: ['exp','sub']`. Nome: `full_name`, `name` ou "Sem nome", cortado em 120; avatar só se for URL `https`.
- Token ruim → `UNAUTHENTICATED`; JWKS ou Supabase indisponível → erro interno (500), nunca "sessão expirada".
- `IdentityVerifier.verifiedEmail(supabaseId): Promise<string|null>`, normalizado, via `auth.admin.getUserById` com a chave secreta (`persistSession: false`, `autoRefreshToken: false`).
- `AuthGuard` global, `@Public()`, `@CurrentAuth()`.
- `RateLimitGuard extends ThrottlerGuard`: uma contagem por IP para a API toda, `ttl` 60 000 ms, lança `AppError('RATE_LIMITED', …)`.

- [ ] `token-verifier.spec` (chaves geradas no teste): aceita token válido; recusa ausente, expirado, sem `exp`, outro emissor, outra audiência, assinatura errada, `alg: none`, HS256 e provider diferente de `google`.
- [ ] `token-verifier.spec`: `AUTH_TEST_MODE` aceita provider `email`; falha ao buscar as chaves não vira `UNAUTHENTICATED`.
- [ ] `identity-verifier.spec`: devolve e-mail só da identidade `google` com `email_verified: true`; `user_metadata` com outro e-mail é ignorado; no modo de teste aceita identidade `email` com `email_confirmed_at` e recusa sem ele.
- [ ] `env.spec`: cita as variáveis novas ausentes; `AUTH_TEST_MODE=true` **falha** com `NODE_ENV` diferente de `test`, inclusive ausente.
- [ ] `auth.int-spec`: rota protegida (controller de teste) sem token ou com token inválido → 401 `UNAUTHENTICATED`; `/health` segue público.
- [ ] `auth.int-spec`: com limite 3, a 4ª requisição do mesmo IP, alternando duas rotas e com token inválido → 429 `RATE_LIMITED` em português; `/health` não conta.
- [ ] `pnpm --filter @env/api build` e `start` sobem com o `jose`; o JWKS local traz chave `ES256`.
- [ ] Commit `feat(api): autenticação por token do supabase`.

### T4 — `/me`, equipe e guard de equipe [back]
**Arquivos:** `src/me/{me.module,me.controller,me.service}.ts`, `src/team/{team.module,team.controller,team.service}.ts`, `src/auth/team.guard.ts`, `src/prisma/prisma.service.ts`, `test/{db,me,team,team-guard}.int-spec.ts`, `test/support/{reset-db,two-teams}.ts`.

**Produz:** `TeamGuard` global (nega por padrão; `@Public()` e `@NoTeam()` são as saídas) preenche `req.member = { userId, teamId, role }` consultando o banco a cada requisição; `@NoTeam()` em `/me` e `POST /team`; `@AdminOnly()`; `@CurrentMember()`.

**Regras de `GET /me`:** membro → `member` (`defaultProjectSlug`: projeto ativo mais antigo); senão, e-mail verificado com convite pendente → numa transação cria ou atualiza o `User` (pelo e-mail verificado, atualizando o `supabaseId`), cria o vínculo, marca `accepted` → `member`; senão, sem equipe (`singleton`) e e-mail = `OWNER_EMAIL` → `needs_team`; senão `not_invited`. Sem e-mail verificado: `not_invited`, com o campo `email` vindo do token.

> `not_invited` exige `email` no contrato. Quando não houver e-mail verificado, usar o claim `email` do token **só para exibir**; nenhuma decisão se baseia nele. O `TokenVerifier` passa a devolver também `claimedEmail`.

- [ ] **Antes da primeira transação** (achado da revisão da 01): em `PrismaService`, acrescentar `statement_timeout: 2500` (menor que o `query_timeout: 3000`) e atualizar o comentário. Sem isso, um prazo estourado dentro de uma transação devolve ao pool uma conexão ainda presa na transação antiga, e gravações seguintes podem não ser confirmadas. `db.int-spec`: `pg_sleep` além do prazo numa transação falha por cancelamento no servidor, e as gravações seguintes são vistas por uma conexão `pg` independente.
- [ ] `me.int-spec`: os quatro caminhos; e-mail não verificado → `not_invited`; convite cancelado não vale; convite com `User` já existente e `supabaseId` novo funciona; duas chamadas simultâneas no aceite → duas respostas `member` e um só vínculo.
- [ ] `team.int-spec` (`POST /team`): só o dono (e-mail comparado normalizado); cria equipe, `User`, admin e primeiro projeto numa transação; duas chamadas simultâneas → um 201 e um 409; com equipe existente → 409; outra pessoa ou e-mail não verificado → 403; corpo inválido → 400 com `fields`. Violação de unicidade (`P2002`) vira `CONFLICT`.
- [ ] `team-guard.int-spec` (controller de teste, sem decorator): não membro → 403 `NOT_INVITED`; membro comum em `@AdminOnly` → 403 `FORBIDDEN`; membro removido do banco → 403 na requisição seguinte.
- [ ] `test/support/two-teams.ts` com `createTwoTeams()` (a segunda com `singleton false`), usado nos testes de isolamento das histórias seguintes.
- [ ] Commit `feat(api): criação da equipe e aceite de convite`.

### T5 — Sessão no web [front]
**Arquivos:** `apps/web/src/lib/{env,supabase,auth,api,queryKeys,queryClient,returnPath}` (`.ts`/`.tsx`) e `lib/__tests__/`; `vitest.config.ts`, `.env.example`; variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

**Produz:**
- `supabase`: `createClient(url, key, { auth: { flowType: 'pkce', storageKey: 'env.auth' } })` (o e2e usa a chave).
- `AuthProvider`, `useSession(): { status: 'loading'|'signed_out'|'signed_in'; ... }`, `useMe()` (só com sessão), `signInWithGoogle()` (`redirectTo: ${location.origin}/auth/callback`), `useSignOut()`.
- `useSignOut` usa `scope: 'local'` e chama `queryClient.clear()` mesmo se o Supabase falhar; o provider também limpa em `SIGNED_OUT` e quando muda o usuário (sessão expirada, outra aba). Nada de chamar o Supabase dentro do callback de `onAuthStateChange`.
- `apiFetch` envia o token de `getSession()`; em 401 encerra a sessão local (o guard de rota leva ao login).
- `safeReturnPath(value): string` (só caminho interno; senão `/`), com gravação e leitura em `sessionStorage` (`env.destino`).
- `queryClient`: sem nova tentativa em erros 4xx.

- [ ] `env.test`: exige as duas variáveis novas.
- [ ] `api.test` `envia o token da sessão` e `sem sessão não envia Authorization`; `401 encerra a sessão`. Os testes atuais continuam passando.
- [ ] `auth.test` `signInWithGoogle usa o provedor google e o retorno /auth/callback`.
- [ ] `auth.test` `sair limpa o cache`, inclusive quando o Supabase responde erro; `SIGNED_OUT` vindo de fora também limpa.
- [ ] `returnPath.test`: aceita `/p/atlas?x=1`; recusa `//site`, `/\site`, `https://site`, vazio e `/login`.
- [ ] Commit `feat(web): sessão com supabase`.

### T6 — Rotas e telas de acesso [front]
**Arquivos:** `src/app/{router.tsx,RequireMember.tsx}`, `src/app/layout/{AuthLayout,Logo}.tsx`, `src/pages/{LoginPage,AuthCallbackPage,NoAccessPage,ProjectPlaceholderPage}.tsx`, `main.tsx`, `__tests__/` ao lado de cada pasta; `e2e/{health,tema}.spec.ts`.

**Rotas:** `/login`, `/auth/callback`, `/onboarding/equipe`, `/sem-permissao`, `/` e `/p/:projeto` (membro), `/status` (pública, a `StatusPage` atual), `/dev/componentes` (só com `import.meta.env.DEV`, com `lazy`), `*` → `/`. As rotas são exportadas como lista, para os testes usarem `createMemoryRouter`. `RouterProvider` de `react-router/dom`.

**`RequireMember`:** carregando → esqueleto com `role="status"`; sem sessão → grava o destino e vai a `/login`; erro de `/me` (não 401) → `Banner` com "Tentar de novo"; `needs_team` → `/onboarding/equipe`; `not_invited` → `/sem-permissao`; `member` → conteúdo (`/` → `/p/:defaultProjectSlug`). Onboarding e sem permissão também exigem sessão e redirecionam quem não está naquele estado. O callback espera o `supabase-js` trocar o código (PKCE) e vai ao destino gravado; com `error` na URL, volta ao login com a faixa (texto fixo, sem repetir o parâmetro).

- [ ] `LoginPage.test` `há um único botão, "Continuar com Google", que inicia o login`; falha mostra faixa.
- [ ] `RequireMember.test`: sem sessão → `/login` guardando o destino; `needs_team` → onboarding; `not_invited` → sem permissão; `member` em `/` → `/p/:slug`; erro mostra "Tentar de novo" e refaz; sessão que expira leva ao login.
- [ ] `AuthCallbackPage.test`: vai ao destino gravado; destino externo (`//site`) é ignorado; `error` volta ao login.
- [ ] `NoAccessPage.test`: título em `h1`, e-mail em uso e "Sair" que encerra a sessão.
- [ ] `ProjectPlaceholderPage.test`: mostra a equipe e "Sair".
- [ ] `health` e `tema` do e2e passam em `/status`; o `check-bundle` continua barrando a vitrine.
- [ ] Commit `feat(web): rotas protegidas e login com google`.

### T7 — Criar equipe [front]
**Arquivos:** `src/pages/CreateTeamPage.tsx`, `src/lib/forms.ts` e `__tests__/`.
**Produz:** `applyApiErrors(error, setError)`: cada `fields` vai ao campo; sem `fields` (ou chave `_`), erro raiz.
React Hook Form com `zodResolver(createTeamSchema)`; `useMutation` no `POST /team`; no sucesso grava a resposta no cache de `/me` e segue para o projeto. `project.slug = slugify(project.name)`; erro de `project.slug` aparece no campo "Primeiro projeto". Mensagens de validação em português.
- [ ] `forms.test`: aplica `name` e `project.name`; sem `fields`, vira erro raiz.
- [ ] `CreateTeamPage.test` `o endereço acompanha o nome até a pessoa editar`.
- [ ] `CreateTeamPage.test` `envia o slug do projeto derivado do nome` e vai ao projeto; botão desativado durante o envio.
- [ ] `CreateTeamPage.test`: nome de projeto que não gera slug válido mostra erro no campo; `fields.slug` da API aparece no campo; 409 mostra `Banner` e consulta `/me` de novo.
- [ ] Commit `feat(web): criação da equipe`.

### T8 — Configuração local, e2e e guia [back]
**Arquivos:** `supabase/config.toml`, `.env.example` na raiz, `playwright.config.ts`, `e2e/support/{supabase.ts,db.ts,login.ts}`, `e2e/auth.spec.ts`, `docs/operacao/google-oauth.md`, `README.md`.

- `config.toml`: `site_url = "http://localhost:5173"`; `additional_redirect_urls = ["http://localhost:5173/auth/callback"]`; `[auth.external.google]` com `enabled = true`, `client_id` e `secret` via `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)` e `env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)`, lidos do `.env` da raiz. **`pnpm db:start` precisa funcionar sem essas variáveis** (CI); se não funcionar, ajustar sem pôr valores no repositório. O login por e-mail continua ligado no local (o e2e depende dele); a 12 o desliga na nuvem.
- Pode ser feito antes da T6, para o usuário já testar o login real.
  - [x] Feito em 2026-11-27: `config.toml`, `.env.example` da raiz e as variáveis do Supabase em `apps/api/.env.example` (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `OWNER_EMAIL`) e `apps/web/.env.example`. `pnpm db:start` funciona sem as variáveis do Google, ausentes ou vazias. `AUTH_TEST_MODE` e `RATE_LIMIT_PER_MINUTE` ficam para a T3. Commit `chore: configuração local do login com google` (orquestrador).
  - O Auth local aceita como retorno qualquer endereço de `localhost` e `127.0.0.1`, mesmo fora da lista; endereço externo cai no `site_url`.
- `playwright.config`: `workers: 1`; API com `NODE_ENV=test`, `AUTH_TEST_MODE=true`, `OWNER_EMAIL=dono@acme.example`, limite alto e chaves do `supabase status`; web com as variáveis `VITE_SUPABASE_*`.
- `resetDb()`: esvazia só o `env_test` (mesma trava `_test`). `loginAs(page, { email, name })`: cria o usuário pela API administrativa local (reaproveitando se existir), entra com senha gerada na hora e grava a sessão em `localStorage['env.auth']` uma única vez (sem `addInitScript`, que reporia a sessão depois de "Sair"). Esses usuários ficam no `auth` do Supabase local: só e-mails `@acme.example`.

- [ ] e2e `sem sessão, a rota protegida leva ao login`.
- [ ] e2e `o dono cria a equipe e chega ao projeto`; recarregar mantém.
- [ ] e2e `um estranho vê sem permissão e consegue sair`.
- [ ] e2e: login, criar equipe e sem permissão sem violações sérias no axe, alvos ≥ 44px e sem rolagem horizontal em 375px.
- [ ] Guia: projeto no Google Cloud, tela de consentimento (usuários de teste), escopos `openid`, e-mail e perfil, cliente "Aplicativo da Web" com origem `http://localhost:5173` e redirecionamento `http://127.0.0.1:54321/auth/v1/callback`, `.env` da raiz, `apps/api/.env` (`OWNER_EMAIL`, chaves), reiniciar o Supabase, acessar por `localhost:5173` e conferir o login. Sem valores reais.
- [ ] README com as variáveis novas e o estado do projeto.
- [ ] Os cinco portões passam. O login real só o usuário consegue testar; os portões não dependem dele.
- [ ] Commit `test: fluxo de acesso ponta a ponta e guia do oauth`.

### Cobertura dos critérios
| Critério | Onde |
|---|---|
| Só "Continuar com Google" | T6 |
| 401 para token ruim | T3 |
| E-mail não verificado recusado | T3, T4 |
| Só o dono cria a equipe; concorrência | T2, T4, T7 |
| Sem permissão com sair | T4, T6, T8 |
| Rotas protegidas e sessão expirada | T5, T6, T8 |
| RLS, chave pública, `anon` e `authenticated` | T2 |
| Guard de equipe | T4 |
| Tokens assinados localmente | T3 |
| Guia do Google | T8 |
| PKCE e URLs cadastradas | T5, T8 |
| 429 em português | T3 |
| Sair limpa o cache | T5 |

### Revisor e homologador
Sem credenciais do Google, o homologador sobe o app em modo de teste e entra com `loginAs`, usando o banco `env_test`. Anexar ao PR screenshots das telas novas (desktop e 375px).

### Atenção para a história 12 (não fazer agora)
Conferir se o pooler da nuvem aceita `statement_timeout` como parâmetro de conexão; desligar o login por e-mail; cadastrar a URL de retorno publicada; confirmar o algoritmo das chaves do projeto.
