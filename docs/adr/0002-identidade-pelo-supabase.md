# ADR 0002 — O token diz quem é; o e-mail vem da identidade Google

**Estado:** aceita · **Data:** 2026-11-27

## Contexto
A API recebe o token do Supabase Auth e precisa decidir quem entra: só membros, convidados ou o `OWNER_EMAIL`. A decisão se apoia no e-mail. O `user_metadata` do token, onde aparecem nome e e-mail, pode ser editado pelo próprio usuário.

## Decisão
- A API valida o token localmente, com as chaves públicas (JWKS) do Supabase, e o usa para saber quem é a pessoa (`sub`). Exige `app_metadata.provider = google`.
- O e-mail usado para criar a equipe ou aceitar convite é consultado no Supabase, com a chave secreta, a partir da identidade Google com e-mail verificado.
- A consulta só acontece para quem ainda não é membro. Equipe e papel vêm do banco da API a cada requisição.
- Somente com `AUTH_TEST_MODE=true`, que exige `NODE_ENV=test`, a identidade por e-mail e senha é aceita, para os testes de ponta a ponta.

## Alternativas
- **Confiar no e-mail do token:** evita uma chamada, mas deixaria o usuário influenciar a decisão de acesso.
- **Hook no Supabase que grava um claim verificado:** põe regra de acesso dentro do banco do Supabase, fora do código testado da API.

## Consequências
- A API passa a guardar a `SUPABASE_SECRET_KEY`, um segredo com poder administrativo sobre o Auth.
- O primeiro acesso depende de o Auth responder; membros dependem só das chaves públicas, mantidas em memória.
- Um token continua válido até expirar mesmo após o logout; remover o vínculo no banco corta o acesso na requisição seguinte.
