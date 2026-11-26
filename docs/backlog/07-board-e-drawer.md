# 07 — Board e drawer

**Estado:** a fazer · **Depende de:** 06 · **Spec:** §7, §8 · **Telas:** `App-Board*`, `App-Drawer*`

Como membro, quero ver o estado de todos os ambientes e os detalhes de cada um.

## Critérios de aceite
- [ ] Quatro colunas (livres, reservados, em uso, bloqueados) com contagem.
- [ ] Cards conforme `EnvCard`, nas variações por status.
- [ ] Clicar num token de contagem destaca a coluna; clicar de novo limpa.
- [ ] Clicar no card abre o drawer em `/p/:projeto/ambientes/:ambiente`; o link direto funciona.
- [ ] O drawer mostra Ligado a, Serviços e Pessoas, com a origem de cada dado.
- [ ] Esc, X e scrim fecham; o foco volta ao card.
- [ ] Consistência: mesmo nome ou mesmo ticket alinham; todos nas próprias bases alinham.
- [ ] Divergência aparece no card e no drawer, apontando o serviço; empate segue a spec §7.
- [ ] Serviço sem branch aparece como "—" e não conta; validação desligada não gera aviso.
- [ ] Estados vazio, carregando e erro (mantendo os últimos dados).
- [ ] Botão atualizar; atualização a cada 30 s e ao focar a aba.
- [ ] `calcularStatus` e `analisarBranches` em `packages/shared`, com testes (contratos no roteiro).

## Fora de escopo
As ações em si (08–10): nesta história os botões ainda não aparecem.

## Plano de implementação

### Contratos (`shared/src/{board,status,consistency}.ts`)
Assinaturas de `calcularStatus` e `analisarBranches` no roteiro.
```ts
person = { name, origin }
environmentViewSchema = {
  id, slug, name, type, githubEnvironment|null, version,
  status: EnvStatus, statusSince, usage: 'free'|'in_use',
  ticket: { key|null, title|null, jiraStatus|null, origin } | null,
  dev: person|null, qa: person|null,
  services: { serviceId, name, baseBranch, order, branch|null, deployedAt|null, origin }[],
  lastDeployAt|null,
  consistency: { total, alinhados, divergentes: string[] } | null,   // null se desligada ou total 0
  reservation: { id, by:{userId,name,avatarUrl|null}, expiresAt|null, note|null, createdAt } | null,
  block: { id, by:{userId,name,avatarUrl|null}, reason, description, forecast|null, createdAt } | null }
boardSchema = { environments: environmentViewSchema[]; generatedAt }
```
`calcularStatus` recebe `uso: 'livre'|'uso'`; a API converte `usage` `free`/`in_use`. `reason` é `string` até a história 10 restringir.

### Tarefa 1 — Regras puras [back]
**Algoritmo de `analisarBranches`:** considerar só serviços com branch. Se todos estão na própria base, todos alinhados. Senão, agrupar com união transitiva: mesma branch (texto exato), mesmo ticket (`extractTicket`), ou ambos na própria base. Referência = maior grupo; empate → o que contém o ticket do ambiente; novo empate → o que contém o serviço de menor `ordem`. `divergentes` = nomes fora da referência, na ordem dos serviços.
- [ ] `status.test`: ordem bloqueio > reserva > uso; reserva com `expiraEm <= agora` é ignorada; `expiraEm null` vale.
- [ ] `consistency.test`: 4 iguais; nomes diferentes com mesmo ticket; `main` e `master` nas bases → alinhados; 3 na feature e `batch` na base → `divergentes ['batch']`; empate 2×2 decidido pelo ticket e pela ordem; branch `null` fora do total; nenhuma branch → total 0; regex inválida agrupa só por nome e base.
- [ ] Commit `feat(shared): status e consistência de branches`.

### Tarefa 2 — API do board [back]
**Arquivos:** `src/board/*`, `src/environments/environment-view.ts` (`toView(env, project, now): EnvironmentView`, reutilizado em 08–10)
- [ ] int-spec: só ativos, por nome; `statusSince` = criação do bloqueio ou da reserva (`null` até 09 e 10), senão `usageSince`; `lastDeployAt` = maior `deployedAt`; número de consultas não cresce com o de ambientes; isolamento → 404.
- [ ] Commit `feat(api): board do projeto`.

### Tarefa 3 — Board [designer, depois front]
**Arquivos:** `src/features/board/{BoardPage,StatusLine,EnvColumn,EnvCard,ConsistencyLabel}.tsx`, `useBoard.ts`, `src/lib/tempo.ts` (`tempoRelativo(data: Date, agora: Date): string` em pt-BR)
**Produz:** `useBoard(slug)` com `refetchInterval: 30_000` e `refetchOnWindowFocus: true`, mantendo os dados anteriores em erro. `EnvCard({ env, actions?: ReactNode })`.
- [ ] Testes: colunas e contagens; o token alterna `aria-pressed` e esmaece as outras colunas; variações do card; botão dentro do card não abre o drawer; vazio leva a Configurações; carregando com `role="status"`; erro com dados mostra a faixa e mantém os cards; "+ Novo" leva à criação de ambiente.
- [ ] Commit `feat(web): board de ambientes`.

### Tarefa 4 — Drawer [front]
**Arquivos:** `src/features/environment/{EnvironmentDrawer,LinkedSection,ServicesTable,PeopleSection,OriginTag}.tsx`, rota filha `ambientes/:env`
**Produz:** `EnvironmentDrawer` com um `footer` por status, preenchido por 08–10.
- [ ] Testes: link direto abre; ambiente inexistente mostra aviso e volta ao board; fechar devolve o foco ao card; o aviso de divergência nomeia o serviço; ticket e pessoas vazios mostram "—".
- [ ] e2e `board.spec.ts` com dados de `e2e/support/seed.ts` (`seedProject(options)`), em desktop e 375px, com axe.
- [ ] Commit `feat(web): drawer do ambiente`.
