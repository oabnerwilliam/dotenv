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

## Plano de implementação

### Contratos (`shared/src/environment-edit.ts`)
```ts
editEnvironmentSchema = {
  version: int, usage: 'free'|'in_use',
  ticket: { key: ≤40|null, title: ≤200|null, jiraStatus: ≤40|null },
  devName: ≤80|null, qaName: ≤80|null,
  services: { serviceId, branch: ≤200|null, deployedAt: datetime|null }[] ≤50 }
// resposta: EnvironmentView
// eventData 'edited' = { changes: Change[] }
type Change = { field: 'usage'|'ticketKey'|'ticketTitle'|'ticketJiraStatus'|'dev'|'qa'|'branch'|'deployedAt',
                service?: string, from: string|null, to: string|null }
diffEnvironment(before: EnvironmentView, input: EditEnvironment): Change[]   // função pura
```

### Tarefa 1 — Diferenças [back]
- [ ] Testes: sem mudança → `[]`; vazio e `null` são iguais; mudança de branch inclui o nome do serviço; o texto mantém a caixa.
- [ ] Commit `feat(shared): diferenças de edição de ambiente`.

### Tarefa 2 — API [back]
**Rota:** `PATCH /projects/:project/environments/:env/details` (separada do `PATCH` de cadastro da história 06).
**Regras:** atualização condicionada à versão (`updateMany where {id, version}`), senão 409 `VERSION_CONFLICT`; branch alterada sem `deployedAt` novo → agora; branch removida → `deployedAt null`; `usageSince` muda só com `usage`; ticket com os três campos vazios → sem ticket; um evento `edited` na mesma transação.
- [ ] int-spec para cada regra, mais: sem mudança não incrementa a versão nem gera evento; `serviceId` de outro projeto → 400; isolamento → 404; dois envios simultâneos → um vence.
- [ ] Commit `feat(api): edição manual de ambiente`.

### Tarefa 3 — Formulário [designer, depois front]
**Arquivos:** `docs/design/screens/App-Drawer-Editar.html`; `src/features/environment/EditForm.tsx`; parâmetro `?acao=editar` (nuqs, `acaoParser` em `lib/urlState.ts`)
- [ ] React Hook Form, com `useFieldArray` nos serviços. Os valores iniciais e a `version` vêm de `defaultValues` na abertura; não usar a opção `values`, que sobrescreveria o digitado a cada nova busca.
- [ ] Testes: preenchido com os dados atuais; sugestões de membros via `datalist`, aceitando texto livre; data em horário local convertida para UTC; Cancelar descarta; 409 mostra "Outra pessoa alterou este ambiente" com "Recarregar", preservando o digitado até a pessoa decidir.
- [ ] A atualização automática não sobrescreve o formulário aberto (teste com nova busca durante a digitação).
- [ ] e2e: editar branches e ver `⚠ 3/4` no card.
- [ ] Commit `feat(web): editar informações do ambiente`.
