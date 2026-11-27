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
- [ ] O front envia CSP e cabeçalhos de segurança; a API identifica o IP real atrás do proxy; a Data API do Supabase está desligada.
- [ ] Link direto para qualquer rota funciona no front publicado.
- [ ] `docs/operacao/publicacao.md` com passos, variáveis, backup e como voltar versão.
- [ ] Roteiro de fumaça no ambiente publicado: login, convite, reserva, bloqueio e histórico.

## Fora de escopo
Domínio próprio, monitoramento avançado.

## Riscos vindos da revisão da 03 (conferir na publicação)
- URLs de retorno: o Auth local aceita qualquer porta e caminho em `localhost`. Testar na nuvem se outros caminhos e subdomínios são recusados.
- Desligar o login por e-mail e senha: ligado, uma conta criada antes com o e-mail de outra pessoa pode fazer a API recusar o login dela.
- Limite de requisições: rota inexistente (404) e corpo recusado (400/413) não contam.

## Plano de implementação

**Não é história autônoma:** depende de decisões, contas e segredos do usuário. Só a Tarefa 1 pode rodar em segundo plano.

### Tarefa 1 — Preparação [back] (autônoma)
**Arquivos:** `apps/web/public/_redirects` (`/* /index.html 200`, conferir na documentação atual da Cloudflare), `apps/api/Dockerfile`, `.dockerignore`, `docs/operacao/publicacao.md`
- [ ] `docker build` da API funciona e o contêiner responde `/health` contra o banco local.
- [ ] Teste: com `NODE_ENV=production`, a API recusa `AUTH_TEST_MODE=true` e `WEB_ORIGIN` sem `https`.
- [ ] O build gera `_headers` com `Content-Security-Policy` (`default-src 'self'`, `script-src 'self'`, `frame-ancestors 'none'`; em `connect-src` a API e o Supabase; liberar só o necessário para fontes, estilos e avatares do Google), `X-Content-Type-Options`, `Referrer-Policy` e `Strict-Transport-Security`. Um e2e serve o build com esses cabeçalhos e falha em qualquer violação de CSP.
- [ ] `TRUST_PROXY` (padrão 0 saltos) configura o proxy; teste: o limite de requisições conta o IP do cliente e ignora `X-Forwarded-For` sem proxy confiável.
- [ ] Guia: variáveis de cada serviço, `prisma migrate deploy`, desativar login por e-mail e senha no Supabase, desligar a Data API, cadastrar as URLs de retorno, valor de `TRUST_PROXY`, conferir RLS, backup, voltar versão, e comparação atualizada das hospedagens para a API (preços, hibernação, termos) para o usuário escolher.
- [ ] Commit `chore: preparação para publicação`.

### Tarefa 2 — Contas e configuração (usuário, com o guia)
- [ ] Escolher a hospedagem da API; confirmar o uso com a empresa; criar o projeto Supabase, os serviços e as credenciais Google de produção; cadastrar os segredos nos provedores.

### Tarefa 3 — Publicar e verificar (sessão interativa)
- [ ] Aplicar as migrações; publicar API e web a partir da `main`.
- [ ] Verificar: a chave pública não lê tabelas; cadastro por e-mail desativado; CORS recusa outra origem; link direto funciona.
- [ ] Roteiro de fumaça com duas contas: login, convite, reserva, bloqueio, histórico.
- [ ] Commit `docs: registro da publicação`.
