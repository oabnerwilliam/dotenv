# 05 — Projetos e navegação

**Estado:** concluída · **Depende de:** 03 · **Spec:** §6, §8 · **Design:** `DESIGN.md` (Layout), `App-Board`, `App-Menu-Equipe` · **Tela nova: designer primeiro**

Como membro, quero criar projetos e navegar entre eles.

## Critérios de aceite
- [x] Nav superior, menu lateral e seletor de projeto como no design, sem a busca.
- [x] O menu lateral recolhe e a escolha persiste ao recarregar.
- [x] Menu da equipe com Membros, Configurações, dados do usuário e Sair; Esc e clique fora fecham.
- [x] Criar projeto (nome e slug único na equipe).
- [x] Renomear e arquivar projeto, com confirmação; arquivado some das listas.
- [x] Rotas `/p/:projeto`, `/p/:projeto/historico` e `/p/:projeto/configuracoes`.
- [x] Projeto inexistente ou de outra equipe responde "não encontrado".
- [x] Teste automatizado de isolamento entre duas equipes.
- [x] Funciona em tela estreita conforme `SCREENS.md` (Responsivo).

## Fora de escopo
Troca de equipe, Conexões, busca ⌘K, conteúdo das páginas.

## Plano de implementação

Conferido contra a `main` (`d8338e0`) em 2026-11-27. Convenções: `docs/superpowers/plans/2026-11-26-env-fase1-convencoes.md`. Feita antes da 04.

**Pré-requisitos:** Docker Desktop em execução e só este Supabase local ligado.

**Ordem:** T0 (designer) e T1 (`shared`) primeiro. Depois T2 (back) em paralelo com T3 e T4 (front, em sequência). T5 fecha.

Os trechos marcados com **(D1)** a **(D7)** seguem a seção "Decisões", no fim do arquivo.

### Ponto de partida na `main`
- **Sem migração.** `Project` já tem `archivedAt` e o único `(teamId, slug)`, que já reserva o slug de projeto arquivado. `rls.int-spec` não muda.
- `GET /me` já devolve em `defaultProjectSlug` o projeto ativo **mais antigo**, ou `null`, com teste em `me.int-spec`. Nada a mudar na API do `/me` **(D4)**.
- API: reaproveitar `ZodValidationPipe`, `AppError`, `ErrorFilter`, `@CurrentMember()`, o `TeamGuard` global (rota nova já nasce protegida; projetos não usam `@AdminOnly`), `createApp`, `createTestAuth`, `resetDb` e `createTwoTeams()` (slugs `projeto-acme` e `projeto-vega`).
- `shared`: `slugify` e `slugSchema` prontos. `nameSchema(subject)` existe em `team.ts`, mas não é exportado.
- Web: reaproveitar `Modal` (já devolve o foco), `Select`, `Field`, `Button`, `IconButton`, `Banner`, `EmptyState`, `Skeleton`, `Logo`, `apiFetch`, `applyApiErrors`, `queryKeys`, `useMe`, `useSignOut`, `TERMO_EQUIPE`, `radix-ui` (traz o `DropdownMenu`) e `lucide-react`. O `Avatar` não serve para a sigla da equipe nem dos projetos (usa primeira e última palavra: "Acme" vira "A").
- Provisórios que saem: `pages/ProjectPlaceholderPage.tsx` e o teste dele. `HomePage` e `router.tsx` os usam.
- Testes que dependem da página provisória e precisam mudar: `RequireMember.test` (esperam `h1` "Acme" em `/p/atlas`) e `e2e/auth.spec.ts` ("o dono cria a equipe" e "nomes longos"). Como `onUnhandledRequest` é `error`, todo teste que chega a `/p/...` ou a `/` como membro precisa de resposta para `GET /projects`.
- Fica de fora: nuqs (nenhum estado de URL aqui; a 07 o instala).

### Dependência
| Pacote | Faixa | Onde |
|---|---|---|
| `zustand` | `^5` | web |

Conferir as assinaturas nos `.d.ts` instalados. No Zustand 5, a leitura do `localStorage` pelo `persist` é síncrona na criação do store (sem piscar), e `createJSONStorage` não trata erro do armazenamento: o `try/catch` é nosso.

### Contratos (`packages/shared/src/projects.ts`, exportado no `index.ts`)
```ts
projectSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() })
projectListSchema = z.array(projectSchema)
createProjectSchema = z.object({ name: nameSchema('do projeto'), slug: slugSchema })
updateProjectSchema = z.object({ name: nameSchema('do projeto') })   // o slug não muda, para não quebrar links
type Project, CreateProjectInput, UpdateProjectInput
```
`nameSchema` apara espaços, aceita 1..60 e **recusa caracteres de controle e invisíveis** (`\p{Cc}`, `\p{Cf}`, `\p{Zl}`, `\p{Zp}`), com a mensagem "O nome {do …} tem caracteres que não são permitidos." **(D5)**. Vale também para a equipe e o primeiro projeto (`createTeamSchema`).

| Rota | Sucesso | Erros |
|---|---|---|
| `GET /projects` | 200 `Project[]`, só ativos da equipe, por nome | — |
| `POST /projects` (`createProjectSchema`) | 201 `Project` | 400 `VALIDATION` (`fields.name`, `fields.slug`), 409 `CONFLICT` (`fields.slug`) |
| `PATCH /projects/:project` (`updateProjectSchema`) | 200 `Project` | 400 `VALIDATION` (`fields.name`), 404 `NOT_FOUND` |
| `POST /projects/:project/archive` (sem corpo) | **200** `Project` (usar `@HttpCode(200)`) | 404 `NOT_FOUND` |

Todas: 401 `UNAUTHENTICATED`, 403 `NOT_INVITED`, 429 `RATE_LIMITED`. Nenhum código de erro novo. Mensagens: 404 "Projeto não encontrado."; 409 "Este endereço já é usado por um projeto, mesmo que arquivado." (na `message` e em `fields.slug`).

### T0 — Desenho [designer]
**Arquivos:** `docs/design/screens/`, `docs/design/index.html`, `docs/design/docs/{SCREENS,COMPONENTS}.md`. Desktop e 375px, só componentes e tokens existentes.
- [x] Casca (a partir de `App-Board`): nav **sem busca**; menu lateral expandido, recolhido e em tela estreita (fechado e aberto) **(D3)**; "Novo projeto" nos dois modos; bloco da equipe sem ação **(D7)**; seletor de projeto fechado e aberto; nomes e slugs longos.
- [x] Menu da equipe (`App-Menu-Equipe` adaptada): cabeçalho **(D7)**, "Membros" levando a `/equipe/membros` **(D1)**, "Configurações" **(D2)**, também sem projeto, nome e e-mail, Sair; sem Conexões, contagem e troca ou criação de equipe.
- [x] `App-Projeto-Novo`: vazio, erro nos campos (com 409), enviando e erro geral.
- [x] `App-Projeto-Renomear` (modal) e `App-Projeto-Arquivar` (confirmação: some das listas, não há como desfazer no app, o endereço continua reservado; caso do último projeto); enviando e erro.
- [x] Painel "Projeto" em Configurações (nome, endereço em mono só para leitura, "Renomear", "Arquivar"). A 06 acrescenta os outros painéis à mesma página.
- [x] Marcadores de board, histórico, configurações e membros (`/equipe/membros`, provisório até a 04) **(D1)**; "nenhum projeto" (com "Criar projeto"); "projeto não encontrado" (com volta); carregando e falha ao listar projetos (com "Tentar de novo").
- [x] Retirar `App-Projeto-Provisorio` das rotas em `SCREENS.md`.
- [x] Commit `docs(design): navegação e gestão de projetos`.

### T1 — Contratos em `shared` [back]
**Arquivos:** `src/projects.ts` (novo: schemas e tipos), `src/team.ts` (exporta e endurece `nameSchema`), `src/index.ts`, `src/__tests__/{projects,team}.test.ts`.
- [x] `projects.test` `createProjectSchema apara o nome e valida o endereço`: `'  Atlas '` vira `'Atlas'`; nome vazio e de 61 caracteres recusados com o caminho `name`; slug inválido com o caminho `slug`.
- [x] `projects.test` `updateProjectSchema ignora o slug`: o resultado só tem `name`.
- [x] `projects.test` `projectListSchema descarta campos a mais`.
- [x] `team.test` `nomes recusam caracteres de controle e invisíveis`: `\u0000`, `\n`, `\t` no meio, `​` e `‮` recusados em equipe, primeiro projeto e projeto; acentos, espaços e emoji simples aceitos.
- [x] Commit `feat(shared): contratos de projetos`.

### T2 — API de projetos [back]
**Arquivos:**
- `apps/api/src/projects/projects.module.ts`: registra e exporta o serviço;
- `apps/api/src/projects/projects.controller.ts`: as quatro rotas; o `teamId` vem só de `@CurrentMember()`;
- `apps/api/src/projects/projects.service.ts`: `list`, `create`, `rename`, `archive`, `findOwned`;
- `apps/api/src/app.module.ts`: importa o módulo;
- `apps/api/test/projects.int-spec.ts`.

**Produz:** `ProjectsService.findOwned(teamId: string, slug: string): Promise<Project>` (modelo do Prisma), que lança `NOT_FOUND` para inexistente, arquivado ou de outra equipe; usado pelas histórias seguintes. Slug que não passa no `slugSchema` é `NOT_FOUND` **antes** da consulta (um `%00` no endereço viraria 500 no Postgres).

**Regras:** respostas campo a campo (`id`, `name`, `slug`); ordem por nome com `localeCompare('pt-BR')`, desempate pela criação; a repetição de slug é decidida pelo banco (`P2002` → `CONFLICT`), sem consulta prévia; renomear e arquivar filtram por `id`, `teamId` e `archivedAt: null` na própria gravação.

- [x] `lista só os projetos ativos da própria equipe, por nome`: sem o arquivado e sem o da outra equipe; cada item tem só `id`, `name`, `slug`.
- [x] `membro comum cria um projeto`: 201, gravado na equipe de quem chamou; `teamId` no corpo é ignorado.
- [x] `corpo inválido responde 400 com fields`: `name` e `slug`; nome com `\u0000` → 400, não 500.
- [x] `slug repetido na equipe responde 409 em fields.slug, também se o projeto estiver arquivado`.
- [x] `o mesmo slug pode existir em outra equipe`.
- [x] `duas criações simultâneas com o mesmo slug`: um 201 e um 409.
- [x] `renomear muda o nome e mantém o endereço`, mesmo com `slug` no corpo.
- [x] `arquivar grava archivedAt, tira da lista e não apaga a linha`; arquivar ou renomear de novo → 404.
- [x] `arquivar o último projeto é permitido`: `GET /me` passa a devolver `defaultProjectSlug: null`.
- [x] `isolamento entre equipes` (`createTwoTeams`): renomear e arquivar o projeto alheio → 404 com a mesma mensagem do inexistente, e a linha da outra equipe fica intacta; listar não o mostra, nos dois sentidos.
- [x] `endereço malformado responde 404` (`%00`, maiúsculas, 200 letras).
- [x] `sem token responde 401 e quem não é membro, 403`.
- [x] `findOwned` coberto pelos casos de `PATCH` e `/archive` (próprio, inexistente, arquivado, alheio).
- [x] Commit `feat(api): projetos`.

### T3 — Casca e navegação [front]
**Arquivos** (em `apps/web/src/`):
- `lib/useSidebar.ts`: store Zustand com `persist` (chave `env.sidebar`, armazenamento próprio com leitura, escrita e remoção em `try/catch`, guardando só a escolha);
- `lib/useIsNarrow.ts`: `matchMedia` no corte definido pelo design (proposta: abaixo de 768px) **(D3)**;
- `lib/sigla.ts`: duas letras na caixa original (uma palavra: as duas primeiras; várias: inicial da primeira e da última); maiúsculas só por classe;
- `lib/queryKeys.ts`: `projects: (userId) => ['projects', userId]`;
- `features/projects/useProjects.ts`: `useQuery` de `GET /projects`;
- `features/projects/ProjectScope.tsx`: resolve `:projeto` na lista, trata não encontrado (e o carregando enquanto a lista é atualizada) e entrega o projeto às filhas; exporta `useProject(): Project`. O carregando e a falha da lista ficam no `AppShell`, porque o `SCREENS.md` os pede em todas as rotas da casca (ajuste feito na implementação);
- `features/projects/ProjectNotFound.tsx`: aviso e volta;
- `app/layout/AppShell.tsx`: moldura (linha de acento, scanline, nav, menu lateral e `<main>` com `max-w-content`), recebe `children`; não depende de haver projeto atual (a 04 põe `/equipe/membros` nela);
- `app/layout/TopNav.tsx`: botão do menu, `Logo` como link para `/`, seletor e menu da equipe;
- `app/layout/SideNav.tsx`: expandido e recolhido, projetos, seções do projeto atual;
- `app/layout/ProjectSelect.tsx`: `~/projetos/` + slug em mono, nome acessível "Projeto"; escolher leva ao board;
- `app/layout/TeamMenu.tsx`: Radix `DropdownMenu`;
- `components/ui/Select.tsx`: só o que o seletor da nav pedir (prefixo e sem escolha), sem mudar os usos atuais;
- `features/board/BoardPage.tsx`, `features/history/HistoryPage.tsx`, `features/settings/SettingsPage.tsx`: marcadores com `h1`;
- `features/members/MembersPlaceholderPage.tsx`: marcador com `h1` "Membros" e aviso de que a gestão chega em breve **(D1)**;
- `pages/HomePage.tsx`: usa `useProjects()`; vai ao `defaultProjectSlug` se estiver na lista, senão ao primeiro dela; lista vazia mostra "nenhum projeto" dentro da casca;
- `app/router.tsx`: `/` continua rota à parte (espaço para uma home pública); rota de layout `RequireMember` + `AppShell` com `/p/:projeto` (`ProjectScope`) e as filhas índice, `historico` e `configuracoes`; `/equipe/membros` sob `RequireMember` + `AppShell`, sem projeto atual **(D1)**;
- `test/server.ts` ou `test/renderApp.tsx`: resposta padrão de `GET /projects` (`atlas`) e ajuda para trocá-la; `test/setup.ts`: `matchMedia` falso (o jsdom não tem) e store do menu zerado entre testes;
- remover `pages/ProjectPlaceholderPage.tsx` e o teste.

**Produz:** `useSidebar(): { collapsed: boolean; toggle(): void }`. Sem escolha salva, expandido em tela larga e recolhido em tela estreita **(D3)**.

**Regras:** item atual com `aria-current="page"` (`NavLink`, com `end` no board); recolhido com `aria-label` e `title`; em tela estreita o recolhido não ocupa espaço; slug desconhecido enquanto a lista é atualizada mostra carregando, não "não encontrado"; a volta leva ao projeto padrão, se estiver na lista, senão ao primeiro, senão a `/`; falha com dados em mãos mantém a tela e mostra a faixa; ações que parecem link são `<a>` (extrair as classes do `Button` se preciso).

- [x] `useSidebar.test` `alternar grava a escolha e ela vale numa nova carga`.
- [x] `useSidebar.test` `sem escolha salva, segue a largura da tela`.
- [x] `useSidebar.test` `armazenamento que falha ou valor corrompido não derruba o app`.
- [x] `sigla.test`: "Acme" → "Ac"; "Studio Aurora" → "SA"; emoji e acento não são partidos.
- [x] `ProjectScope.test` `as três rotas mostram o título da seção do projeto`.
- [x] `ProjectScope.test` `slug desconhecido mostra "Projeto não encontrado" com volta`, também em `/historico` e `/configuracoes`.
- [x] `ProjectScope.test` `carregando tem role="status"; falha mostra "Tentar de novo", que refaz`.
- [x] `SideNav.test` `lista os projetos e marca a seção atual com aria-current`; outro projeto leva ao board dele.
- [x] `SideNav.test` `recolhido mantém os nomes acessíveis`; o botão da nav alterna `aria-expanded`.
- [x] `ProjectSelect.test` `mostra o slug atual e navega ao escolher outro`.
- [x] `TeamMenu.test` `mostra equipe, Membros, Configurações, nome, e-mail e Sair`; sem busca, Conexões ou troca de equipe.
- [x] `TeamMenu.test` `Esc e clique fora fecham, e o foco volta ao avatar`.
- [x] `TeamMenu.test` `Membros leva a /equipe/membros, que mostra o marcador dentro da casca` **(D1)**.
- [x] `TeamMenu.test` `Configurações leva às do projeto atual; fora de um projeto, às do padrão; sem projeto, fica indisponível` **(D2)**.
- [x] `TeamMenu.test` `Sair encerra a sessão e leva ao login`.
- [x] `AppShell.test` `ordem do Tab: botão do menu, logo, seletor, avatar, menu lateral, conteúdo`.
- [x] `HomePage.test` `vai ao projeto padrão; padrão fora da lista vai ao primeiro; sem projeto mostra a casca com "nenhum projeto"`.
- [x] Ajustar `RequireMember.test` e conferir os demais testes de tela.
- [x] Commit `feat(web): navegação principal`.

### T4 — Gestão de projetos [front]
**Arquivos** (em `apps/web/src/`):
- `features/projects/ProjectCreateModal.tsx`: nome e endereço, com o endereço acompanhando o nome (`slugify`) até a pessoa editá-lo;
- `features/projects/ProjectRenameModal.tsx`: nome preenchido; salvar é a confirmação **(D6)**;
- `features/projects/ProjectArchiveModal.tsx`: confirmação;
- `features/projects/ProjectPanel.tsx`: painel em Configurações;
- `features/projects/useProjectMutations.ts`: três `useMutation`;
- ligar "Novo projeto" no `SideNav` e no estado vazio, e o `ProjectPanel` no `SettingsPage`.

**Regras:** React Hook Form com `zodResolver` dos schemas de `shared`; `applyApiErrors`; envio desativado com linha `role="status"` e `networkMode: 'always'` como em `CreateTeamPage`; no sucesso, gravar a resposta no cache da lista **antes** de navegar e invalidar a lista e o `/me`; ao arquivar, ir ao primeiro projeto restante ou a `/` e pôr o foco no título (o botão que abriu o modal deixa de existir); 404 ao renomear ou arquivar (outra pessoa arquivou) atualiza a lista.

- [x] `ProjectCreateModal.test` `o endereço acompanha o nome até ser editado`.
- [x] `ProjectCreateModal.test` `criar envia nome e slug, fecha e navega ao novo projeto`, que aparece no menu.
- [x] `ProjectCreateModal.test` `409 aparece no campo Endereço; falha sem fields vira faixa e mantém o digitado`.
- [x] `ProjectCreateModal.test` `Esc fecha, devolve o foco e reabre limpo`.
- [x] `ProjectRenameModal.test` `salvar atualiza o nome no menu sem mudar o endereço`; cancelar não envia.
- [x] `ProjectArchiveModal.test` `só arquiva depois de confirmar`; cancelar não envia.
- [x] `ProjectArchiveModal.test` `vai para outro projeto e o arquivado some do menu e do seletor`.
- [x] `ProjectArchiveModal.test` `arquivar o último mostra "nenhum projeto"`, sem voltar ao arquivado.
- [x] `ProjectArchiveModal.test` `falha mantém o modal aberto com a faixa`.
- [x] Commit `feat(web): criar, renomear e arquivar projetos`.

### T5 — Ponta a ponta [front]
**Arquivos:** `e2e/projects.spec.ts` (novo), `e2e/auth.spec.ts` (ajustar ao que substituiu a página provisória; sair agora é pelo menu da equipe).
- [x] `projects.spec` `criar, renomear e arquivar um projeto`, recarregando entre os passos; o endereço do arquivado mostra "não encontrado".
- [x] `projects.spec` `o menu lateral recolhido continua assim ao recarregar`.
- [x] `projects.spec` `casca, menu da equipe e modais são acessíveis`: axe, alvos ≥ 44px e sem rolagem horizontal, em desktop e 375px, com nomes e slugs longos (reaproveitar `e2e/support/a11y.ts`; incluir os itens de menu na medição).
- [x] `auth.spec`: "o dono cria a equipe" espera o título do board; "nomes longos" cobre o projeto real e o endereço inexistente.
- [x] Os cinco portões passam.
- [x] Commit `test: projetos ponta a ponta`.

### Cobertura dos critérios
| Critério | Onde |
|---|---|
| Nav, menu lateral e seletor, sem busca | T0, T3 |
| Menu recolhe e persiste | T3, T5 |
| Menu da equipe; Esc e clique fora | T3 |
| Criar projeto, slug único | T1, T2, T4 |
| Renomear e arquivar com confirmação | T2, T4 |
| As três rotas | T3 |
| "Não encontrado" | T2, T3, T5 |
| Isolamento entre equipes | T2 |
| Tela estreita | T0, T3, T5 |

### Revisor e homologador
O homologador sobe o app em modo de teste (`loginAs`, banco `env_test`). Anexar ao PR screenshots em desktop e 375px e citar os desvios do design (sem busca, itens do menu da equipe, bloco da equipe sem ação).

## Decisões
Tomadas em 2026-11-27, em sessão autônoma (D1, D2 e D4 foram apresentadas ao usuário antes de ele liberar).

| # | Pergunta | Decisão |
|---|---|---|
| D1 | "Membros" antes de a 04 existir | O item leva a `/equipe/membros`, com página provisória dentro da casca; a 04 troca o conteúdo |
| D2 | Destino de "Configurações" no menu da equipe | Configurações do projeto atual ou do padrão, com o rótulo "Configurações"; sem projeto, indisponível |
| D3 | Menu lateral em tela estreita | Uma escolha salva; sem ela, fechado; aberto empilha acima do conteúdo |
| D4 | Projeto padrão | O ativo mais antigo, como hoje |
| D5 | Caracteres de controle e invisíveis em nomes | Recusados aqui, no `nameSchema`. Efeito: emojis compostos (com `U+200D`) são recusados |
| D6 | "Renomear ... com confirmação" | O "Salvar" do modal é a confirmação |
| D7 | Partes do design sem função na fase 1 | Cabeçalho do menu só com o slug; bloco da equipe estático; "Membros" sem contagem |
