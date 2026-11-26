# 06 — Configurações do projeto

**Estado:** a fazer · **Depende de:** 05 · **Spec:** §6, §7, §8 · **Tela:** `App-Config`

Como membro, quero cadastrar serviços, ambientes e regras do projeto.

## Critérios de aceite
- [ ] Serviços: criar, editar, ordenar e remover (nome, repositório opcional, branch base).
- [ ] Remover serviço pede confirmação e apaga as branches registradas dele.
- [ ] Ambientes: criar, editar e arquivar (nome, tipo, GitHub environment opcional).
- [ ] Nome de ambiente único no projeto sem diferenciar maiúsculas, guardado como digitado.
- [ ] Arquivar ambiente com reserva ou bloqueio aberto é recusado com explicação.
- [ ] Regras: regex do ticket, prazo padrão e validação de consistência.
- [ ] Regex inválida, não suportada ou com mais de 100 caracteres é recusada ao salvar; a execução usa um motor de tempo linear (RE2), que não trava.
- [ ] Salvar e Descartar como no design; erros aparecem no campo.
- [ ] Criar e arquivar ambiente geram evento no histórico (tabela Event).
- [ ] Isolamento entre equipes testado.

## Notas técnicas
- Cria Service, Environment, EnvironmentService e Event.
- O registro de eventos é um serviço único da API, usado pelas histórias 08–10.

## Fora de escopo
Regras do Jira, liberação automática, importação do GitHub.

## Plano de implementação

### Contratos (`shared/src/{settings,events,ticket}.ts`)
```ts
serviceSchema = { id, name: 1..40, repository: ≤140|null, baseBranch: 1..120, order: int }
serviceInputSchema = { name, repository, baseBranch }
serviceOrderSchema = { ids: uuid[] ≤50 }                // exatamente os serviços do projeto
envTypeSchema = 'internal'|'external'|'base'            // rótulos Interno, Externo, Base
environmentInputSchema = { name: 1..40, type, githubEnvironment: ≤80|null }
rulesSchema = { ticketRegex, defaultDuration: Duration, validateConsistency: boolean }
validateTicketRegex(pattern: string): string | null             // mensagem de erro ou null
extractTicket(texto: string, pattern: string): string | null    // 1ª ocorrência, em maiúsculas
originSchema = 'manual'|'github'|'jira'
eventTypeSchema = 'environment_created'|'environment_archived'|'edited'|'reserved'|'released'|'expired'|'blocked'|'unblocked'
eventDataSchema = discriminatedUnion('type', …)          // esta história define os dois primeiros
```
`Duration` é declarado aqui, em `shared/src/duration.ts`. Texto com espaços nas pontas é aparado; vazio vira `null` nos opcionais.

### Tarefa 1 — Regex de ticket [back]
- [ ] `ticket.test` (usa `re2js`, sem diferenciar maiúsculas): `extractTicket('feat/ac-12-x','[A-Z]+-\\d+') === 'AC-12'`; sem ocorrência → `null`; padrão inválido → `null`, sem lançar.
- [ ] `validateTicketRegex`: recusa vazio, mais de 100 caracteres, `(` e referência retroativa `(a)\\1`; aceita o padrão; `(a+)+$` contra 10 000 caracteres termina em menos de 1 s.
- [ ] Commit `feat(shared): extração segura de ticket`.

### Tarefa 2 — Schema e eventos [back]
**Modelos:**
- `Service(id, projectId, name, repository?, baseBranch, order)` único `(projectId, name)`.
- `Environment(id, projectId, name, slug, type, githubEnvironment?, usage 'free'|'in_use' default 'free', usageSince default now, usageOrigin, ticketKey?, ticketTitle?, ticketJiraStatus?, ticketOrigin, devName?, devOrigin, qaName?, qaOrigin, version default 0, archivedAt?, createdAt)` com índices únicos parciais `(project_id, lower(name))` e `(project_id, slug)` `WHERE archived_at IS NULL`.
- `EnvironmentService(environmentId, serviceId, branch?, deployedAt?, branchOrigin)`, apagado em cascata com o serviço.
- `Event(id, projectId, environmentId, actorId?, type, data Json, origin, occurredAt, dedupeKey? unique)` índice `(projectId, occurredAt, id)`.
- Todas as origens com padrão `manual`.

**Produz:** `EventsService.record(tx, { projectId, environmentId, actorId, data, occurredAt, dedupeKey? }): Promise<void>`.
- [ ] int-spec: `record` repetido com a mesma `dedupeKey` não duplica nem aborta a transação (`createMany` com `skipDuplicates`). RLS coberto pelo teste existente.
- [ ] Commit `feat(api): modelos de ambientes, serviços e eventos`.

### Tarefa 3 — API de configurações [back]
**Rotas (sob `/projects/:project`):** `GET/POST services`, `PATCH/DELETE services/:id`, `PUT services/order`; `GET/POST environments`, `PATCH environments/:env`, `POST environments/:env/archive`; `GET/PUT rules`.
- [ ] int-spec: nome repetido sem diferenciar maiúsculas → 409 `fields.name`; nome arquivado pode ser reutilizado; slug ganha `-2` se colidir; renomear não muda o slug; criar e arquivar geram evento; remover serviço apaga as branches; regex inválida → 400 `fields.ticketRegex`; ids alheios → 404.
- [ ] Um projeto aceita até 50 serviços: o 51º → 400.
- [ ] Ponto de extensão `EnvironmentsService.assertCanArchive(environmentId)`, vazio aqui; as histórias 09 e 10 o implementam com teste.
- [ ] Commit `feat(api): configurações do projeto`.

### Tarefa 4 — Tela [designer, depois front]
**Arquivos:** `src/features/settings/{SettingsPage,EnvironmentsPanel,ServicesPanel,RulesPanel}.tsx`
- [ ] Modais e painel Regras com React Hook Form; Salvar e Descartar usam `isDirty` e `reset`.
- [ ] Testes: tabela e modais de criar e editar; ordenar por botões "subir" e "descer"; remover serviço e arquivar ambiente pedem confirmação; Salvar e Descartar valem para o painel Regras e ficam desativados sem mudança.
- [ ] e2e `settings.spec.ts`: criar 4 serviços e 2 ambientes, salvar uma regra, recarregar.
- [ ] Commit `feat(web): tela de configurações`.
