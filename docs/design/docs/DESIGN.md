# .env — Design

App de gerenciamento de ambientes de homologação. Cruza GitHub (deploys, branches, PRs) e Jira (tickets, status, pessoas) para mostrar, num board, o estado de cada ambiente: livre, reservado, em uso ou bloqueado.

Referência visual: artifact "`.env — Design final`" (17 telas navegáveis). Este documento diz **como implementar**; o artifact mostra **como deve parecer**. Em caso de dúvida, o artifact vence na aparência e este documento vence no comportamento.

Stack: React + Vite + Tailwind CSS v4. Tokens em `tokens.css` (copiar para `src/index.css`).

## Princípios
1. **Terminal, mas legível.** Estética de terminal (fundo escuro, mono em dados, `>` e `$`), sem sacrificar leitura. Interface em casing normal.
2. **Cor = status.** Verde livre, azul reservado, vermelho em uso, laranja bloqueado. A cor do status aparece no card (borda tinteada), na coluna (borda tracejada e cabeçalho), no valor "Status" e nas seções do drawer. Nunca só cor: sempre texto junto.
3. **Dados em mono, interface em Inter.** Mono só para: nomes de ambiente, tickets, branches, serviços, PRs, status do Jira, GitHub environments, contagens, atalhos, linha de comando, caminho do projeto, logo e o glifo `>` dos botões primários.
4. **Casing.** Texto na caixa original; minúsculo só como estilo em dois lugares: cabeçalhos de coluna (`[livres]`, `[reservados]`, `[em uso]`, `[bloqueados]`) e tokens da linha de status (`2 livre`). Nunca transformar texto digitado por pessoas. Guardar sempre no caso original e aplicar `lowercase` por classe (nunca por `toLowerCase()` nos dados).
5. **Hierarquia por peso, tamanho, cor e espaço.** Nunca só por caixa.
6. **Acessível por padrão.** `<button>`, `<a>`, `<input>` + `<label>` reais; alvo de toque ≥ 44px (48px em botões e campos principais); contraste ≥ 4.5:1; ícones decorativos com `aria-hidden`; ícones sozinhos com `aria-label`; foco visível (`:focus-visible` em acento).

## Layout (decidido)
- **Nav superior** em largura total (altura mín. 64px, borda inferior `line-subtle`). Da esquerda: botão de menu lateral, logo `.env_` (cursor piscando), seletor de projeto `~/projetos/[atlas ▾]`, busca (⌘K) à direita, avatar da equipe (`AC`).
- **Menu lateral** à esquerda, recolhível: expandido 244px (equipe, "Projetos", Atlas › Board / Histórico / Configurações, demais projetos, botão "Recolher") ou recolhido 68px (só ícones, rótulo em `aria-label` e `title`). Botão de alternar na nav (ícone de painel, `aria-expanded`, `aria-label="Alternar menu lateral"`). Persistir a escolha (localStorage). Padrão: expandido; recolhido quando um drawer está aberto em telas estreitas.
- **Conteúdo** centralizado com `max-w-[1320px] mx-auto`, padding `px-6 pt-5 pb-12`. Em monitor grande aparecem margens laterais (como o GitHub); nav e menu lateral não centralizam.
- **Drawer** à direita (largura 560px, máx. 100%), por cima de um scrim `rgba(5,6,8,.62)`; fecha por X, scrim ou Esc. **Modais** centralizados (540px) com scrim `.72`, a 96px do topo.
- Estrutura da página: `flex-wrap`; conteúdo com `flex: 999 1 560px; min-width: 0` para o menu empilhar em tela estreita. Tabelas largas em caixa com `overflow-x-auto`.
- Efeitos: scanline sutil e linha de acento de 2px no topo (ambos opcionais por preferência; scanline `pointer-events: none`).

## Navegação e rotas sugeridas
```
/login
/onboarding/equipe  →  /onboarding/github  →  /onboarding/jira  →  /p/atlas
/p/:projeto                       board
/p/:projeto/ambientes/:ambiente   board + drawer aberto (deep link)
/p/:projeto/historico
/p/:projeto/configuracoes
```
Reservar, Bloquear, Liberar e Editar são modais/estado sobre o drawer ou o board (podem ser sub-rotas `?acao=reservar`).

## Bibliotecas recomendadas
- **Radix UI** (ou Base UI) sem estilo + Tailwind: `Dialog` (drawer e modais), `Select`, `Switch`, `RadioGroup`, `Checkbox`/toggle, `Tooltip`, `Popover`. É o caminho para o select estilizado (ver COMPONENTS.md).
- `react-router`, `@tanstack/react-query` (sync com GitHub/Jira), `cmdk` para o ⌘K, `lucide-react` para ícones (mapa em COMPONENTS.md).
- Futuro design system: tokens → componentes primitivos (`Button`, `Field`, `Select`, `Tag`, `Chip`) → compostos (`EnvCard`, `Drawer`). Manter os primitivos sem regra de negócio.

## Para o Claude Code (CLAUDE.md do projeto)
```md
# .env
Leia antes de mexer em UI: docs/design/DESIGN.md, COMPONENTS.md, SCREENS.md e tokens.css.
- Stack: React + Vite + Tailwind v4. Tokens só via classes/variáveis de tokens.css; nada de hex solto.
- Texto de interface em Inter; dados (ambientes, tickets, branches, serviços, PRs) em font-mono.
- Nome de ambiente sempre pelo componente <EnvName>. Status sempre por data-status.
- Botões/campos ≥ 44px de altura; ícones só com aria-hidden ou aria-label.
- Não aplicar lowercase por JS; só por classe nos dois pontos definidos em DESIGN.md.
```
