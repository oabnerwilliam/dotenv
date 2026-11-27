# .env

Gerenciador de ambientes de homologação: um board por projeto mostrando se cada ambiente está **livre, reservado, em uso ou bloqueado**, o que está nele e quem é responsável.

**Estado:** em desenvolvimento. Já dá para entrar com Google e criar a equipe com o primeiro projeto; quem não é membro nem convidado fica de fora. O board dos ambientes ainda não existe (a página do projeto é provisória), nem as telas de convites.

- Fase 1: controle manual, login com Google e convites.
- Depois: integrações com GitHub e Jira.

Stack: React + Vite + Tailwind CSS v4 · NestJS + Prisma · Supabase · monorepo pnpm.

## Como rodar no Windows

Os comandos são para o PowerShell, na raiz do repositório.

### Pré-requisitos

| Programa       | Versão                         | Como conferir    |
| -------------- | ------------------------------ | ---------------- |
| Node.js        | 22.14 ou mais novo da linha 22 | `node --version` |
| pnpm           | 10.33                          | `pnpm --version` |
| Docker Desktop | em execução                    | `docker info`    |

Para instalar o pnpm na versão certa: `npm install --global pnpm@10.33.0`.

Só um Supabase local roda por vez: pare o de outros projetos antes, porque as portas são as mesmas.

### Primeira execução

```powershell
pnpm install
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
pnpm db:start
pnpm db:migrate
pnpm db:test:setup
pnpm exec playwright install chromium
```

O primeiro `pnpm db:start` baixa as imagens do Supabase e demora alguns minutos.

Antes de ligar o app, preencha as [variáveis de ambiente](#variáveis-de-ambiente) e rode:

```powershell
pnpm dev
```

Com o `pnpm dev` aberto:

- web: <http://localhost:5173>
- API: <http://localhost:3333/health>

`Ctrl+C` encerra a web e a API. O banco continua ligado até o `pnpm db:stop`.

Nas próximas vezes bastam `pnpm db:start` e `pnpm dev`. Depois de baixar mudanças do repositório, rode também `pnpm install`, `pnpm db:migrate` e `pnpm db:test:setup`.

### Variáveis de ambiente

Os arquivos `.env` ficam só na sua máquina (o Git os ignora). Os valores dos exemplos servem apenas para o ambiente local. As chaves do Supabase local aparecem em `pnpm exec supabase status -o env`.

| Arquivo         | Variável                                      | Valor                                                                   |
| --------------- | --------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/api/.env` | `DATABASE_URL`                                | banco de desenvolvimento (o do exemplo serve)                           |
| `apps/api/.env` | `WEB_ORIGIN`                                  | endereço do front, única origem aceita no CORS                          |
| `apps/api/.env` | `SUPABASE_URL`                                | `http://127.0.0.1:54321` (com `localhost` o login é recusado)           |
| `apps/api/.env` | `SUPABASE_SECRET_KEY`                         | `SECRET_KEY` do Supabase local; nunca vai para o front                  |
| `apps/api/.env` | `OWNER_EMAIL`                                 | e-mail do Google da única conta que pode criar a primeira equipe        |
| `apps/api/.env` | `PORT` (opcional)                             | porta da API, padrão 3333                                               |
| `apps/api/.env` | `RATE_LIMIT_PER_MINUTE` (opcional)            | requisições por minuto de um mesmo IP, padrão 300                       |
| `apps/api/.env` | `AUTH_TEST_MODE` (opcional)                   | deixe `false`; só os testes usam, e a API exige `NODE_ENV=test` com ele |
| `apps/web/.env` | `VITE_API_URL`                                | endereço da API                                                         |
| `apps/web/.env` | `VITE_SUPABASE_URL`                           | `http://127.0.0.1:54321`                                                |
| `apps/web/.env` | `VITE_SUPABASE_PUBLISHABLE_KEY`               | `PUBLISHABLE_KEY` do Supabase local (vai para o navegador)              |
| `.env` (raiz)   | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`     | credencial do Google, lida pelo Supabase ao iniciar                     |
| `.env` (raiz)   | `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` | idem                                                                    |

Para o login funcionar, siga o guia [Login com Google](docs/operacao/google-oauth.md). Os testes não precisam das credenciais do Google.

### Scripts

| Script               | O que faz                                                                           |
| -------------------- | ----------------------------------------------------------------------------------- |
| `pnpm dev`           | sobe a web e a API, recarregando a cada mudança                                     |
| `pnpm db:start`      | liga o Supabase local (Postgres na porta 54322)                                     |
| `pnpm db:stop`       | desliga o Supabase local                                                            |
| `pnpm db:migrate`    | aplica as migrações no banco de desenvolvimento e gera o client do Prisma           |
| `pnpm db:test:setup` | cria o banco de testes `env_test`, se faltar, e aplica as migrações nele            |
| `pnpm codegen`       | gera o pacote `shared` e o client do Prisma (os scripts abaixo e o `dev` já chamam) |
| `pnpm lint`          | ESLint em todo o repositório                                                        |
| `pnpm typecheck`     | confere os tipos de todos os pacotes e do e2e                                       |
| `pnpm test`          | testes de unidade e de integração                                                   |
| `pnpm test:e2e`      | testes de ponta a ponta no Chromium                                                 |
| `pnpm build`         | gera a versão de produção                                                           |

Os cinco portões, que o CI roda em cada pull request, são `lint`, `typecheck`, `test`, `test:e2e` e `build`.

### Avisos

- Feche o `pnpm dev` antes do `pnpm test:e2e`. O e2e sobe a própria API, ligada ao banco de testes, e falha se as portas 3333 ou 5173 estiverem ocupadas.
- O `pnpm test` e o `pnpm test:e2e` exigem o Supabase ligado e o `pnpm db:test:setup` já executado. O `pnpm test` também confere as permissões no banco de desenvolvimento (só leitura): rode antes o `pnpm db:migrate`.
- O `pnpm test:e2e` cria contas `@acme.example` no login do Supabase local e esvazia o `env_test`; o banco de desenvolvimento não é alterado. O Supabase limita as tentativas de entrada (30 a cada 5 minutos): muitas execuções seguidas podem falhar por isso.
- Os testes usam o banco `env_test`; o desenvolvimento usa o banco `postgres`.
- Se uma porta falhar ao abrir (3333, 5173 ou as do Supabase, de 54320 a 54329), confira se o Windows a reservou:

  ```powershell
  netsh interface ipv4 show excludedportrange protocol=tcp
  ```

## Estrutura

| Pasta             | Conteúdo                                   |
| ----------------- | ------------------------------------------ |
| `apps/web`        | interface em React                         |
| `apps/api`        | API em NestJS, com Prisma                  |
| `packages/shared` | contratos e regras usados pelos dois lados |
| `supabase`        | configuração do Supabase local             |
| `e2e`             | testes de ponta a ponta                    |

## Documentos

- [Design da fase 1](docs/superpowers/specs/2026-11-25-env-fase1-design.md)
- [Roteiro e histórias](docs/superpowers/plans/2026-11-25-env-fase1.md)
- [Login com Google no ambiente local](docs/operacao/google-oauth.md)
- [Telas de referência](docs/design/) (abra `index.html` no navegador)

Empresa, projetos, pessoas e ambientes que aparecem nos documentos e telas são fictícios.
