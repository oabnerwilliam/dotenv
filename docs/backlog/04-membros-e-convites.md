# 04 — Membros e convites

**Estado:** a fazer · **Depende de:** 03, 05 (feita antes desta) · **Spec:** §5 (papéis) · **Rota:** `/equipe/membros` · **Tela nova: designer primeiro**

Como admin, quero convidar colegas por e-mail para que entrem aos poucos.

## Critérios de aceite
- [ ] A lista mostra membros (nome, e-mail, papel) e convites pendentes.
- [ ] Admin convida por e-mail, escolhendo o papel.
- [ ] E-mail com maiúsculas ou espaços funciona no primeiro login.
- [ ] Convidar quem já é membro ou já tem convite mostra erro no campo.
- [ ] No primeiro login, o convite vira vínculo e some dos pendentes.
- [ ] Admin cancela convite e remove membro, com confirmação.
- [ ] Membro removido perde o acesso na requisição seguinte.
- [ ] O último admin não pode ser removido nem rebaixado.
- [ ] Membro comum vê a lista sem as ações, e a API as recusa com 403.
- [ ] A tela deixa claro que nenhum e-mail é enviado.

## Fora de escopo
Envio de e-mail, várias equipes por pessoa.

## Riscos vindos da revisão da 03 (tratar no plano)
- `GET /me` responde 500 para sempre quando o e-mail verificado já pertence a outro `User` (`apps/api/src/me/save-user.ts`). Passa a ser alcançável quando houver remoção de membro. Em `team.service.ts`, a mesma colisão apareceria como "A equipe já foi criada".
- O `nameSchema` recusa caracteres de controle e invisíveis desde a 05. Falta o nome vindo do Google, que não passa por ele: tratar antes de mostrá-lo a outros membros.

## Plano de implementação

### Contratos (`shared/src/members.ts`)
```ts
inviteSchema = { email: e-mail válido após normalizeEmail; role: Role }
updateMemberSchema = { role: Role }
membersSchema = { members: {id,userId,name,email,avatarUrl|null,role}[]; invites: {id,email,role,createdAt}[] }
```

### Tarefa 1 — Desenho [designer]
**Arquivos:** `docs/design/screens/App-Membros.html` (e estados), `index.html`, `SCREENS.md`
- [ ] Lista, formulário de convite, confirmação de remoção, visão de membro comum, aviso "Nenhum e-mail é enviado; avise a pessoa", 375px.
- [ ] Commit `docs(design): tela de membros e convites`.

### Tarefa 2 — API [back]
**Arquivos:** `src/members/*`, `test/members.int-spec.ts`
- [ ] `GET /members` para qualquer membro; `POST`, `PATCH` e `DELETE` com `@AdminOnly()` (membro → 403).
- [ ] `' Ana@Acme.Example '` é salvo normalizado e aceito no primeiro login.
- [ ] Convidar membro ou convite pendente → 409 com `fields.email`; reconvidar após cancelado funciona.
- [ ] Membro removido: requisição seguinte → 403 `NOT_INVITED`; o `User` permanece.
- [ ] Remover ou rebaixar o último admin → 409; duas remoções cruzadas simultâneas entre dois admins deixam um (travar a linha da equipe com `SELECT … FOR UPDATE` na transação).
- [ ] Ids de outra equipe → 404.
- [ ] Commit `feat(api): membros e convites`.

### Tarefa 3 — Tela [front]
**Arquivos:** `src/features/members/{MembersPage,InviteForm,MemberList}.tsx`, rota `/equipe/membros`
- [ ] `InviteForm` com React Hook Form e `inviteSchema`; erros da API por `applyApiErrors`.
- [ ] Testes: admin convida e vê o pendente; erro no campo; confirmação antes de remover; membro comum não vê ações; 409 do último admin aparece em `Banner`.
- [ ] A página entra na casca de navegação da história 05 e substitui o marcador provisório (`MembersPlaceholderPage`), para o qual o item "Membros" do menu da equipe já leva.
- [ ] Commit `feat(web): tela de membros`.

### Tarefa 4 — e2e [front]
- [ ] `e2e/members.spec.ts`: admin convida → pessoa entra → admin remove → pessoa vê sem permissão.
- [ ] Commit `test: convite ponta a ponta`.
