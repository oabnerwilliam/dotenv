# 05 — Projetos e navegação

**Estado:** a fazer · **Depende de:** 03 · **Spec:** §6, §8 · **Design:** `DESIGN.md` (Layout), `App-Board`, `App-Menu-Equipe` · **Tela nova: designer primeiro**

Como membro, quero criar projetos e navegar entre eles.

## Critérios de aceite
- [ ] Nav superior, menu lateral e seletor de projeto como no design, sem a busca.
- [ ] O menu lateral recolhe e a escolha persiste ao recarregar.
- [ ] Menu da equipe com Membros, Configurações, dados do usuário e Sair; Esc e clique fora fecham.
- [ ] Criar projeto (nome e slug único na equipe).
- [ ] Renomear e arquivar projeto, com confirmação; arquivado some das listas.
- [ ] Rotas `/p/:projeto`, `/p/:projeto/historico` e `/p/:projeto/configuracoes`.
- [ ] Projeto inexistente ou de outra equipe responde "não encontrado".
- [ ] Teste automatizado de isolamento entre duas equipes.
- [ ] Funciona em tela estreita conforme `SCREENS.md` (Responsivo).

## Fora de escopo
Troca de equipe, Conexões, busca ⌘K, conteúdo das páginas.
