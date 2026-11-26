# 08 — Editar ambiente

**Estado:** a fazer · **Depende de:** 07 · **Spec:** §6, §7, §8 · **Tela:** `App-Drawer-Editar` (designer adapta)

Como membro, quero registrar à mão o que está em cada ambiente.

## Critérios de aceite
- [ ] Editar disponível em todos os status.
- [ ] Campos: uso (livre/em uso), ticket (chave, título, status no Jira), Dev, QA e, por serviço, branch e data de deploy.
- [ ] Ao mudar uma branch sem informar data, o deploy assume agora.
- [ ] Dev e QA aceitam texto livre, com sugestão dos membros.
- [ ] Salvar atualiza card e drawer; Cancelar descarta.
- [ ] Cada dado alterado fica com origem "manual".
- [ ] `usoDesde` muda só quando o uso muda.
- [ ] O histórico registra o que mudou, de quê para quê e por quem; salvar sem mudança não gera evento.
- [ ] Se outra pessoa salvou depois da abertura do formulário, o envio é recusado com aviso, sem sobrescrever.
- [ ] Texto digitado nunca muda de caixa.

## Fora de escopo
Valor detectado e "restaurar", busca no Jira.
