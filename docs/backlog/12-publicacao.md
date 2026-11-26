# 12 — Publicação

**Estado:** a fazer · **Depende de:** 04 e 11 · **Spec:** §11

Como dono do app, quero a fase 1 no ar para convidar colegas.

## Decisões em aberto (resolver antes de começar)
- Hospedagem da API (Render foi sugerido).
- Confirmar o Cloudflare Pages para o front, verificando a recomendação atual da Cloudflare.
- Conferir termos e limites dos planos para uso no trabalho.
- Confirmar com a empresa o uso do app.

## Critérios de aceite
- [ ] Projeto Supabase na nuvem com migrações aplicadas, RLS conferido e Google configurado.
- [ ] Front e API publicados com HTTPS; deploy a partir da `main`.
- [ ] CORS aceita só o domínio do front.
- [ ] Segredos só nos provedores.
- [ ] Link direto para qualquer rota funciona no front publicado.
- [ ] `docs/operacao/publicacao.md` com passos, variáveis, backup e como voltar versão.
- [ ] Roteiro de fumaça no ambiente publicado: login, convite, reserva, bloqueio e histórico.

## Fora de escopo
Domínio próprio, monitoramento avançado.
