# 03 — Login e equipe

**Estado:** a fazer · **Depende de:** 02 · **Spec:** §5, §8 · **Telas:** `App-Login`, `App-Onb-Empresa`, `App-Sem-Permissao`

Como dono do app, quero entrar com Google e criar minha equipe, sem que desconhecidos acessem nada.

## Critérios de aceite
- [ ] A tela de login tem só "Continuar com Google" e funciona via Supabase Auth.
- [ ] A API recusa com 401 token ausente, expirado, de outro emissor ou com assinatura inválida.
- [ ] E-mail não verificado é recusado.
- [ ] Sem equipe existente, só o `OWNER_EMAIL` pode criá-la (nome, slug, primeiro projeto) e vira admin.
- [ ] Duas tentativas simultâneas de criar a primeira equipe resultam em uma só.
- [ ] Quem não é membro nem convidado vê "sem permissão", com opção de sair.
- [ ] Rotas protegidas levam ao login; sessão expirada também.
- [ ] RLS ligado em todas as tabelas, com teste provando que a chave pública não lê nada.
- [ ] Toda rota de negócio passa por um guard que resolve a equipe do usuário.
- [ ] Testes usam tokens assinados localmente, sem depender do Google.
- [ ] `docs/operacao/google-oauth.md` guia a criação das credenciais.

## Notas técnicas
- Tabelas: Team, User, Membership, Invite (spec §6). Comparar e-mails normalizados (sem espaços, minúsculos).
- Validar o JWT pelas chaves públicas (JWKS) do Supabase.

## Fora de escopo
Tela de convites (04), CRUD de projetos (05), login com GitHub.
