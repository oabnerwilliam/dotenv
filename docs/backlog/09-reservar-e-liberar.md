# 09 — Reservar e liberar

**Estado:** a fazer · **Depende de:** 08 · **Spec:** §7 · **Telas:** `App-Reservar`, `App-Liberar`, `App-Drawer-Reservado`

Como membro, quero reservar um ambiente e devolvê-lo quando terminar.

## Critérios de aceite
- [ ] Reservar só em ambiente livre, pelo card ou pelo drawer.
- [ ] Prazos: 4 horas, 24 horas, 3 dias, até liberar; o padrão vem das Configurações.
- [ ] Ticket e nota opcionais; o ticket informado passa a ser o do ambiente.
- [ ] Duas reservas simultâneas: o banco aceita uma; a outra recebe erro claro e a tela atualiza.
- [ ] Reserva vencida é encerrada na leitura ou na ação seguinte, com um único evento datado no vencimento.
- [ ] Liberar reserva: só quem reservou ou admin (403 para os demais, botão escondido).
- [ ] Liberar uso manual: qualquer membro.
- [ ] Liberar volta a livre, limpa ticket, Dev e QA e mantém as branches; nota opcional.
- [ ] Liberar algo já vencido ou liberado atualiza a tela com mensagem clara.
- [ ] Reserva, liberação e expiração vão para o histórico.

## Notas técnicas
- Índice único parcial para uma reserva aberta por ambiente. Relógio injetável para testar prazos.

## Fora de escopo
Notificações, fila de espera.

## Plano de implementação

### Contratos (`shared/src/reservation.ts`; `Duration` já existe em `duration.ts`)
```ts
// Duration = 'H4'|'D1'|'D3'|'UNTIL_RELEASED'
expiresAtFor(duration: Duration, now: Date): Date | null        // 4h, 24h, 72h, null
reserveSchema = { duration, ticketKey: ≤40|null, ticketTitle: ≤200|null, note: ≤500|null }
releaseSchema = { expectedReservationId: uuid|null, version: int, note: ≤500|null }
canRelease(env: EnvironmentView, member: { userId: string; role: Role }): boolean
// eventData: reserved {expiresAt, ticketKey, note} · released {kind:'reservation'|'usage', note} · expired {reservedById, reservedByName}
```

### Tarefa 1 — Regras puras [back]
- [ ] Testes: cada prazo; `canRelease`: quem reservou e admin liberam a reserva; outro membro não; uso manual qualquer um; livre e bloqueado → `false`.
- [ ] Commit `feat(shared): regras de reserva`.

### Tarefa 2 — Schema e expiração [back]
**Modelo:** `Reservation(id, environmentId, userId, expiresAt?, note?, createdAt, endedAt?, endedById?, endReason 'released'|'expired'?)` com índice único parcial `(environment_id) WHERE ended_at IS NULL`.
**Produz:** `ExpirationService.expireDue({ projectId, environmentId? }): Promise<void>`: uma transação por reserva, com `updateMany where {id, endedAt: null, expiresAt <= now}`; só quem de fato atualizou limpa ticket, Dev e QA, põe `usage free`, incrementa `version` e grava `expired` com `occurredAt = expiresAt` e `dedupeKey expire:<id>`.
- [ ] int-spec com `Clock` falso: vence no instante exato; chamadas concorrentes geram um evento; limpa os campos e mantém as branches.
- [ ] Chamar `expireDue` no board, na lista de ambientes e antes de editar, reservar, liberar e arquivar.
- [ ] Commit `feat(api): expiração de reservas`.

### Tarefa 3 — Reservar e liberar [back]
**Rotas:** `POST /projects/:project/environments/:env/reservation` e `…/release`.
**Reservar:** exige status `livre`, senão 409 `STATE_CHANGED`; violação do índice único → o mesmo 409; grava o ticket, se informado, e incrementa a versão.
**Liberar:** `expectedReservationId` e `version` precisam bater com o atual, senão 409 `STATE_CHANGED`; reserva de outra pessoa sem ser admin → 403; bloqueado → 409.
- [ ] int-spec: os caminhos acima; 10 reservas paralelas → exatamente 1 sucesso; liberar após vencer → 409 sem evento duplicado; arquivar com reserva aberta → 409 (`assertCanArchive`); isolamento → 404.
- [ ] Preencher `reservation` em `toView`.
- [ ] Commit `feat(api): reservar e liberar ambientes`.

### Tarefa 4 — Modais [designer, depois front]
**Arquivos:** telas `App-Reservar` e `App-Liberar` adaptadas; `src/features/actions/{ReserveModal,ReleaseModal}.tsx`, `useEnvironmentAction.ts`; parâmetro `?acao=reservar|liberar` (estende o `acaoParser`); formulários com React Hook Form
**Produz:** `useEnvironmentAction(mutation)`: no sucesso invalida board e histórico e fecha; em `STATE_CHANGED` invalida, fecha e anuncia "O ambiente mudou enquanto você decidia" numa região `role="status"`.
- [ ] Testes: o prazo padrão vem das regras; "no seu nome até …" calculado; Liberar escondido quando `canRelease` é falso; clique duplo envia uma vez; o drawer mostra quem reservou e o prazo.
- [ ] e2e: reservar pelo card e liberar pelo drawer; outro membro não vê Liberar.
- [ ] Commit `feat(web): modais de reservar e liberar`.
