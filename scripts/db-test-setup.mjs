// Prepara o banco de testes: cria o `env_test` se faltar e aplica as migrações nele.
// Pode rodar quantas vezes for preciso.
import { spawnSync } from 'node:child_process';
import pg from 'pg';

const DEFAULT_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/env_test';

// As mensagens citam só o nome do banco: a URL carrega a senha.
function fail(message) {
  console.error(`db:test:setup: ${message}`);
  process.exit(1);
}

const testUrl = process.env.TEST_DATABASE_URL || DEFAULT_URL;

let url;
try {
  url = new URL(testUrl);
} catch {
  fail('TEST_DATABASE_URL não é uma URL válida.');
}

const database = decodeURIComponent(url.pathname.slice(1));

// Trava de segurança: nunca preparar (e depois apagar em testes) um banco que não seja de teste.
if (!/^[a-z0-9_]+_test$/.test(database)) {
  fail(`recusado o banco "${database}": o nome precisa terminar em _test (a-z, 0-9 e _).`);
}

async function createDatabaseIfMissing() {
  // Não dá para criar um banco estando conectado a ele: a conexão é no banco padrão.
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';

  const client = new pg.Client({
    connectionString: adminUrl.href,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    const found = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [database]);
    if (found.rowCount === 0) {
      // CREATE DATABASE não aceita parâmetro; o nome já foi validado acima.
      await client.query(`CREATE DATABASE "${database}"`);
      console.log(`Banco "${database}" criado.`);
    }
  } finally {
    await client.end();
  }
}

try {
  await createDatabaseIfMissing();
} catch (error) {
  fail(
    `não foi possível acessar o Postgres (${error.code ?? error.name}). ` +
      'O Supabase local está ligado? Rode `pnpm db:start`.',
  );
}

// `shell: true` porque no Windows o `pnpm` é um .cmd. O comando é fixo: a URL vai pelo ambiente.
const migrate = spawnSync('pnpm --filter @env/api exec prisma migrate deploy', {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, DATABASE_URL: testUrl },
});

process.exit(migrate.status ?? 1);
