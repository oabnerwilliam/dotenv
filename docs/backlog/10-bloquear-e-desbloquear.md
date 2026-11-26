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
