# Telas, comportamento e regras

Cada tela tem um artboard no artifact "`.env — Design final`" (mesmo nome entre parênteses).

## Modelo de dados (sugestão)
```ts
type Status = 'livre' | 'reservado' | 'uso' | 'bloqueado';
type Origem = 'github' | 'jira' | 'manual';

interface Ambiente {
  id: string; nome: string;               // "Lyra" (caixa original; exibir minúsculo por classe)
  tipo: 'interno' | 'externo' | 'base';
  githubEnvironment: string;              // "lyra"
  status: Status;
  desde?: string;                         // início do status atual
  ticket?: { chave: string; titulo: string; statusJira: string };
  branch?: string; pr?: { numero: number; aberto: boolean };
  ultimoDeploy?: string;
  servicos: { nome: 'ui'|'server'|'batch'|'menu'; branch: string; deployEm: string; ok: boolean }[];
  pessoas: { papel: 'Dev'|'QA'; usuario: Usuario; origem: Origem }[];
  reserva?: { por: Usuario; ate?: string; nota?: string };
  bloqueio?: { por: Usuario; motivo: string; descricao: string; previsao?: string; desde: string };
  manual: Partial<Record<'status'|'ticket'|'dev'|'qa', { valor: string; detectado: string }>>; // campos editados à mão
}
interface Evento { quando: string; ambiente: string; tipo: 'deploy'|'reserva'|'liberacao'|'bloqueio'|'status'; texto: string; origem: Origem }
```

## Regras de negócio
- **Origem da informação** (Tag Jira / GitHub / Manual em cada dado): deploys, branches e PRs vêm do GitHub (por *environment* e repositório); ticket, status do Jira e pessoas vêm do Jira; reservas, bloqueios e edições são manuais.
- **Ticket ↔ ambiente:** extraído do nome da branch com a regex configurável (padrão `[A-Z]+-\d+`), por serviço. Branches de serviços diferentes com tickets diferentes = divergência.
- **Status "em uso":** o deploy mais recente está numa branch de feature (≠ base: `main`/`master`/release) **e** essa branch ainda existe no GitHub **e** o ticket ligado tem status do Jira entre os escolhidos nas Configurações (padrão `in homolog`; pode incluir `ready for qa`). Branch base consistente nos serviços sem reserva = **livre**.
- **Descoberta do QA:** assignee da subtask de homologação do ticket; Dev: assignee do ticket.
- **Equipe/organização:** o nome do conceito ("equipe" na UI por enquanto) ainda não foi decidido; manter o rótulo num único lugar (constante de i18n) para trocar fácil.
- **Serviços alinhados:** os 4 serviços (ui, server, batch, menu) na mesma branch. Senão: `3/4`, aviso laranja no card e no drawer apontando o serviço divergente.
- **Reservar:** ticket opcional (busca no Jira), prazo (4 horas, 1 dia, 3 dias, até liberar; padrão = Configurações, 1 dia), nota opcional. Resultado: status reservado em nome de quem reservou até o prazo. Ao expirar, volta a livre.
- **Liberar:** encerra a reserva (ou o uso manual) e volta a livre; nota opcional; opção de avisar quem reservou. Só quem reservou (ou admin) libera.
- **Bloquear:** motivo (Migração de banco, Deploy quebrado, Manutenção de infra, Outro), descrição (aparece no card), previsão opcional, avisar quem está usando. Bloqueado ignora o sync para o status (continua mostrando deploys). **Desbloquear** devolve ao status detectado.
- **Edição manual:** Status, Ticket, Dev e QA são editáveis; o valor editado vira "Editado manualmente" com o detectado ao lado e "restaurar"; **o sync não sobrescreve campos manuais** até restaurar.
- **Liberação automática** (configurável, ligada): quando a branch do ambiente é removida/mergeada, o ambiente volta a livre.
- **Sem fila de espera** nesta versão (não implementar; não deixar ganchos visíveis na UI).
- **Sync:** indicador "GitHub + Jira · sincronizado há 1 min" + botão atualizar (44×44, `aria-label="Sincronizar agora"`). Atualização automática em intervalo e ao focar a aba.

## Telas
1. **Board** (`App-Board`): linha `$ env status --project=atlas` + tokens de contagem por status (clicar destaca a coluna e esmaece as outras; clicar de novo limpa) + indicador de sync. Quatro colunas na ordem livres, reservados, em uso, bloqueados. Cards como em COMPONENTS.md.
2. **Drawer por status** (`App-Drawer` em uso, `-Hydra` divergência, `-Livre`, `-Reservado`, `-Bloqueado`): ações conforme tabela do Drawer. Sem histórico no drawer (fica na página própria). Tag de origem em cada dado.
3. **Editar informações** (`App-Drawer-Editar`): nota "o que você editar fica marcado como manual…", campos Status (select), Ticket (mono), Dev, QA, cada um com a dica do valor detectado e a origem; "restaurar" nos editados. Salvar (`> Salvar alterações`) / Cancelar.
4. **Reservar** (`App-Reservar`), **Bloquear** (`App-Bloquear`), **Liberar** (`App-Liberar`): modais. Select aberto: `App-Select-Aberto`.
5. **Histórico** (`App-Historico`): filtros Ambiente, Tipo, Período (7 dias, Hoje, 30 dias); eventos agrupados por dia, mais recentes primeiro; cada linha com hora, ambiente (inline com ponto de status), texto (verbo em negrito, branches/tickets em mono) e Tag da origem.
6. **Configurações** (`App-Config`): painéis **Ambientes** (tabela nome/tag/GitHub environment + Editar; `+ Novo ambiente`), **Serviços** (serviço, repositório, branch base), **Regras** (status do Jira em uso, validar consistência de branch, regex do ticket, liberar automaticamente, prazo padrão). Salvar/Descartar no fim.
7. **Login** (`App-Login`): só `> Continuar com Google`. Sem e-mail, senha ou links. Ver "Acesso (fase 1)".
8. **Criar equipe** (`App-Onb-Empresa`): nome, endereço (slug em mono) e primeiro projeto, sem stepper. Ver "Acesso (fase 1)". `App-Onb-GitHub` e `App-Onb-Jira` ficam para a fase de integrações.

## Estados, busca e menu da equipe (artboards no grupo "Estados, busca e menu da equipe")
- **Board vazio** (`App-Board-Vazio`): painel tracejado com `$ env list --project=atlas`, título "Nenhum ambiente ainda", texto, ações `> Importar do GitHub` (principal) e "Criar ambiente"; mostra quantos environments foram encontrados.
- **Carregando** (`App-Board-Carregando`): colunas reais com cabeçalho e contagem `–`, cards em esqueleto no formato do card (barras `bg-avatar` com pulso de opacidade; sem animação com `prefers-reduced-motion`). Container `role="status" aria-busy="true"` com texto "Carregando ambientes" para leitor de tela.
- **Erro de sincronização** (`App-Board-Erro`): faixa `role="alert"` laranja acima do board: título, detalhe com código do erro e idade dos dados mostrados, botões "Tentar de novo" (laranja, com ícone) e "Ver conexões". O indicador de sync vira laranja ("GitHub · falhou · Jira · sincronizado há 12 min"). O board continua visível com os últimos dados.
- **Sem permissão** (`App-Sem-Permissao`): ver "Acesso (fase 1)".
- **Busca ⌘K** (`App-Busca`): diálogo de 640px a 96px do topo; campo de 56px; grupos Ambientes, Tickets, Branches, Pessoas; item selecionado em `accent/10` com texto `accent`; rodapé com atalhos (↑↓ navegar, Enter abrir, Esc fechar). **Sem resultado** (`App-Busca-Vazia`): "Nada encontrado para “zzz”" e dica de como buscar.
- **Menu da equipe** (`App-Menu-Equipe`): ao clicar no avatar `AC` da nav abre um menu de 320px alinhado à direita (`role="menu"`, `aria-haspopup`, `aria-expanded`): cabeçalho com avatar, nome e `env.app/slug`; Membros (nº de pessoas), Conexões (status GitHub/Jira com ponto verde), Configurações da equipe; "Trocar de equipe" (lista com check na atual) e "Criar nova equipe"; dados do usuário (nome, e-mail) e Sair. Fecha com Esc, clique fora ou ao escolher um item; foco volta ao avatar.

## Acesso (fase 1)
Todas as telas desta seção usam `AuthLayout` (logo no topo, sem nav, menu lateral ou seletor de projeto; a casca do app chega depois).

### Rotas e estados
| Rota | Situação | Tela |
|---|---|---|
| `/login` | padrão | `App-Login` |
| `/login` | indo ao Google | `App-Login-Redirecionando` |
| `/login` | falha ao iniciar ou no retorno | `App-Login-Erro` |
| `/auth/callback`, rotas protegidas | trocando o código ou consultando `/me` | `App-Sessao-Carregando` |
| rotas protegidas | `/me` falhou (exceto 401) | `App-Sessao-Erro` |
| `/onboarding/equipe` | formulário vazio | `App-Onb-Empresa` |
| `/onboarding/equipe` | erro nos campos | `App-Onb-Empresa-Erro` |
| `/onboarding/equipe` | enviando | `App-Onb-Empresa-Enviando` |
| `/onboarding/equipe` | erro geral | `App-Onb-Empresa-Falha` |
| `/sem-permissao` | não é membro nem convidado | `App-Sem-Permissao` |
| `/p/:projeto` | membro (provisória) | `App-Projeto-Provisorio` |

`/` exige login e leva o membro ao projeto (no futuro pode virar uma página pública de apresentação). A tela de status da API fica em `/status`, pública. Sessão ausente ou expirada leva a `/login`.

### Login
- Um único botão. Ao clicar, fica desativado, mantém o rótulo e a linha de situação abaixo mostra "Abrindo o Google…". Se a página voltar do cache do navegador (botão Voltar), o botão volta a ficar ativo.
- Falha: `Banner` laranja acima do botão, "Não foi possível entrar" / "O login com o Google não foi concluído. Tente de novo." Texto fixo: nunca repetir o parâmetro `error` da URL.

### Criar equipe
- Começa vazio. O endereço acompanha o nome (slug) até a pessoa editá-lo. O slug do primeiro projeto é derivado do nome e não aparece na tela.
- Erros ficam abaixo do campo, depois da dica; o foco vai ao primeiro campo com erro. Textos: "Informe o nome da equipe.", "Informe o nome do primeiro projeto.", "Use só letras minúsculas, números e hífens.", "Use ao menos 2 letras ou números no nome do projeto."
- Enviando: só "Criar equipe" fica desativado; abaixo das ações, "Criando a equipe…".
- Erro geral: `Banner` laranja entre o último campo e as ações, título "Não foi possível criar a equipe" e, no detalhe, a mensagem da API (sem resposta: "Confira sua conexão e tente de novo."). Os valores digitados ficam. Se a equipe já existir (409), consultar `/me` de novo e seguir para a tela do estado retornado.
- Ações: `> Criar equipe` (Enter envia) e "Sair". Não há "Voltar".

### Sem permissão
Painel tracejado com cadeado, `h1` "Você não tem acesso a esta equipe", texto sobre convite, "E-mail em uso" com o e-mail (quebra a linha se for longo) e "Sair". Sem "Pedir acesso", sem lista de administradores e sem nome de equipe ou projeto (quem está de fora não recebe esses dados).

### Sessão
- Carregando: painel em esqueleto com `role="status"`, `aria-busy="true"` e o texto "Carregando sua sessão" para leitor de tela. Sem pulso com `prefers-reduced-motion`.
- Falha: `Banner` laranja "Não foi possível carregar sua conta" / "Confira sua conexão e tente de novo." com "Tentar de novo" (laranja, 44px, ícone). Durante a nova tentativa o botão fica desativado. `h1` só para leitor de tela.

### Projeto (provisória)
`EmptyState` com a linha `$ env status --project=:projeto`, `h1` com o nome da equipe (caixa original), aviso de que o board está em construção (slug do projeto em mono) e "Sair". Será substituída pelo board.

### Sair
Encerra a sessão só neste navegador, limpa os dados em cache e leva a `/login`, mesmo se o servidor de login falhar.

### Foco e telas estreitas
- Anel de foco em acento em botões e campos. Ordem do Tab igual à ordem visual.
- Em 375px: margens de 16px, cartão com padding 20, ações quebram linha se faltar espaço, sem rolagem horizontal. Botões 48px (44px dentro de faixa).

## Responsivo
- ≥ 1320px de conteúdo: layout B. Abaixo: o conteúdo ocupa a largura disponível.
- Em tela estreita: menu lateral recolhido vira só o botão da nav; colunas rolam na horizontal; tabelas rolam em caixa própria; drawer ocupa a largura toda.

## Testes de aceitação (resumo)
- Tab percorre: botão de menu → logo → seletor → busca → avatar → menu lateral → conteúdo; foco sempre visível.
- Clicar em qualquer ponto do card abre o drawer; clicar em "Reservar ambiente" abre o modal, não o drawer.
- Esc fecha drawer e modais; foco volta ao card de origem.
- Alternar o menu lateral preserva a escolha ao recarregar.
- Nenhum texto de interface com contraste < 4.5:1; nenhum alvo < 44px.
