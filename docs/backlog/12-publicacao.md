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

## Plano de implementação

**Não é história autônoma:** depende de decisões, contas e segredos do usuário. Só a Tarefa 1 pode rodar em segundo plano.

### Tarefa 1 — Preparação [back] (autônoma)
**Arquivos:** `apps/web/public/_redirects` (`/* /index.html 200`, conferir na documentação atual da Cloudflare), `apps/api/Dockerfile`, `.dockerignore`, `docs/operacao/publicacao.md`
- [ ] `docker build` da API funciona e o contêiner responde `/health` contra o banco local.
- [ ] Teste: com `NODE_ENV=production`, a API recusa `AUTH_TEST_MODE=true` e `WEB_ORIGIN` sem `https`.
- [ ] Guia: variáveis de cada serviço, `prisma migrate deploy`, desativar login por e-mail e senha no Supabase, conferir RLS, backup, voltar versão, e comparação atualizada das hospedagens para a API (preços, hibernação, termos) para o usuário escolher.
- [ ] Commit `chore: preparação para publicação`.

### Tarefa 2 — Contas e configuração (usuário, com o guia)
- [ ] Escolher a hospedagem da API; confirmar o uso com a empresa; criar o projeto Supabase, os serviços e as credenciais Google de produção; cadastrar os segredos nos provedores.

### Tarefa 3 — Publicar e verificar (sessão interativa)
- [ ] Aplicar as migrações; publicar API e web a partir da `main`.
- [ ] Verificar: a chave pública não lê tabelas; cadastro por e-mail desativado; CORS recusa outra origem; link direto funciona.
- [ ] Roteiro de fumaça com duas contas: login, convite, reserva, bloqueio, histórico.
- [ ] Commit `docs: registro da publicação`.
