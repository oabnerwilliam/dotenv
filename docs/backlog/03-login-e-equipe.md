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

### Decisão de segurança
O `user_metadata` do token pode ser editado pelo próprio usuário e **não** serve para provar e-mail. A API usa o token só para saber *quem é* (`sub`) e exige `app_metadata.provider = google`. O e-mail, usado ao criar a equipe ou aceitar convite, é lido no Supabase com a chave secreta, a partir da identidade Google verificada.

### Contratos (`packages/shared/src/{auth,team}.ts`)
```ts
type Role = 'admin' | 'member';
normalizeEmail(email: string): string        // trim + minúsculas
slugify(texto: string): string               // sem acento, minúsculo, hífens
slugSchema                                   // ^[a-z0-9]+(-[a-z0-9]+)*$, 2..40
createTeamSchema = { name: 1..60; slug: slugSchema; project: { name: 1..60; slug: slugSchema } }
meSchema = discriminatedUnion('state', [
  { state:'member', user:{id,name,email,avatarUrl|null}, team:{id,name,slug}, role, defaultProjectSlug|null },
  { state:'needs_team', email }, { state:'not_invited', email } ])
```

### Tarefa 1 — Schema [back]
**Arquivos:** `schema.prisma`, migração `auth_equipe`
**Modelos:**
- `Team(id, name, slug unique, singleton Boolean default true, createdAt)` com índice único parcial `(singleton) WHERE singleton`: uma só equipe na fase 1, e testes podem criar outra com `singleton false`.
- `User(id, supabaseId unique, email unique, name, avatarUrl?)`.
- `Membership(id, teamId, userId unique, role, createdAt)`.
- `Invite(id, teamId, email, role, status 'pending'|'accepted'|'canceled', invitedById, createdAt)` com índice único parcial `(team_id, email) WHERE status='pending'`.
- `Project(id, teamId, name, slug, ticketRegex default '[A-Z]+-\d+', defaultDuration 'H4'|'D1'|'D3'|'UNTIL_RELEASED' default 'D1', validateConsistency default true, archivedAt?, createdAt)` único `(teamId, slug)`.
- [ ] A migração revoga de `anon` e `authenticated` o acesso a tabelas, sequências e funções do schema `public`, também nos privilégios padrão (`ALTER DEFAULT PRIVILEGES`); teste confere que não há concessão.
- [ ] `rls.int-spec`: nenhuma tabela do schema `public` com `relrowsecurity = false`; leitura REST no banco de desenvolvimento com a chave pública não retorna linhas.
- [ ] Commit `feat(api): modelos de equipe e acesso`.

### Tarefa 2 — Validação do token [back]
**Arquivos:** `src/auth/{auth.module,auth.guard,token-verifier,identity-verifier,decorators}.ts`, `test/support/auth.ts`; variáveis `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `OWNER_EMAIL`; `supabase/config.toml` com chave de assinatura assimétrica (conferir na documentação do CLI)
**Produz:** `TokenVerifier.verify(token): Promise<{ supabaseId; name; avatarUrl|null }>` com `jose` e JWKS em `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, emissor `${SUPABASE_URL}/auth/v1`, audiência `authenticated`; `IdentityVerifier.verifiedEmail(supabaseId): Promise<string|null>`; `AuthGuard` global, com `@Public()` no `/health`; `@CurrentAuth()`.
- [ ] `token-verifier.spec` (chaves geradas no teste): recusa ausente, expirado, outro emissor, outra audiência, assinatura errada, `alg: none` e provider diferente de `google`.
- [ ] `identity-verifier.spec`: devolve e-mail só da identidade `google` com `email_verified: true`.
- [ ] Modo de teste: `AUTH_TEST_MODE=true` aceita provider `email` (para e2e); `loadEnv` **falha** se `NODE_ENV` for diferente de `test`, inclusive ausente. O `playwright.config` define `NODE_ENV=test`.
- [ ] Limite de requisições com `@nestjs/throttler`: guard global antes do `AuthGuard`, por IP, `RATE_LIMIT_PER_MINUTE` (padrão 300, porque o escritório pode sair por um IP só), `/health` fora; teste: excesso → 429 `RATE_LIMITED`, mesmo com token inválido.
- [ ] Commit `feat(api): autenticação por token do supabase`.

### Tarefa 3 — `/me`, equipe e guard de equipe [back]
**Arquivos:** `src/me/*`, `src/team/*`, `src/auth/team.guard.ts`
**Produz:** `TeamGuard` (padrão nas rotas de negócio) preenche `req.member = { userId, teamId, role }` consultando o banco a cada requisição; `@NoTeam()` para `/me` e `POST /team`; `@AdminOnly()`; `@CurrentMember()`.
**Regras de `GET /me`:** membro → `member`; senão, e-mail verificado com convite pendente → cria o vínculo, marca `accepted`, `member`; senão, sem equipe e e-mail = `OWNER_EMAIL` → `needs_team`; senão `not_invited`.
- [ ] int-spec: os quatro caminhos; e-mail não verificado → `not_invited`.
- [ ] `POST /team`: só o dono; cria equipe, admin e primeiro projeto numa transação; duas chamadas simultâneas → um 201 e um 409; outra pessoa → 403.
- [ ] Não membro em rota com `TeamGuard` → 403 `NOT_INVITED`.
- [ ] Criar `test/support/two-teams.ts` com `createTwoTeams()` (a segunda equipe com `singleton false`), usado nos testes de isolamento das histórias seguintes.
- [ ] Commit `feat(api): criação da equipe e aceite de convite`.

### Tarefa 4 — Login no web [front]
**Arquivos:** `src/lib/{supabase.ts,auth.tsx}`, `src/app/{router.tsx,RequireMember.tsx}`, `src/pages/{LoginPage,CreateTeamPage,NoAccessPage}.tsx`; variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
**Produz:** `useSession()`, `useMe()`, `signInWithGoogle()`, `signOut()`; `apiFetch` envia o token e, em 401, encerra a sessão e vai para `/login` guardando a rota de destino (só caminhos internos).
- [ ] Cliente do Supabase com `flowType: 'pkce'`; URLs de retorno listadas em `supabase/config.toml`.
- [ ] `signOut()` chama `queryClient.clear()`.
- [ ] Criar equipe usa React Hook Form; criar `lib/forms.ts` com `applyApiErrors`.
- [ ] Testes: o botão único chama o provedor `google`; `needs_team` → `/onboarding/equipe`; `not_invited` → tela sem permissão com "Sair"; `member` → `/p/:defaultProjectSlug`; retorno externo (`//site`) é ignorado.
- [ ] Criar equipe: slug sugerido a partir do nome até a pessoa editar; conflito aparece no campo.
- [ ] Commit `feat(web): login com google e criação da equipe`.

### Tarefa 5 — e2e e guia [back]
**Arquivos:** `e2e/support/{db.ts,login.ts}`, `e2e/auth.spec.ts`, `docs/operacao/google-oauth.md`
**Produz:** `resetDb()`; `loginAs(page, { email, name })` cria o usuário pela API administrativa local e injeta a sessão.
- [ ] e2e: o dono cria a equipe; um estranho vê sem permissão.
- [ ] Guia passo a passo das credenciais no Google Cloud e das variáveis em `supabase/config.toml` via `env(...)`. O login real só o usuário consegue testar; os portões não dependem dele.
- [ ] Commit `test: fluxo de acesso ponta a ponta e guia do oauth`.
