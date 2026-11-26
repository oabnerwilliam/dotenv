# 02 — Base visual

**Estado:** a fazer · **Depende de:** 01 · **Spec:** §8 · **Design:** `docs/design/docs/COMPONENTS.md`, `DESIGN.md`, `tokens.css`

Como desenvolvedor, quero os componentes primitivos fiéis ao design para montar as telas sem repetir estilo.

## Critérios de aceite
- [ ] Tokens de `tokens.css` aplicados no Tailwind; fontes Inter e JetBrains Mono carregadas.
- [ ] `Button` (accent, green, orange, ghost e ícone-botão) com padrão, hover, foco e desativado.
- [ ] `Field` (input e textarea) com dica e erro (`aria-invalid`, `aria-describedby`).
- [ ] `Select` próprio (Radix), igual a `App-Select-Aberto`, com teclado.
- [ ] `Switch`, radio em chips, `Tag`, `EnvName` (lg, md, sm, inline), avatar, `Banner`, `Skeleton`, `EmptyState`.
- [ ] `Modal` e `Drawer`: fecham por X, scrim e Esc; o foco volta à origem.
- [ ] `EnvName` guarda o nome original e usa minúsculas só por classe.
- [ ] Uma página só de desenvolvimento mostra todos os componentes e estados.
- [ ] Testes cobrem teclado e acessibilidade dos interativos.

## Fora de escopo
Componentes de domínio (`EnvCard`, colunas), busca ⌘K.
