# 04 — Membros e convites

**Estado:** a fazer · **Depende de:** 03 · **Spec:** §5 (papéis) · **Rota:** `/equipe/membros` · **Tela nova: designer primeiro**

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
