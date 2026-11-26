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
