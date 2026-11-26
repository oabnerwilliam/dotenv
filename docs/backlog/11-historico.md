# 11 — Histórico

**Estado:** a fazer · **Depende de:** 10 · **Spec:** §7 · **Tela:** `App-Historico`

Como membro, quero ver o que aconteceu com os ambientes do projeto.

## Critérios de aceite
- [ ] Eventos mais recentes primeiro, agrupados por dia no fuso do navegador.
- [ ] Linha com hora, ambiente, texto (verbo em negrito, branches e tickets em mono), autor e origem.
- [ ] Filtros por ambiente, tipo e período (Hoje, 7 dias, 30 dias), refletidos na URL.
- [ ] Muitos eventos carregam em páginas, sem repetir nem pular.
- [ ] Eventos de ambientes arquivados continuam visíveis.
- [ ] Autor removido da equipe continua identificado.
- [ ] Antes de abrir a tela, reservas vencidas do projeto são encerradas.
- [ ] Estados vazio, filtro sem resultado, carregando e erro.
- [ ] Isolamento entre equipes testado.

## Fora de escopo
Exportação, edição ou exclusão de eventos.

## Plano de implementação

### Contratos (`shared/src/history.ts`)
```ts
eventQuerySchema = { environment?: slug, type?: EventType, from?: datetime, cursor?: string, limit: 1..100 = 50 }
eventViewSchema = { id, type, data, origin, occurredAt, actor: {name}|null,
                    environment: { slug, name, status: EnvStatus|null, archived: boolean } }
eventPageSchema = { items: eventViewSchema[]; nextCursor: string|null }
```

### Tarefa 1 — API [back]
**Rota:** `GET /projects/:project/events`; ordem `occurredAt desc, id desc`; cursor opaco (base64 de `occurredAt|id`).
- [ ] int-spec: chama `expireDue` antes; 120 eventos com horários repetidos paginados sem repetir nem pular; evento novo entre páginas não desloca; cada filtro e combinação; cursor inválido → 400; autor removido continua com nome; isolamento → 404.
- [ ] O filtro por ambiente usa o ativo com aquele slug e, sem ativo, o arquivado mais recente.
- [ ] Commit `feat(api): histórico do projeto`.

### Tarefa 2 — Texto e datas [front]
**Arquivos:** `src/features/history/{eventText.tsx,groupByDay.ts,periodo.ts}`
**Produz:** `eventText(event: EventView): ReactNode`; `groupByDay(items: EventView[], now: Date): { label: string; items: EventView[] }[]` (rótulos `Hoje · quarta, 25 nov`, `Ontem · terça, 24 nov`, `Segunda, 23 nov`); `periodoFrom(p: 'today'|'7d'|'30d', now: Date): Date` (meia-noite local; 7 e 30 dias incluem hoje).
- [ ] Testes: um texto por tipo de evento (verbo em negrito, branches e tickets em mono); virada de dia e de ano no fuso local.
- [ ] Commit `feat(web): formatação do histórico`.

### Tarefa 3 — Tela [designer, depois front]
**Arquivos:** `src/features/history/{HistoryPage,HistoryFilters,HistoryRow}.tsx`; parâmetros `?ambiente=&tipo=&periodo=` (padrão `7d`)
- [ ] Testes: filtros leem e escrevem a URL (valor desconhecido cai no padrão); "Carregar mais"; o mesmo dia dividido entre páginas vira um grupo; vazio, sem resultado, carregando e erro; em largura estreita rola só a tabela.
- [ ] e2e: ações geram linhas na ordem certa.
- [ ] Commit `feat(web): tela de histórico`.
