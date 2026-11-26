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
- [ ] Regex inválida, longa demais ou com risco de travar é recusada ao salvar.
- [ ] Salvar e Descartar como no design; erros aparecem no campo.
- [ ] Criar e arquivar ambiente geram evento no histórico (tabela Event).
- [ ] Isolamento entre equipes testado.

## Notas técnicas
- Cria Service, Environment, EnvironmentService e Event.
- O registro de eventos é um serviço único da API, usado pelas histórias 08–10.

## Fora de escopo
Regras do Jira, liberação automática, importação do GitHub.
