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

Referências: `docs/design/docs/COMPONENTS.md` (medidas e classes), `tokens.css`, telas `App-Board` (card, avatar, `EnvName md`, botão), `App-Select-Aberto` (select no modal), `App-Reservar` (campos, chips, modal), `App-Drawer` (drawer, `EnvName lg`). Conferido contra a `main` (`21873ab`) em 2026-11-27.

**Ordem:** Tarefa 1 (`shared`) primeiro; as Tarefas 2 a 8 são do front, em sequência. Não há trabalho de API nem de banco. Designer não é necessário: a única página nova é a vitrine, só de desenvolvimento, com componentes e tokens existentes (anexar screenshots dela no PR, desktop e 375px, inclusive select, modal e drawer abertos).

**Contratos:** nenhuma rota, schema de entrada ou erro novo. O único contrato é o status em `shared`.

### Ponto de partida na `main`
- `apps/web/src/index.css` só tem `@import 'tailwindcss';`. `index.html` não muda.
- `src/test/setup.ts` já tem `jest-dom`, `cleanup` e msw: **acrescentar** os stubs, sem remover nada.
- Não há `react-router`, `components/`, `radix-ui`, `lucide-react`, fontes nem axe. `StatusPage` não muda.
- `playwright.config.ts` sobe API e web em modo dev: a vitrine existe no e2e sem mudar a configuração. O e2e continua exigindo o Supabase local ligado.

### Dependências (conferidas no npm em 2026-11-27)
| Pacote | Faixa | Onde |
|---|---|---|
| `radix-ui` | `^1` (1.8.1) | web, `dependencies` |
| `lucide-react` | `^1` | web, `dependencies` |
| `@fontsource-variable/inter` | `^5` (5.3.0) | web, `dependencies` |
| `@fontsource-variable/jetbrains-mono` | `^5` (5.3.0) | web, `dependencies` |
| `@axe-core/playwright` | `^4` | raiz, `devDependencies` |

Se `minimumReleaseAge` recusar, usar versão anterior da mesma faixa. Depois de instalar o axe, `pnpm why playwright-core` deve mostrar só a 1.65 (é *peer* dele); se aparecer outra, declarar `playwright-core@~1.65.1` na raiz. Acrescentar as duas linhas de fontes à tabela das convenções.

### Ajustes ao plano original (decisões técnicas, citar no PR)
- **Sem `react-router` nesta história:** o `main.tsx` escolhe a vitrine pelo `location.pathname`, com `lazy` dentro de `import.meta.env.DEV`. A história 03 leva a rota para o `router.tsx`.
- **Fontes servidas pelo próprio app** (como pede o `tokens.css`), importadas no `main.tsx`; nada de Google Fonts (as telas HTML usam, o produto não: a CSP da história 12 fica em `'self'`). `build.assetsInlineLimit` precisa devolver `false` para `.woff2`: há subconjunto de 2 KB que o Vite embutiria como `data:`.
- **`cn` sem biblioteca** (`cn(...parts: Array<string | false | null | undefined>): string`). Sem `tailwind-merge`, `className` serve para layout (`flex-1`, `w-full`), não para sobrescrever estilo do componente.
- **React 19:** `ref` é prop comum; não usar `forwardRef`.
- **Desativado** (o design não define): `disabled:opacity-50 disabled:cursor-not-allowed`, e hover só com `enabled:hover:`.
- **Token novo `--color-scrim: rgb(5 6 8)`** (cor que o `DESIGN.md` já usa nos scrims, ausente do `tokens.css`): acrescentar no `docs/design/docs/tokens.css` e no `index.css`; usar `bg-scrim/72` e `bg-scrim/62`. Sombras seguem como classes arbitrárias, como no `COMPONENTS.md`.
- **Bundle de produção:** em vez de um teste do Vitest, um script que lê o `dist` depois do `vite build`, dentro do `pnpm build` (o portão e o CI já o rodam). Rodar `build()` dentro do Vitest herdaria `NODE_ENV=test`, deixaria `import.meta.env.DEV` verdadeiro e testaria outro artefato.
- **Estados na vitrine:** padrão, desativado, erro, marcado e aberto ficam visíveis ou acionáveis; hover e foco são vistos interagindo e cobertos por e2e (sem classes que os simulem).

### Ajustes feitos na implementação (citar no PR)
- `tsconfig.e2e.json` ganhou `DOM.Iterable`: o `tema.spec` percorre `document.fonts`.
- **Uma exceção no axe:** só com o select da página aberto, `aria-hidden-focus` em `#root` é descartado. É falso positivo (o Radix prende o foco na lista e cancela o Tab); o mesmo teste confere que Tab e Shift+Tab não saem dela. Nenhuma regra foi desligada.
- `onBlur` do `Select` e do `ChipRadioGroup` só dispara quando o foco sai do controle (abrir a lista ou trocar de chip não conta), para o React Hook Form não validar no meio do uso.
- Arquivo novo `components/ui/fieldParts.tsx`: rótulo, caixa e erro comuns a `Field` e `Select`.

### Tarefa 1 — Status em `shared` [back]
**Arquivos:** `packages/shared/src/status.ts` (contrato), `status.test.ts`, `index.ts` (exporta).
**Produz:**
```ts
export const envStatusSchema = z.enum(['livre', 'reservado', 'uso', 'bloqueado']);
export type EnvStatus = z.infer<typeof envStatusSchema>;
export const STATUS_LABEL: Record<EnvStatus, string>; // Livre, Reservado, Em uso, Bloqueado
```
- [x] `status.test` `STATUS_LABEL cobre os quatro status`: as chaves são `envStatusSchema.options` e os rótulos são os quatro acima.
- [x] `status.test` `envStatusSchema rejeita status desconhecido`.
- [x] Commit `feat(shared): status dos ambientes`.

### Tarefa 2 — Tokens, fontes e base [front]
**Arquivos e responsabilidades** (em `apps/web`):
- `package.json`: dependências de fontes; `build` = `tsc --noEmit && vite build && node scripts/check-bundle.mjs`.
- `src/index.css`: conteúdo de `docs/design/docs/tokens.css` mais `--color-scrim`; `color-scheme: dark`; animação `--animate-skeleton` (1,4 s, opacidade .45 no meio, `@keyframes` dentro do `@theme`); regra global em `prefers-reduced-motion: reduce` com `animation: none` e `transition: none`.
- `src/main.tsx`: `import '@fontsource-variable/inter'` e `'@fontsource-variable/jetbrains-mono'`.
- `vite.config.ts`: `assetsInlineLimit` acima.
- `scripts/check-bundle.mjs`: falha (código ≠ 0, com mensagem) se o `dist` não existir, se não houver `.woff2` emitido ou se algum arquivo contiver `data:font` ou `fonts.googleapis`.
- `src/lib/cn.ts`; `src/lib/termos.ts` (`export const TERMO_EQUIPE = 'equipe'`).
- `src/test/setup.ts`: stubs que o Radix exige no jsdom (`ResizeObserver`, `Element.prototype.scrollIntoView`, `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`).
- `e2e/tema.spec.ts`.

- [x] e2e `a tela usa os tokens do design`: em `/`, o fundo do `body` é `rgb(11, 13, 16)`, o texto `rgb(230, 237, 243)`, o `body` usa `Inter Variable` e o `h1` usa `JetBrains Mono Variable`.
- [x] e2e `as fontes vêm do próprio app`: depois de `document.fonts.ready`, há face `loaded` das duas famílias (não usar só `document.fonts.check`, que responde `true` sem face declarada) e nenhuma requisição saiu de `localhost`.
- [x] `check-bundle`: ver falhar sem o `assetsInlineLimit` e passar com ele.
- [x] Commit `feat(web): tokens e fontes do design`.

### Tarefa 3 — Primitivos estáticos [front]
**Arquivos:** `src/components/ui/{Button,IconButton,Tag,Banner,Skeleton,EmptyState,Avatar}.tsx`, `src/components/env/EnvName.tsx`, testes ao lado; instalar `lucide-react` (ícones 14–18, `strokeWidth` 1.8, `aria-hidden`).
**Produz:**
- `Button(props: ComponentProps<'button'> & { variant: 'accent'|'green'|'orange'|'ghost'; size?: 'md'|'sm'; prompt?: boolean })`: `md` 48px (padrão), `sm` 44px, `type="button"` por padrão; ícone (ex.: `Lock`) vem em `children`.
- `IconButton({ label, children, ...button })` (44×44, `rounded-md`, borda `line-strong`, `aria-label`, `type="button"`).
- `Tag({ children })`, `Skeleton({ className })` (`aria-hidden`, `animate-skeleton`).
- `Banner({ status: EnvStatus, title, children, actions? })` (`role="alert"`, `data-status`, ícone decorativo).
- `EmptyState({ command?, title, children, actions?, hint? })`: título em `h2`; `command` em mono com `$` decorativo.
- `Avatar({ name, src?, status?: EnvStatus, size?: 32|44 })`: sempre `aria-hidden`; com `status`, `data-status` e borda `status/45`, sem ele `line-strong`; com `src`, imagem `alt=""` e `referrerPolicy="no-referrer"`, voltando às iniciais se falhar; iniciais = primeira letra do primeiro e do último nome, maiúsculas por classe.
- `EnvName({ name, size: 'lg'|'md'|'sm'|'inline', status?: EnvStatus })`: usa só `span` (vai dentro de títulos e links); `lg` `$` em `fg-muted` e borda `status/40`; `md` e `sm` `>` em `accent`; `inline` sem caixa nem prompt e, com `status`, ponto decorativo de 7px.

- [x] `Button.test` `prompt é decorativo`: `>` com `aria-hidden` e nome acessível só com o rótulo.
- [x] `Button.test` `é type button e responde a Enter e espaço`.
- [x] `Button.test` `desativado não dispara clique nem teclado`.
- [x] `IconButton.test` `o nome acessível é o label`.
- [x] `Banner.test` `anuncia como alerta com título, detalhe e ações`.
- [x] `EmptyState.test` `mostra comando, título, texto, ações e dica` e omite os opcionais ausentes.
- [x] `Skeleton.test` `é ignorado pelo leitor de tela`.
- [x] `EnvName.test` `mantém a caixa original`: o texto no DOM é `Vega`, com a classe `lowercase`.
- [x] `EnvName.test` `prompt por tamanho`: `lg` mostra `$`; `md` e `sm` mostram `>`; `inline` não mostra prompt; com `status` expõe `data-status`.
- [x] `Avatar.test`: iniciais de `Marina Teste Lima` = `ML` (com espaços sobrando também); nome único = primeira letra; é `aria-hidden`.
- [x] `Avatar.test` `status e imagem`: com `status`, `data-status`; com `src`, imagem; após `error`, iniciais.
- [x] Commit `feat(web): componentes primitivos`.

### Tarefa 4 — Field [front]
**Arquivos:** `src/components/ui/Field.tsx` e teste.
**Produz:** `Field({ label, hint?, error?, multiline?, mono?, ...props })`, com as props de `input` ou, com `multiline`, de `textarea` (mínimo 96px), incluindo `ref` (para o `register`). Ids com `useId`.
- [x] `Field.test` `o rótulo nomeia o controle e a dica o descreve`.
- [x] `Field.test` `erro marca o campo`: `aria-invalid="true"` e `aria-describedby` inclui o texto do erro (e o da dica, se houver); sem erro, não há `aria-invalid`.
- [x] `Field.test` `multiline vira textarea e o ref chega ao controle`; desativado não aceita digitação.
- [x] Commit `feat(web): campo de texto`.

### Tarefa 5 — Select, Switch e chips [front]
**Arquivos:** `src/components/ui/{Select,Switch,ChipRadioGroup}.tsx` e testes; instalar `radix-ui` (`import { Select } from 'radix-ui'`).
**Produz** (`ref` e `onBlur` existem para o `Controller` do React Hook Form focar o campo com erro):
- `Select({ label, value, onValueChange, options: { value: string; label: string }[], mono?, hideLabel?, disabled?, error?, ref?, onBlur? })`. `value` de opção nunca é `''` (o Radix proíbe). Para ficar igual a `App-Select-Aberto`: `position="popper"` (o padrão `item-aligned` sobrepõe o gatilho), `sideOffset={6}`, largura `--radix-select-trigger-width`, altura máxima `--radix-select-content-available-height`, itens de 44px, `z` acima do modal; aberto com borda e anel `accent` e chevron girado; foco do item visível (contorno global com `outline-offset` negativo).
- `Switch({ label, checked, onCheckedChange, disabled?, ref?, onBlur? })`: o `Switch.Root` é a **linha inteira** (mínimo 48px, rótulo à esquerda, trilho 44×26), para o alvo não ficar com 26px.
- `ChipRadioGroup({ label, value, onValueChange, options, disabled?, ref?, onBlur? })` sobre `RadioGroup`: grupo nomeado pelo rótulo visível, chips de 44px.

- [x] `Select.test` `abre com Enter, escolhe com setas e Enter` (chama `onValueChange`) e `a opção atual vem marcada` (`aria-selected`).
- [x] `Select.test` `Esc fecha sem mudar e devolve o foco ao gatilho`.
- [x] `Select.test` `rótulo, erro e desativado`: o combobox é nomeado pelo rótulo (também com `hideLabel`); com `error`, `aria-invalid` e `aria-describedby`; desativado não abre.
- [x] `Switch.test` `alterna com espaço e Enter` e expõe `aria-checked`; desativado não alterna.
- [x] `ChipRadioGroup.test` `setas movem e marcam`: usar `{ArrowRight>}` com `waitFor` e soltar depois (o Radix só marca se o foco chegar com a tecla pressionada); só um `radio` com `aria-checked="true"`; desativado não muda.
- [x] Commit `feat(web): select, switch e chips`.

### Tarefa 6 — Modal [front]
**Arquivos:** `src/components/ui/{Modal.tsx,useReturnFocus.ts}` e `Modal.test.tsx` (Radix `Dialog`).
**Produz:** `Modal({ open, onOpenChange, title: ReactNode, children, footer? })`: 540px, margem lateral de 16px, a 96px do topo, rolagem no corpo se faltar altura, scrim `.72`, X (`IconButton`, "Fechar"), título em `Dialog.Title`.
**Foco:** sem `Dialog.Trigger`, o Radix **não** devolve o foco sozinho (cancela a restauração padrão e foca um gatilho que não existe). `useReturnFocus` guarda o `document.activeElement` em `onOpenAutoFocus` e, em `onCloseAutoFocus`, chama `preventDefault()` e o foca.
- [x] `Modal.test` `é um diálogo nomeado pelo título`.
- [x] `Modal.test` `Esc, X e clique no scrim pedem para fechar` (`onOpenChange(false)`).
- [x] `Modal.test` `o foco volta ao botão que abriu`, com `open` controlado e botão comum.
- [x] `Modal.test` `Tab e Shift+Tab ficam presos dentro`.
- [x] `Modal.test` `Esc com o select aberto fecha só o select`.
- [x] Commit `feat(web): modal`.

### Tarefa 7 — Drawer [front]
**Arquivos:** `src/components/ui/Drawer.tsx` e teste.
**Produz:** `Drawer({ open, onOpenChange, label: string, status?: EnvStatus, header, children, footer? })`: à direita, `w-full` até 560px, scrim `.62`, `label` em título só para leitor de tela, X ("Fechar painel") ao lado do `header`, corpo com rolagem, rodapé fixo. `status` vira `data-status` no painel (gradiente `status/8` do cabeçalho e cor das seções futuras). Reusa `useReturnFocus`.
- [x] `Drawer.test` `é um diálogo nomeado pelo label e expõe data-status`.
- [x] `Drawer.test`: Esc, X e scrim fecham; o foco volta à origem; Tab fica preso.
- [x] Commit `feat(web): drawer`.

### Tarefa 8 — Vitrine [front]
**Arquivos:**
- `apps/web/src/pages/dev/Vitrine.tsx`: `h1` "Vitrine de componentes"; todas as variantes e tamanhos de `Button` (também desativados, com `prompt` e com `Lock`), `IconButton`, `Field` (dica, erro, textarea, mono, desativado), `Select` (normal, mono, erro, desativado), `Switch` e chips (marcado, desmarcado, desativado), `Tag`, `EnvName` (4 tamanhos × status), `Avatar` (32 e 44, com e sem status), `Banner`, `Skeleton`, `EmptyState`, botões que abrem `Modal` (com campos, como em `App-Reservar`) e `Drawer`. `STATUS_LABEL` ao lado das cores. Só nomes fictícios.
- `apps/web/src/main.tsx`: vitrine em `/dev/componentes`, só em desenvolvimento.
- `apps/web/scripts/check-bundle.mjs`: também falha se achar `Vitrine de componentes`.
- `e2e/vitrine.spec.ts`; `package.json` da raiz (`@axe-core/playwright`).

- [x] e2e `a vitrine não tem violações sérias de acessibilidade`: axe sem violações `serious` ou `critical` na página, com o select aberto, com o modal aberto e com o drawer aberto. Não desligar regra sem justificar no PR.
- [x] e2e `todo alvo tem pelo menos 44px`: `button`, `a[href]`, `input`, `textarea`, `combobox`, `radio` e `switch` visíveis (ignorar os `aria-hidden` do Radix), na página e nas camadas abertas (inclusive `option`); botões de ícone também com largura ≥ 44; o teste exige que a lista não esteja vazia.
- [x] e2e `hover e foco dos botões`: com o mouse sobre `green` e `orange` o fundo vira a cor do status; `accent` e `ghost` deixam de ser transparentes; por Tab, as quatro variantes, o ícone-botão e os campos têm contorno sólido `rgb(190, 242, 100)`; desativado não muda no hover.
- [x] e2e `o select aberto fica abaixo do gatilho, com a mesma largura`, dentro do modal e clicável.
- [x] e2e `em 375px o drawer ocupa a largura toda e o modal cabe na tela`.
- [x] e2e `movimento reduzido desliga a animação do esqueleto` (`emulateMedia`).
- [x] `check-bundle`: ver falhar com a vitrine fora do `if (import.meta.env.DEV)` (temporário, sem commit) e passar com a guarda.
- [x] Os cinco portões passam.
- [x] Commit `feat(web): vitrine de componentes`.

### Cobertura dos critérios
| Critério | Onde |
|---|---|
| Tokens e fontes | T2 |
| `Button` e ícone-botão, quatro estados | T3, T8 (hover e foco) |
| `Field` | T4 |
| `Select` | T5, T8 |
| `Switch`, chips, `Tag`, `EnvName`, avatar, `Banner`, `Skeleton`, `EmptyState` | T3, T5, T8 |
| `Modal` e `Drawer` | T6, T7 |
| `EnvName` com caixa original | T3 |
| Página de desenvolvimento | T8 |
| Teclado e acessibilidade | T3 a T8 |

### Atenção para a história 12 (não fazer agora)
`Dialog` e `Select` do Radix injetam elementos `<style>` (trava de rolagem e barra do select). Uma `style-src 'self'` os bloqueia: ao escrever a CSP, tratar isso (nonce, hash ou exceção para estilos), o que o e2e de CSP daquela história vai acusar.
