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

## Plano de implementação

Referências: `docs/design/docs/COMPONENTS.md` (medidas e classes), `tokens.css`, telas `App-Board`, `App-Select-Aberto`, `App-Reservar`, `App-Drawer`.

### Tarefa 1 — Tokens, fontes e base de testes [front]
**Arquivos:** `apps/web/src/index.css` (conteúdo de `tokens.css`), `index.html`, `src/test/setup.ts`, `src/lib/cn.ts`, `src/lib/termos.ts` (`export const TERMO_EQUIPE = 'equipe'`), `packages/shared/src/status.ts`
**Produz:** `type EnvStatus = 'livre'|'reservado'|'uso'|'bloqueado'`; `STATUS_LABEL: Record<EnvStatus,string>` (`Livre`, `Reservado`, `Em uso`, `Bloqueado`).
- [ ] Teste `STATUS_LABEL cobre os quatro status`.
- [ ] Foco visível global em acento; `prefers-reduced-motion` desliga animações.
- [ ] Commit `feat(web): tokens e fontes do design`.

### Tarefa 2 — Primitivos estáticos [front]
**Arquivos:** `src/components/ui/{Button,IconButton,Tag,Banner,Skeleton,EmptyState,Avatar}.tsx`, `src/components/env/EnvName.tsx`
**Produz:**
- `Button(props: ButtonHTMLAttributes & { variant: 'accent'|'green'|'orange'|'ghost'; size?: 'md'|'sm'; prompt?: boolean })`: `md` 48px, `sm` 44px, `type="button"` por padrão.
- `IconButton({ label, children, ...button })` (44×44, `aria-label`).
- `Tag({children})`, `Banner({status, title, children, actions})` (`role="alert"`), `Skeleton({className})`, `EmptyState({command?, title, children, actions?, hint?})`, `Avatar({name, src?, status?, size?: 32|44})`.
- `EnvName({ name, size: 'lg'|'md'|'sm'|'inline', status? })`.
- [ ] `Button.test`: `prompt` mostra `>` com `aria-hidden`; nome acessível é só o rótulo; desativado não dispara clique.
- [ ] `EnvName.test`: o texto no DOM mantém `Vega`, com classe `lowercase`; `lg` mostra `$`, `md` mostra `>`.
- [ ] `Avatar.test`: iniciais de `Marina Teste Lima` = `ML`; nome único = primeira letra; é `aria-hidden`.
- [ ] Commit `feat(web): componentes primitivos`.

### Tarefa 3 — Campos e controles [front]
**Arquivos:** `src/components/ui/{Field,Select,Switch,ChipRadioGroup}.tsx`
**Produz:** `Field({label, hint?, error?, multiline?, mono?, ...input})` com `forwardRef`; `Select({label, value, onValueChange, options: {value:string;label:string}[], mono?, hideLabel?, disabled?, error?})`; `Switch({label, checked, onCheckedChange, disabled?})`; `ChipRadioGroup({label, value, onValueChange, options})`.
- [ ] `Field.test`: com `error`, `aria-invalid="true"` e `aria-describedby` aponta para o texto do erro.
- [ ] `Select.test`: abre com Enter, escolhe com setas, fecha com Esc; item selecionado marcado. Adicionar no setup os stubs de ponteiro e `scrollIntoView` que o Radix exige no jsdom.
- [ ] `Switch` e `ChipRadioGroup`: alternam por teclado e expõem o estado marcado.
- [ ] Commit `feat(web): campos e controles`.

### Tarefa 4 — Modal e Drawer [front]
**Arquivos:** `src/components/ui/{Modal,Drawer}.tsx` (Radix Dialog)
**Produz:** `Modal({open, onOpenChange, title: ReactNode, children, footer})`; `Drawer({open, onOpenChange, label: string, header, children, footer})`. Larguras 540px e 560px; scrims `.72` e `.62`; modal a 96px do topo, com rolagem interna se faltar altura.
- [ ] Testes: Esc, X e clique no scrim chamam `onOpenChange(false)`; o foco volta ao botão que abriu; Tab fica preso dentro.
- [ ] Commit `feat(web): modal e drawer`.

### Tarefa 5 — Vitrine [front]
**Arquivos:** `src/pages/dev/Vitrine.tsx`, rota `/dev/componentes` registrada só quando `import.meta.env.DEV`, `e2e/vitrine.spec.ts`
- [ ] e2e: a vitrine passa no axe sem violações sérias; todo botão e campo tem altura ≥ 44px.
- [ ] Teste: o bundle de produção não contém o texto `Vitrine de componentes`.
- [ ] Commit `feat(web): vitrine de componentes`.
