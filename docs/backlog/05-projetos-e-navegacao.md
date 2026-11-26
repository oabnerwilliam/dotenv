# 05 — Projetos e navegação

**Estado:** a fazer · **Depende de:** 03 · **Spec:** §6, §8 · **Design:** `DESIGN.md` (Layout), `App-Board`, `App-Menu-Equipe` · **Tela nova: designer primeiro**

Como membro, quero criar projetos e navegar entre eles.

## Critérios de aceite
- [ ] Nav superior, menu lateral e seletor de projeto como no design, sem a busca.
- [ ] O menu lateral recolhe e a escolha persiste ao recarregar.
- [ ] Menu da equipe com Membros, Configurações, dados do usuário e Sair; Esc e clique fora fecham.
- [ ] Criar projeto (nome e slug único na equipe).
- [ ] Renomear e arquivar projeto, com confirmação; arquivado some das listas.
- [ ] Rotas `/p/:projeto`, `/p/:projeto/historico` e `/p/:projeto/configuracoes`.
- [ ] Projeto inexistente ou de outra equipe responde "não encontrado".
- [ ] Teste automatizado de isolamento entre duas equipes.
- [ ] Funciona em tela estreita conforme `SCREENS.md` (Responsivo).

## Fora de escopo
Troca de equipe, Conexões, busca ⌘K, conteúdo das páginas.

## Plano de implementação

### Contratos (`shared/src/projects.ts`)
```ts
projectSchema = { id, name, slug }
createProjectSchema = { name: 1..60; slug: slugSchema }
updateProjectSchema = { name: 1..60 }          // o slug não muda, para não quebrar links
```

### Tarefa 1 — Desenho [designer]
- [ ] `App-Projeto-Novo`, `App-Projeto-Renomear`, `App-Projeto-Arquivar` (modais) e estado "nenhum projeto"; ações no menu lateral (novo) e num painel em Configurações (renomear, arquivar).
- [ ] Commit `docs(design): gestão de projetos`.

### Tarefa 2 — API [back]
**Arquivos:** `src/projects/*`, `test/projects.int-spec.ts`
**Produz:** `ProjectsService.findOwned(teamId, slug): Promise<Project>` (lança `NOT_FOUND` para inexistente, arquivado ou de outra equipe), usado pelas histórias seguintes. Isolamento com `createTwoTeams()` (história 03).
- [ ] `GET /projects` só os ativos da equipe, por nome; `POST` com slug repetido → 409 `fields.slug` (inclusive de arquivado); `PATCH` e `/archive`.
- [ ] Isolamento: renomear e arquivar projeto alheio → 404; listar não o mostra.
- [ ] `GET /me` passa a devolver o primeiro projeto ativo ou `null`.
- [ ] Commit `feat(api): projetos`.

### Tarefa 3 — Casca da aplicação [front]
**Arquivos:** `src/app/layout/{AppShell,TopNav,SideNav,ProjectSelect,TeamMenu,Logo}.tsx`, `src/lib/useSidebar.ts`, rotas em `src/app/router.tsx`
**Produz:** `useSidebar(): { collapsed: boolean; toggle(): void }` (chave `env.sidebar`, leitura e escrita em `try/catch`); `useProject(): Project` para as páginas filhas.
- [ ] Testes: alternar persiste; recolhido mantém nomes acessíveis; `aria-current="page"`; menu da equipe fecha com Esc e devolve o foco; ordem de Tab conforme `SCREENS.md`; slug desconhecido mostra "não encontrado" com volta.
- [ ] Páginas de board, histórico e configurações como marcadores vazios.
- [ ] Commit `feat(web): navegação principal`.

### Tarefa 4 — Gestão de projetos [front]
**Arquivos:** `src/features/projects/*`
- [ ] Testes: criar navega para o novo; slug sugerido; arquivar pede confirmação e vai para outro projeto ou para "nenhum projeto".
- [ ] e2e `projects.spec.ts`: criar, renomear, arquivar; em 375px a página não rola na horizontal.
- [ ] Commit `feat(web): criar, renomear e arquivar projetos`.
