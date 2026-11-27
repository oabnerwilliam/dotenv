# Login com Google (ambiente local)

Guia para criar as credenciais do Google e ligá-las ao Supabase local. As credenciais de produção ficam para a história 12.

## Como o login funciona

1. O app (`localhost:5173`) pede o login ao Supabase local (`127.0.0.1:54321`).
2. O Supabase redireciona para o Google.
3. O Google devolve a pessoa ao Supabase, no endereço de redirecionamento cadastrado abaixo.
4. O Supabase devolve a pessoa ao app, já com a sessão.

Por isso o Google precisa conhecer o endereço do **Supabase**, não o da API.

> **Nunca** coloque o ID ou a chave secreta em arquivos versionados, em issues, em PRs ou em conversas. Eles ficam só em arquivos `.env`, ignorados pelo Git.

## 1. Criar o projeto no Google Cloud

1. Acesse <https://console.cloud.google.com/> com uma conta pessoal.
2. No seletor de projetos, no topo, escolha **Novo projeto**, dê um nome (por exemplo, `env-local`) e confirme que ele ficou selecionado.

Os nomes dos menus abaixo podem aparecer traduzidos.

## 2. Tela de consentimento (Google Auth Platform)

Abra <https://console.cloud.google.com/auth/overview>. Se for o primeiro acesso, o assistente de configuração pede os itens das seções abaixo.

1. **Branding:** nome do app (`.env`), e-mail de suporte e e-mail de contato.
2. **Audience (Público):** tipo **External (Externo)** e situação **Testing (Teste)**. Em **Test users (Usuários de teste)**, adicione o seu e-mail. Para testar a tela "sem permissão", adicione também uma segunda conta sua.
3. **Data Access (Acesso a dados):** deixe só os escopos `openid`, `.../auth/userinfo.email` e `.../auth/userinfo.profile`. Não adicione escopos sensíveis, que exigem verificação do Google.

## 3. Criar o cliente OAuth

Em **Clients (Clientes)** → **Create client (Criar cliente)**:

| Campo | Valor |
|---|---|
| Tipo de aplicativo | Aplicativo da Web |
| Nome | `env local` |
| Origens JavaScript autorizadas | `http://localhost:5173` |
| URIs de redirecionamento autorizados | `http://127.0.0.1:54321/auth/v1/callback` |

Os endereços precisam ser exatamente esses: `localhost` na origem e `127.0.0.1` no redirecionamento.

Ao criar, copie o **ID do cliente** e a **chave secreta do cliente** na hora: a chave pode não ser exibida novamente.

## 4. Preencher os arquivos `.env`

### `.env` na raiz do repositório

Copie o `.env.example` da raiz para `.env` e preencha. É lido pelo Supabase local.

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=cole-o-id-do-cliente
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=cole-a-chave-secreta
```

### Chaves do Supabase local

Com o Docker Desktop ligado, rode:

```
pnpm db:start
pnpm exec supabase status -o env
```

### `apps/api/.env` (acrescente)

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SECRET_KEY=valor-de-SECRET_KEY
OWNER_EMAIL=o-seu-email-do-google
```

`OWNER_EMAIL` é a única conta que pode criar a primeira equipe.

### `apps/web/.env` (acrescente)

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=valor-de-PUBLISHABLE_KEY
```

Variáveis `VITE_*` vão para o navegador: aqui entra só a chave **publicável**, nunca a secreta.

## 5. Aplicar e testar

O Supabase lê o `.env` só ao iniciar:

```
pnpm db:stop
pnpm db:start
pnpm db:migrate
pnpm dev
```

Abra <http://localhost:5173> (não use `127.0.0.1:5173`) e confira:

- [ ] "Continuar com Google" leva ao Google e volta ao app.
- [ ] Com o `OWNER_EMAIL`, aparece "Criar equipe" e, depois, a página do projeto.
- [ ] Recarregar a página mantém a sessão.
- [ ] "Sair" volta para o login.
- [ ] Com a segunda conta de teste, aparece "sem permissão".

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `redirect_uri_mismatch` | O URI de redirecionamento no Google difere de `http://127.0.0.1:54321/auth/v1/callback`. |
| `access_denied` no Google | A conta não está em **Test users**. |
| `Unsupported provider: provider is not enabled` | O Supabase não foi reiniciado, ou o `config.toml` ainda não habilita o Google. |
| `invalid_client` | `.env` da raiz ausente, vazio ou com ID ou chave errados, ou Supabase não reiniciado depois de preenchê-lo. |
| As chamadas à API falham por CORS | O app foi aberto por `127.0.0.1` em vez de `localhost`. |
| Erro de porta ao iniciar o Supabase | Outro Supabase local está ligado; pare-o antes. |
