# Componentes

Convenção: cada componente em `src/components/ui/` (primitivos) ou `src/components/env/` (de domínio). Tamanhos em px; classes Tailwind sugeridas entre crases. Estados obrigatórios: padrão, hover, foco (`:focus-visible`), desativado, e erro quando for campo.

## Ícones (lucide-react)
branch → `GitBranch` · check → `Check` · aviso → `TriangleAlert` · busca → `Search` · chevron → `ChevronDown` · fechar → `X` · recolher/expandir → `ChevronLeft`/`ChevronRight` · lock → `Lock` · sincronizar → `RefreshCw` · board → `LayoutDashboard` · histórico → `History` · configurações → `Settings` · menu lateral → `PanelLeft`. Tamanho 14–18, `stroke-width` 1.8, `aria-hidden`.

## Button
Variantes (altura 48, `px-[18px]`, `rounded-sm`, `font-sans font-semibold text-sm`, borda 1px):
| variante | borda/texto | fundo | hover |
|---|---|---|---|
| `accent` (primária) | `accent` | transparente | `bg-accent/12` |
| `green` (reservar, liberar, desbloquear) | `livre` | `livre/8` | fundo `livre`, texto `bg` |
| `orange` (bloquear) | `bloqueado` | `bloqueado/8` | fundo `bloqueado`, texto `bg` |
| `ghost` (cancelar, secundário) | `line-strong`, texto `fg-soft` | transparente | `surface-hover-2` |
Ações principais levam o glifo `>` em mono antes do rótulo (`> Reservar`); `Bloquear` leva o ícone `Lock`. Ícone-botão: 44×44, `rounded-md`, borda `line-strong`. Em rodapé de drawer/modal os botões ficam em linha com `flex-1`, quebrando linha se faltar espaço. Botão secundário dentro de tabela: altura 44.

## EnvName (nome do ambiente)
Sempre minúsculo e mono, dentro de caixa escura (`bg-bg border rounded`), com prompt:
- `lg` (título do drawer): `$ lyra`, `font-mono font-bold text-[26px]`, padding `8 16`, `rounded-md`, borda na cor do status a 40%; `$` em `fg-muted`.
- `md` (card, título de modal): `> lyra`, `font-mono font-semibold text-base`, padding `5 10`, `rounded-sm`, borda `line-strong`; `>` em `accent`.
- `sm` (resumo dentro de modal): `font-mono font-semibold text-[13px]`, padding `3 8`.
- `inline` (dentro de frases, histórico, tabela de configurações): só `font-mono font-semibold`, sem caixa. No histórico leva um ponto de 7px na cor do status à esquerda.
Não usar no menu lateral, em textos longos nem para nomes de pessoas. Receber `name` na caixa original e aplicar `lowercase` por classe.

## Tag
`font-sans text-xs font-medium text-fg-muted border border-line-strong rounded-sm px-2 py-0.5`. Valores: Interno, Externo, Base (ambiente); Jira, GitHub, Manual (origem da informação).

## StatusText e tokens de status
- No card: linha "Status: **Livre**" com o valor em `text-[status] font-semibold`; reservado mostra também `· há 3 h` em `fg-muted`.
- Cabeçalho de coluna: `font-mono font-bold text-[13px] text-[status] lowercase` com colchetes `[livres]` e contagem à direita (`font-mono font-semibold`), borda inferior `status/50`.
- Token da linha de status (`2 livre`): botão `h-11 px-3 rounded-sm font-mono text-[13px] font-medium` com ponto de 6px na cor; `aria-pressed`. Ativo: fundo `status/16` e borda `status/60`.

## Avatar de pessoa
Quadrado `rounded-sm`, fundo `avatar`, borda `status/45`, iniciais `font-bold`. Tamanhos 30–32 (card), 44 (drawer). Decorativo (`aria-hidden`); o nome fica ao lado.

## EnvCard (ver `.env-card` em tokens.css)
Estrutura, nesta ordem: cabeçalho (`EnvName md` + `Tag`), lista de campos `dl` (rótulo `fg-muted text-[13px]` 84px + valor `text-sm`), aviso opcional, ação ou pessoas.
Campos: **Status**, **Ticket** (mono 700 + título em `fg-soft`), **Branch** (ícone + mono, truncar com reticências), **Deploy** (relativo), **Serviços** (`✓ 4/4 alinhados` em verde, ou `⚠ 3/4 · batch diverge` em laranja).
Variações por status:
- livre: botão `green` de largura total `> Reservar ambiente`.
- reservado/em uso: bloco de pessoas (Dev, QA) com borda superior tracejada na cor do status.
- em uso com divergência: frase em laranja sob os campos ("O batch ainda está em main, fora da branch da feature.").
- bloqueado: caixa de aviso `status/10` com borda `status/32` e o motivo (`! Migração de banco em andamento`).
Padding 16, gap 14. **O card inteiro abre o drawer**: o nome é um `<a>` com a classe `card-link` (área esticada), e botões dentro levam `card-action`. Hover e foco-dentro mostram contorno claro. Rota: `/p/:projeto/ambientes/:ambiente`.

## EnvColumn
`env-column`, `min-w-[260px]`, `flex-1 basis-[260px]`, `min-h-[600px]`, padding 12, gap 12. Cabeçalho, cards, e no fim botão `+ Novo` (altura 48, borda tracejada `status/32`, texto `fg-muted`). Linha de colunas: `flex gap-4 overflow-x-auto`. Quando um status está em foco (token pressionado), as outras colunas ficam com `opacity-35` (transição 200ms).

## Drawer
`Dialog` à direita, `w-full max-w-[560px]`, fundo `surface-2`, borda esquerda `line-strong`, sombra `-24px 0 64px rgb(0 0 0/.5)`.
- Cabeçalho: padding `20 20 16`, gradiente `status/8`, `EnvName lg`, `Tag`, botão X (44) à direita; abaixo "Status: **Em uso** · desde há 3 dias".
- Corpo: padding `24 20`, seções com gap 32. Cada seção: título `text-sm font-semibold text-[status]` + linha de 1px `status/35` + conteúdo; à direita do título pode haver um resumo (ex.: `✓ 4/4 alinhados`).
- Rodapé: fundo `bg`, borda superior `line`, padding `16 20`, botões em linha.
Seções (sempre as 3): **Ligado a** (ticket, status no Jira, branch, PR, reserva — conforme o caso), **Serviços** (tabela ui/server/batch/menu com branch, deploy e check/aviso; linha divergente com fundo `bloqueado/7`), **Pessoas**. Ações do rodapé por status:
| status | ações |
|---|---|
| livre | Reservar (green), Bloquear (orange) |
| reservado | Liberar (green), Editar (accent), Bloquear |
| em uso | Editar (accent), Bloquear |
| bloqueado | Desbloquear (green), Editar (accent) |
Aviso no topo do corpo quando houver: divergência de serviços (laranja) ou motivo do bloqueio (cor do status).

## Modal
Centralizado, `max-w-[540px]`, fundo `surface`, borda `line-strong`, `rounded-lg`, sombra `0 24px 64px rgb(0 0 0/.6)`. Cabeçalho (título 20px/600 + X 44), corpo padding 20 com gap 18, rodapé com borda superior. Título de ação com `EnvName md` ("Reservar `> vega`"). Primeira linha do corpo: `EnvName sm` + Tag + status + ticket.

## Field, Select e demais controles
- Campo: `<label>` 13px/600 `fg-soft` + controle 48px (`bg-surface-2 border border-line-strong rounded-sm px-3 text-sm`) + dica 12.5px `fg-muted`. `textarea` min 96px. Campos de dado (ticket, regex) em `font-mono`. Erro: borda `uso`, texto de erro abaixo com ícone; `aria-invalid` e `aria-describedby`.
- **Select (componente próprio, não o nativo).** Gatilho igual ao campo, com chevron; aberto: borda e anel em `accent` (`ring-[3px] ring-accent/15`), chevron girado. Lista: `bg-surface border border-line-strong rounded-md shadow-[0_16px_40px_rgb(0_0_0/.55)] p-1.5`, itens de 44px `rounded-sm px-3`; hover `surface-hover-2`; selecionado `bg-accent/10 text-accent font-semibold` com `Check` à direita. Usar `Radix Select` (`role="listbox"`/`option`, teclado e typeahead). Mesma lógica para o seletor de projeto da nav (mono) e os filtros do histórico.
- Switch: trilho 44×26 `rounded-full`, ligado `livre/25` com bolinha `livre`; desligado `avatar` com bolinha `fg-muted`; rótulo à esquerda, linha 48.
- Radio em chips (prazo da reserva): `h-11 px-4 rounded-sm`, marcado `livre` com `livre/12`.
- Chips de múltipla escolha (status do Jira, repositórios): `role="checkbox"`, `h-11`, marcado com `Check` e cor `livre`; status do Jira em mono.

## Tabela / lista
Cabeçalho 12px `fg-muted`; linhas 52–56px com borda superior `line-subtle`; hover `bg-surface`. Em largura estreita: caixa `overflow-x-auto` com `min-w-[620px]`. Histórico: `grid-cols-[56px_128px_1fr_84px]` (hora mono, ambiente, evento, origem em Tag), agrupado por dia ("Hoje · quarta, 25 nov").

## Stepper (onboarding)
Lista ordenada horizontal: caixa 32 com número mono (ou check verde se concluído), rótulo 14/600; ativo em `accent`, concluído em `livre`, pendente em `fg-muted`; linha de 1px entre etapas (`livre` se concluída). `aria-current="step"`.

## Busca global (⌘K)
`cmdk` em dialog: grupos **Ambientes**, **Tickets**, **Branches**, **Pessoas**; item com `EnvName inline`/mono + contexto; ↑↓ navega, Enter abre (ambiente → drawer), Esc fecha. Campo na nav (44px, placeholder "Buscar ambiente, ticket ou branch…", `kbd` ⌘K em mono). Estilo igual ao Select aberto.

## Menu lateral
Item: altura 44, `rounded-sm`, texto 14/500 `fg-soft`; ativo `text-accent bg-surface-hover` + `aria-current="page"`. Projeto atual com `›` em acento e sub-itens com guia tracejada `line-dashed`. Recolhido: botões 44×44 (equipe `AC`, siglas `AT BO DE FL`, ícones das seções), separadores de 28px. Botão de alternar sempre na nav.

## Menu da equipe (TeamMenu)
Gatilho: botão 44×44 `rounded-md` com iniciais da equipe sobre `accent` (texto `bg`). Painel: `absolute right-0 top-[52px] z-40 w-80 bg-surface border border-line-strong rounded-md shadow-[0_16px_40px_rgb(0_0_0/.55)] p-1.5`. Itens `role="menuitem"` de 44px (ícone `fg-muted` 18 + rótulo 14/500 `fg-soft` + dica à direita 12.5px `fg-muted`); troca de equipe com `role="menuitemradio"` e `Check` em acento na atual; separadores de 1px `line`. Usar Radix `DropdownMenu`.

## Esqueleto (Skeleton)
`bg-avatar rounded` com `animate-pulse` (opacidade até .45); desligar com `motion-reduce`. Reproduzir as larguras do conteúdo real (nome 96×28, tag 56×22, campos 40–70%).

## Faixa de alerta (Banner)
`role="alert"`, `bg-[status]/10 border border-[status]/40 rounded-md p-4`, ícone + título 14.5/600 na cor + detalhe 13.5 `fg-soft` + ações à direita (altura 44).

## Estado vazio (EmptyState)
Painel `border border-dashed border-line-strong rounded-lg bg-surface-2 min-h-[560px]`, conteúdo alinhado à esquerda em coluna de até 520px: ícone ou linha de comando, título 28/600, texto 15 `fg-soft`, ações, dica opcional.

## Paleta de busca (CommandPalette)
Dialog 640px, `rounded-lg`, campo de 56px; grupos com rótulo 12/600 `fg-muted`; itens de 48px; selecionado `bg-accent/10 text-accent`; rodapé com `kbd` (mono 11px, borda `line-strong`). Usar `cmdk`.
