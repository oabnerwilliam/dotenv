# .env — Design da Fase 1 (CRUD)

Data: 2026-11-25 · Status: aprovado em 2026-11-25 · Revisado em 2026-11-26 (estado no front e segurança)

Itens marcados com **(proposta)** partiram de quem escreveu o documento e foram aprovados junto com ele.

O repositório é público: empresa, produtos, pessoas e ambientes citados nos documentos e telas são **fictícios**.

## 1. Intenção

O `.env` é um gerenciador de ambientes de homologação. Cada projeto tem um board que mostra se cada ambiente está **livre, reservado, em uso ou bloqueado**, qual ticket e branches estão nele e quem é o Dev e o QA. O primeiro uso será no trabalho do autor (projeto Atlas, serviços `ui`, `server`, `batch` e `menu`). No futuro é um produto B2B.

O valor completo depende das integrações com GitHub e Jira. Elas são muito importantes, mas serão feitas depois, com cuidado. A Fase 1 é o controle **manual**, com o modelo de dados pronto para receber as integrações.

## 2. Objetivos, não objetivos e anti-objetivos

### Entra na Fase 1
- Login com Google (OAuth 2.0 via Supabase Auth).
- Uma equipe, vários projetos, convite de membros.
- Cadastro de projetos, ambientes e serviços.
- Board, drawer do ambiente e edição manual de status, ticket, branches, Dev e QA.
- Reservar, liberar, bloquear e desbloquear.
- Aviso de serviços divergentes.
- Histórico.
- Publicação no ar, como último passo, com a fase pronta.

### Fica para depois
- GitHub e Jira: sincronização, status automático, onboarding de conexões, erro de sync, liberação automática, importação de ambientes.
- Login com GitHub, e-mail/senha, várias equipes por pessoa, cadastro aberto de empresas, permissões detalhadas.
- Busca ⌘K, envio de e-mails e notificações, fila de espera.

### Anti-objetivos (seria falha mesmo funcionando)
- Dados de uma equipe acessíveis por outra, ou por quem não foi convidado.
- Tabelas acessíveis direto pelo navegador, sem passar pela API.
- Modelo que exija refazer tudo para entrar GitHub/Jira, ou sincronização que um dia sobrescreva o que foi editado à mão.
- Segredos ou dados reais da empresa no repositório.
- Interface que se afaste das telas de `docs/design/` sem motivo registrado.

## 3. Restrições
- Monorepo, front e back separados: React + Vite + Tailwind CSS v4 e NestJS.
- Banco Postgres no Supabase.
- Repositório **público** `oabnerwilliam/dotenv` (remoto `git@github-personal:oabnerwilliam/dotenv.git`). Nunca commitar segredos, `.env*` ou nomes e dados reais de empresa ou pessoas.
- Ambiente atual: Node 22, pnpm 10, Docker 28, Windows 11.
- O autor está aprendendo: entregas devem explicar o que o código faz e por quê.

## 4. Abordagens consideradas

| Abordagem | A favor | Contra |
|---|---|---|
| **A. Supabase Auth + Postgres, NestJS controla tudo** (escolhida) | Pouco código de autenticação, regras num lugar só, pronto para integrações | Login depende do Supabase |
| B. NestJS faz o OAuth do Google; Supabase só banco | Controle total | Manter sessão e tokens é arriscado e trabalhoso |
| C. Front acessa o Supabase direto | Menos código no início | NestJS quase vazio, regras espalhadas (descartada) |

Escolha: **A**, por decisão do autor.

```
React ──login Google──> Supabase Auth ──JWT──> React
React ──REST + JWT──> NestJS ──Prisma──> Postgres (Supabase)
```

## 5. Arquitetura

### Estrutura **(proposta)**
```
apps/web          React, Vite, Tailwind v4, react-router, TanStack Query, React Hook Form, Zustand, nuqs, Radix UI, lucide-react
apps/api          NestJS, Prisma
packages/shared   tipos, enums, schemas de validação (Zod) e a regra de consistência de branches
docs/design       pacote de design (referência visual)
supabase/         configuração do Supabase local
```
- pnpm workspaces.
- Desenvolvimento e testes usam o Supabase local (CLI + Docker). O projeto na nuvem é criado na publicação.
- Testes: Jest na API, Vitest no web e em `shared`, Playwright ponta a ponta.
- Portões: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`.

### Estado no front
| Tipo de estado | Ferramenta | Exemplos |
|---|---|---|
| Dados do servidor | TanStack Query (React Query) | board, `/me`, membros, histórico; ações com `useMutation` |
| Formulários | React Hook Form com os schemas Zod de `shared` | criar equipe, convite, projeto, editar, reservar, bloquear |
| Estado global do navegador | Zustand | menu lateral recolhido |
| Estado na URL (depois do `?`) | nuqs | filtros do histórico, ação aberta, coluna destacada |

- Dado do servidor não é copiado para o Zustand.
- O que identifica um recurso fica no caminho da rota (`/p/:projeto/ambientes/:ambiente`).

### Autenticação e acesso
1. O front faz login com Google pelo Supabase e envia o token em cada requisição.
2. A API valida assinatura, emissor e expiração do token (chaves públicas do Supabase).
3. A API só aceita e-mail verificado pelo Google que pertença a um membro ou a um convite pendente. No primeiro acesso, o convite vira membro, ligado ao id do usuário no Supabase.
4. Quem não foi convidado vê a tela "sem permissão".
5. A variável `OWNER_EMAIL` define quem pode criar a equipe quando ainda não existe nenhuma; essa pessoa vira admin. **(proposta)**
6. RLS ligado em todas as tabelas, sem políticas públicas. Só a API acessa o banco.
7. Toda consulta é filtrada pela equipe do usuário, com teste automatizado de isolamento entre equipes.

O login Google exige credenciais OAuth criadas no Google Cloud. Esse passo é do autor, com roteiro.

A API não guarda senha nem sessão. O token diz apenas quem é a pessoa; equipe e papel são consultados no banco a cada requisição. O Prisma conecta com um usuário que ignora o RLS, então dentro da API a barreira entre equipes é o filtro por equipe.

### Onde fica o token
| Abordagem | A favor | Contra |
|---|---|---|
| **Padrão do Supabase no `localStorage`, com CSP** (escolhida pelo autor em 2026-11-26) | Simples; sem cookie, não há CSRF | Um XSS consegue ler o token |
| API intermedeia o login com cookie `httpOnly` | O JavaScript não lê o token | A API passa a manter sessão, tratar CSRF e cookies entre domínios |

### Segurança
| Risco | Medida | História |
|---|---|---|
| Modo de teste ligado no ar | `AUTH_TEST_MODE` só vale com `NODE_ENV=test` | 03 |
| Interceptação do login | Fluxo PKCE e lista fechada de URLs de retorno | 03 |
| XSS | CSP e cabeçalhos no front; `dangerouslySetInnerHTML` proibido no lint | 01, 12 |
| Abuso e força bruta | Limite de requisições por IP, com o proxy da hospedagem configurado | 03, 12 |
| Cabeçalhos HTTP | `helmet` na API | 01 |
| Entrada gigante | Limite de tamanho em textos e listas dos schemas | 06, 08 |
| Token ou e-mail em log | Logs sem `Authorization`, tokens, e-mails ou corpo de requisição | 01 |
| Segredo no repositório público | Secret scanning com push protection e `gitleaks` no CI | 01 |
| Dependência maliciosa ou vulnerável | Dependabot, `pnpm audit` e `minimumReleaseAge` | 01 |
| CI com permissão demais | `contents: read` e actions fixadas por SHA | 01 |
| Segunda porta para o banco | Acessos de `anon` e `authenticated` revogados, além do RLS; Data API desligada na nuvem | 03, 12 |
| Cache de outra pessoa no mesmo navegador | Sair limpa o cache do React Query | 03 |

### Papéis **(proposta)**
| Ação | Admin | Membro |
|---|---|---|
| Convidar, cancelar convite, remover membro | sim | não |
| Projetos, ambientes, serviços e regras | sim | sim |
| Editar, reservar, bloquear, desbloquear | sim | sim |
| Liberar reserva de outra pessoa | sim | não |

O último admin não pode ser removido. Convite é só o cadastro do e-mail; o admin avisa o colega por fora.

## 6. Modelo de dados

| Entidade | Campos principais |
|---|---|
| Team | nome, slug |
| User | supabaseId, e-mail, nome, avatar |
| Membership | team, user, papel (admin/membro) |
| Invite | team, e-mail, papel, estado |
| Project | team, nome, slug, regex do ticket (padrão `[A-Z]+-\d+`), prazo padrão (1 dia), validar consistência (ligado) |
| Service | project, nome, repositório (opcional), branch base, ordem |
| Environment | project, nome (caixa original), tipo (interno/externo/base), githubEnvironment (opcional), uso (livre/em uso), usoDesde, ticket (chave, título, status no Jira), Dev, QA, arquivadoEm |
| EnvironmentService | environment, service, branch, deployEm |
| Reservation | environment, quem, expiraEm (vazio = até liberar), nota, encerradaEm, encerradaPor |
| Block | environment, quem, motivo, descrição, previsão, encerradoEm, encerradoPor |
| Event | project, environment, autor, tipo, texto/dados, origem, quando |

- Cada dado editável (uso, ticket, Dev, QA, branch) guarda a **origem** (`manual`, `github`, `jira`). Na Fase 1 é sempre `manual`. Quando houver integração, o valor detectado é guardado à parte e não sobrescreve o manual até "restaurar". Os campos de valor detectado e o botão "restaurar" ficam para a fase de integrações.
- Dev e QA são texto livre, com sugestão dos membros, porque a pessoa pode ainda não ter conta. **(proposta)**
- Ambientes e projetos são arquivados, não apagados, para preservar o histórico. **(proposta)**

## 7. Regras de negócio

### Status exibido
Calculado nesta ordem: bloqueio aberto → **bloqueado**; senão reserva ativa → **reservado**; senão o campo `uso` → **em uso** ou **livre**. O formulário Editar só alterna entre livre e em uso; reservado e bloqueado só pelas ações. **(proposta)**

### Ações por status
| Status | Ações |
|---|---|
| livre | Reservar, Editar, Bloquear |
| reservado | Liberar, Editar, Bloquear |
| em uso | Liberar, Editar, Bloquear |
| bloqueado | Desbloquear, Editar |

O design não tem Editar em "livre" nem Liberar em "em uso". Sem GitHub/Jira eles são necessários. **(proposta)**

### Reservar, liberar, bloquear
- **Reservar:** só ambiente livre. Prazo: 4 horas, 24 horas, 3 dias ou até liberar. Ticket (chave e título) e nota opcionais; o ticket informado passa a ser o do ambiente.
- **Expiração:** sem tarefa agendada. Ao ler ou alterar o ambiente, a API encerra reservas vencidas, grava o evento com o horário do vencimento e limpa os mesmos campos de "Liberar".
- **Liberar:** encerra a reserva (quem reservou ou admin) ou o uso manual (qualquer membro). Volta a livre e limpa ticket, Dev e QA. As branches registradas permanecem. Nota opcional.
- **Bloquear:** motivo (Migração de banco, Deploy quebrado, Manutenção de infra, Outro), descrição obrigatória, previsão opcional e apenas informativa.
- **Desbloquear:** volta ao status por baixo (reserva ainda válida continua).
- **Concorrência:** no máximo uma reserva e um bloqueio abertos por ambiente, garantido no banco. A segunda tentativa recebe erro claro e a tela se atualiza.

### Consistência de branches
Cada serviço tem uma branch registrada no ambiente.
- Duas branches combinam se têm o **mesmo nome** ou o **mesmo código de ticket** (regex do projeto).
- Todos os serviços em suas próprias branches base também é consistente (mesmo que uma seja `main` e outra `master`).
- A referência é o maior grupo que combina; no empate, o grupo do ticket do ambiente; persistindo, o do primeiro serviço na ordem. Os demais são divergentes.
- Serviço sem branch registrada aparece como "—" e não conta no total. **(proposta)**
- Exibição: `✓ 4/4 alinhados` ou `⚠ 3/4 · batch diverge`. O número de serviços vem do projeto.

Esta regra substitui a do design, que exigia exatamente a mesma branch.

### Histórico
Eventos: reserva, liberação, expiração, bloqueio, desbloqueio, edição, ambiente criado ou arquivado. Filtros por ambiente, tipo e período (Hoje, 7 dias, 30 dias), agrupados por dia no fuso do navegador.

## 8. Telas

Referência visual: `docs/design/screens/*.html`. Comportamento: `docs/design/docs/`. **Onde este documento divergir do pacote de design, vale este documento.**

| Tela | Adaptação na Fase 1 |
|---|---|
| Login | Só "Continuar com Google" |
| Criar equipe | Só o passo da equipe (nome, slug, primeiro projeto) |
| Board, drawers | Sem indicador de sync; botão atualizar e atualização automática (30 s e ao focar a aba) |
| Editar | Ganha branch e data de deploy por serviço; sem valor detectado nem "restaurar" |
| Reservar, Liberar, Bloquear | Sem opções de avisar pessoas; ticket digitado, sem busca no Jira |
| Configurações | Ambientes, Serviços e Regras (sem regras do Jira e liberação automática) |
| Estados | Vazio sem "Importar do GitHub"; erro genérico de carregamento no lugar do erro de sync |
| Sem permissão | Sem "Pedir acesso" e sem listar administradores |
| Menu da equipe | Membros, Configurações, Sair (sem Conexões e troca de equipe) |
| **Novas (a desenhar)** | Membros e convites; criar, renomear e arquivar projeto |

Valem as regras de acessibilidade do design (alvos ≥ 44px, contraste ≥ 4.5:1, foco visível, teclado) e as rotas sugeridas, mais `/equipe/membros`. A palavra "equipe" fica numa constante única.

## 9. Erros
- API responde com código e mensagem em português; validação de entrada no servidor com os mesmos schemas do front.
- Formulários mostram erro no campo; falhas de rede mantêm os últimos dados com faixa de aviso e "Tentar de novo".
- Sessão expirada leva ao login.

## 10. Time de agentes

A sessão principal do Claude é o orquestrador (aciona agentes, faz git e gh). Agentes em `.claude/agents/`: `planejador`, `designer`, `dev-back`, `dev-front`, `revisor` e `homologador`.

Fluxo por história: planejador → designer (se houver tela nova ou alterada) → branch → dev-back e dev-front com TDD → revisor (código, segurança e portões) → homologador (navegador, quando há UI) → PR e merge com squash. Mudança visual grande volta para o autor aprovar.

## 11. Publicação
Último passo da fase. Preferência: front no **Cloudflare Pages**. Hospedagem da API a decidir (Render foi sugerido). Conferir então os termos e limites dos planos para uso no trabalho. Antes de chamar colegas, confirmar com a empresa o uso do app.

## 12. Pendência para a fase de integrações
No Atlas, o ambiente de destino é **escolhido no disparo manual** do workflow, e a API do GitHub não devolve esse valor. Será preciso, por exemplo, incluir o ambiente no `run-name` ou declarar `environment:` no job, o que muda os workflows da empresa. Investigar antes de desenhar a sincronização.

## 13. Fica a critério de quem implementar
Nomes de rotas da API, formato de erro, bibliotecas auxiliares, detalhes do esquema Prisma, organização interna dos módulos e divisão em histórias.

## 14. Fonte do design
A única fonte é `docs/design/`. As cópias antigas da raiz foram removidas.
