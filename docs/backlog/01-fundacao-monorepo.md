# 01 — Fundação do monorepo

**Estado:** a fazer · **Depende de:** — · **Spec:** §5

Como desenvolvedor, quero o monorepo funcionando de ponta a ponta para as próximas histórias começarem sobre uma base verificada.

## Critérios de aceite
- [ ] `pnpm install` na raiz instala `apps/web`, `apps/api` e `packages/shared`.
- [ ] `pnpm dev` sobe web e API juntos.
- [ ] `GET /health` responde 200 e informa se o banco está acessível.
- [ ] A tela inicial do web consome `/health` usando um tipo de `packages/shared`.
- [ ] Supabase local sobe com um comando; Prisma tem a primeira migração.
- [ ] `lint`, `typecheck`, `test`, `test:e2e` e `build` rodam na raiz e passam, cada um com ao menos um teste real.
- [ ] GitHub Actions roda os cinco portões em cada PR.
- [ ] `.env.example` em cada app; a API falha na partida com mensagem clara se faltar variável.
- [ ] README explica pré-requisitos e como rodar no Windows.

## Notas técnicas
- TypeScript estrito em todos os pacotes.
- Verificar a documentação atual das versões instaladas de Vite, Tailwind v4, NestJS, Prisma e Supabase CLI antes de configurar.

## Fora de escopo
Autenticação, telas do produto, publicação.
