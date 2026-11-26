# 10 — Bloquear e desbloquear

**Estado:** a fazer · **Depende de:** 09 · **Spec:** §7 · **Telas:** `App-Bloquear`, `App-Drawer-Bloqueado`

Como membro, quero sinalizar que um ambiente não pode ser usado e por quê.

## Critérios de aceite
- [ ] Bloquear a partir de livre, reservado ou em uso.
- [ ] Motivo: Migração de banco, Deploy quebrado, Manutenção de infra, Outro.
- [ ] Descrição obrigatória, exibida no card; previsão opcional e informativa.
- [ ] No máximo um bloqueio aberto por ambiente, garantido no banco.
- [ ] Bloqueado oferece só Desbloquear e Editar; a API recusa reservar e liberar.
- [ ] Desbloquear volta ao status por baixo; reserva ainda válida continua.
- [ ] Reserva que vence durante o bloqueio é encerrada normalmente.
- [ ] Bloqueio e desbloqueio vão para o histórico.

## Fora de escopo
Notificações, desbloqueio automático.

## Plano de implementação

### Contratos (`shared/src/block.ts`)
```ts
blockReasonSchema = 'db_migration'|'broken_deploy'|'infra'|'other'
BLOCK_REASON_LABEL   // Migração de banco, Deploy quebrado, Manutenção de infra, Outro
blockSchema = { reason, description: 1..280 (aparada), forecast: datetime|null }
unblockSchema = { expectedBlockId: uuid }
// eventData: blocked {reason, description} · unblocked {}
```

### Tarefa 1 — API [back]
**Modelo:** `Block(id, environmentId, userId, reason, description, forecast?, createdAt, endedAt?, endedById?)` com índice único parcial `(environment_id) WHERE ended_at IS NULL`.
**Rotas:** `POST …/environments/:env/block` e `…/unblock`; qualquer membro.
- [ ] int-spec: bloquear a partir de livre, reservado e em uso; segundo bloqueio e corrida → 409 `STATE_CHANGED`; reservar e liberar bloqueado → 409; desbloquear volta a reservado quando a reserva vale e a livre quando venceu durante o bloqueio; `expectedBlockId` antigo → 409; descrição só com espaços → 400; arquivar bloqueado → 409; isolamento → 404.
- [ ] Preencher `block` em `toView`.
- [ ] Commit `feat(api): bloquear e desbloquear`.

### Tarefa 2 — Interface [designer, depois front]
**Arquivos:** `App-Bloquear` adaptada (sem avisar pessoas); `src/features/actions/BlockModal.tsx`; botões do drawer conforme a tabela da spec §7
- [ ] Testes: ações por status exatamente como a tabela (um teste parametrizado nos quatro); descrição obrigatória com erro no campo; o card mostra `! <descrição>`; desbloquear em um clique, sem enviar duas vezes.
- [ ] e2e: reservar → bloquear → desbloquear → continua reservado.
- [ ] Commit `feat(web): bloqueio de ambiente`.
