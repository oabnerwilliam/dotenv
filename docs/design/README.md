# .env — pacote de design

- `docs/` — especificação (DESIGN.md, COMPONENTS.md, SCREENS.md) e `tokens.css` (Tailwind v4).
- `screens/` — 24 telas em HTML estático (fonte de verdade da aparência). Abra `index.html` no navegador; os links entre telas funcionam. Não há JS: menu recolhível, dropdown da equipe e destaque por status são interações a implementar (descritas em docs/).
- Os estilos estão inline nas telas (valores exatos de tamanho, cor e espaçamento). Para implementar um componente, abra a tela correspondente e converta para classes Tailwind usando os tokens.

## Como usar no repositório
1. Copie esta pasta para `docs/design/` do projeto (React + Vite + Tailwind v4).
2. Copie `tokens.css` para `src/index.css` (ou importe).
3. Cole o trecho "Para o Claude Code" de `docs/DESIGN.md` no `CLAUDE.md` e acrescente:
   `Referência visual: docs/design/screens/*.html. Antes de criar ou alterar uma tela, leia o HTML da tela correspondente e o componente em docs/design/docs/COMPONENTS.md.`
4. Peça as telas uma de cada vez ("implemente o Board conforme screens/App-Board.html"), começando pelos primitivos (Button, Tag, EnvName, Field, Select) e depois EnvCard, Drawer e as páginas.
