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
7. **Login** (`App-Login`): "Continuar com GitHub" (principal), separador "ou com e-mail", e-mail/senha, "Criar conta da equipe", "Esqueci a senha".
8. **Onboarding** (`App-Onb-Empresa` › `-GitHub` › `-Jira`): equipe (nome, endereço/slug mono, primeiro projeto); GitHub (permissões **somente leitura**, repositórios do projeto viram serviços, environments viram ambientes); Jira (endereço, e-mail, token de API, projeto, "Testar conexão", status que contam como "Em uso"). Concluir abre o board. Token guardado criptografado, nunca devolvido ao front.

## Estados, busca e menu da equipe (artboards no grupo "Estados, busca e menu da equipe")
- **Board vazio** (`App-Board-Vazio`): painel tracejado com `$ env list --project=atlas`, título "Nenhum ambiente ainda", texto, ações `> Importar do GitHub` (principal) e "Criar ambiente"; mostra quantos environments foram encontrados.
- **Carregando** (`App-Board-Carregando`): colunas reais com cabeçalho e contagem `–`, cards em esqueleto no formato do card (barras `bg-avatar` com pulso de opacidade; sem animação com `prefers-reduced-motion`). Container `role="status" aria-busy="true"` com texto "Carregando ambientes" para leitor de tela.
- **Erro de sincronização** (`App-Board-Erro`): faixa `role="alert"` laranja acima do board: título, detalhe com código do erro e idade dos dados mostrados, botões "Tentar de novo" (laranja, com ícone) e "Ver conexões". O indicador de sync vira laranja ("GitHub · falhou · Jira · sincronizado há 12 min"). O board continua visível com os últimos dados.
- **Sem permissão** (`App-Sem-Permissao`): ícone de cadeado, "Você não tem acesso a este projeto", explicação, `> Pedir acesso`, "Voltar ao Atlas" e lista dos administradores.
- **Busca ⌘K** (`App-Busca`): diálogo de 640px a 96px do topo; campo de 56px; grupos Ambientes, Tickets, Branches, Pessoas; item selecionado em `accent/10` com texto `accent`; rodapé com atalhos (↑↓ navegar, Enter abrir, Esc fechar). **Sem resultado** (`App-Busca-Vazia`): "Nada encontrado para “zzz”" e dica de como buscar.
- **Menu da equipe** (`App-Menu-Equipe`): ao clicar no avatar `AC` da nav abre um menu de 320px alinhado à direita (`role="menu"`, `aria-haspopup`, `aria-expanded`): cabeçalho com avatar, nome e `env.app/slug`; Membros (nº de pessoas), Conexões (status GitHub/Jira com ponto verde), Configurações da equipe; "Trocar de equipe" (lista com check na atual) e "Criar nova equipe"; dados do usuário (nome, e-mail) e Sair. Fecha com Esc, clique fora ou ao escolher um item; foco volta ao avatar.

## Responsivo
- ≥ 1320px de conteúdo: layout B. Abaixo: o conteúdo ocupa a largura disponível.
- Em tela estreita: menu lateral recolhido vira só o botão da nav; colunas rolam na horizontal; tabelas rolam em caixa própria; drawer ocupa a largura toda.

## Testes de aceitação (resumo)
- Tab percorre: botão de menu → logo → seletor → busca → avatar → menu lateral → conteúdo; foco sempre visível.
- Clicar em qualquer ponto do card abre o drawer; clicar em "Reservar ambiente" abre o modal, não o drawer.
- Esc fecha drawer e modais; foco volta ao card de origem.
- Alternar o menu lateral preserva a escolha ao recarregar.
- Nenhum texto de interface com contraste < 4.5:1; nenhum alvo < 44px.
