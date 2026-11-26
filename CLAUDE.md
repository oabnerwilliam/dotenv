# .env — Gerenciador de ambientes de homologação

A sessão principal do Claude atua como **orquestrador**: recebe o pedido, aciona os agentes na ordem certa, passa o material de um para o outro e decide quando uma história está pronta. Subagentes não chamam outros subagentes.

- Spec: `docs/superpowers/specs/2026-11-25-env-fase1-design.md`
- Roteiro: `docs/superpowers/plans/2026-11-25-env-fase1.md`
- Convenções e contratos: `docs/superpowers/plans/2026-11-26-env-fase1-convencoes.md`
- Histórias, cada uma com seu plano de implementação: `docs/backlog/NN-slug.md`
- Design: `docs/design/`

## O time (`.claude/agents/`)

| Agente | Função | Entrega |
|---|---|---|
| `planejador` | Confere e ajusta o plano da história contra o código real | história atualizada |
| `designer` | Desenha o que falta e adapta telas | `docs/design/` |
| `dev-back` | API, banco e `packages/shared`, com TDD | código + testes |
| `dev-front` | Interface, com TDD | código + testes |
| `revisor` | Code review, segurança e os cinco portões | APROVADO / MUDANÇAS |
| `homologador` | Só com UI: usa o app no navegador | APROVADO / REPROVADO |

## Fluxo de cada história

1. O usuário escolhe a história (ou uma sequência). O **planejador** confere o plano contra o código atual e ajusta o que ficou defasado.
2. **Designer**, se houver tela nova ou alterada. Mudança visual grande volta para o usuário aprovar.
3. Em sessão interativa, o orquestrador apresenta a abordagem e **espera a aprovação**. Em sessão autônoma, vale a seção abaixo.
4. O orquestrador atualiza a `main` e cria a branch `feat/NN-slug` (ou `fix/`, `chore/`).
5. **dev-back** e **dev-front** implementam. Primeiro o contrato em `packages/shared`; depois podem rodar em paralelo. Entregam etapas com mensagem de commit; o orquestrador commita.
6. **Revisor**; com UI, o **homologador** em paralelo.
7. Bloqueante ou importante: o dev corrige numa leva só e o revisor confere a correção. Sugestões viram registro no PR.
8. Aprovado: push, PR com um comentário de pareceres, marcar a história como concluída e merge com squash.

Ao repassar trabalho, informar sempre: caminho da história, pedido original, branch e arquivos a ler. Ao final, explicar ao usuário o que o código faz e por quê (aprendizado faz parte do objetivo).

## Sessões autônomas (em segundo plano)

O plano escrito em cada história, aprovado pelo usuário, autoriza implementá-la sem nova confirmação quando o usuário pedir uma sessão autônoma.

- Pode seguir para a próxima história pedida somente depois do merge da anterior, respeitando as dependências do roteiro.
- Ajustes técnicos pequenos (versão, nome, arquivo) são decididos na hora e registrados no PR.
- Tela nova que usa só componentes e tokens existentes segue sem aprovação; anexar screenshots no PR para o usuário revisar depois.
- Ao terminar cada história: marcar `**Estado:** concluída` e os passos feitos.

**Parar e perguntar** (deixando o trabalho na branch e explicando o ponto):
- falta credencial, segredo, conta externa ou programa que só o usuário pode providenciar;
- critério de aceite ou spec contradiz a realidade e a saída muda o comportamento do produto;
- seria preciso mudar a identidade visual, a stack ou afrouxar uma regra de segurança;
- ação destrutiva ou irreversível fora do fluxo normal de PR;
- o git-guard bloqueou algo;
- portões continuam vermelhos após três tentativas de correção;
- história 12 (publicação).

Nunca fazer merge com portão vermelho, teste pulado ou parecer REPROVADO.

## Portões (todos verdes antes do merge)

```
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```
Passam a existir na história 01.

## Regras do projeto

- Monorepo pnpm: `apps/web` (React, Vite, Tailwind v4), `apps/api` (NestJS, Prisma), `packages/shared`.
- O front nunca acessa tabelas do Supabase; usa o Supabase só para login. RLS ligado sem políticas públicas.
- Toda consulta filtrada pela equipe do usuário.
- Antes de mexer em UI: `docs/design/docs/DESIGN.md`, `COMPONENTS.md`, `SCREENS.md`, `tokens.css` e o HTML da tela em `docs/design/screens/`. **A spec vence o design quando divergirem.**
- Texto de interface em Inter; dados (ambientes, tickets, branches, serviços, PRs) em fonte mono.
- Nome de ambiente sempre por `<EnvName>`. Status sempre por `data-status`.
- Nada de hex solto. Alvos ≥ 44px. Ícones com `aria-hidden` ou `aria-label`.
- Minúsculas só por classe, nos pontos definidos no `DESIGN.md`; nunca `toLowerCase()` em dados exibidos.
- Interface em pt-BR.
- Repositório **público**: nunca commitar segredos, `.env*` ou nomes e dados reais de empresa ou pessoas. Usar os fictícios (Acme, Atlas, Vega, Lyra, Hydra).

## Git e GitHub

- Remoto: `git@github-personal:oabnerwilliam/dotenv.git` (conta pessoal `oabnerwilliam`).
- `gh` sempre com `GH_TOKEN=$(gh auth token --user oabnerwilliam) gh ...`. Nunca usar `gh auth switch`.
- Conventional Commits em português, **sem** linha `Co-Authored-By` e sem menção a Claude em commits e PRs. No squash, informar assunto e corpo explicitamente (`--subject` e `--body`).
- A `main` recebe mudanças só por PR, com squash (exceto o commit inicial de documentação).
- Git e gh de escrita: só o orquestrador, de dentro do repositório. Agentes usam apenas `git status`, `diff` e `log`.
- Se o git-guard bloquear algo, parar e avisar o usuário. Nunca contornar.
