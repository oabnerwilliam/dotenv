// Banco do teste ponta a ponta: sempre o de testes, nunca o de desenvolvimento.
import { Client } from 'pg';

const DEFAULT_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/env_test';

/** A URL do banco de testes, a mesma para a API do e2e e para o `resetDb`. */
export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_URL;

  // Mesma trava do `db:test:setup` e do Jest. A mensagem não cita a URL, que carrega a senha.
  if (!new URL(url).pathname.endsWith('_test')) {
    throw new Error('TEST_DATABASE_URL precisa apontar para um banco terminado em _test.');
  }
  return url;
}

/** Esvazia o banco de testes. A tabela de controle das migrações fica. */
export async function resetDb(): Promise<void> {
  const client = new Client({
    connectionString: testDatabaseUrl(),
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    // Segunda trava: pergunta ao próprio banco. Parâmetros na URL podem trocar o destino.
    const current = await client.query<{ name: string }>('SELECT current_database() AS name');
    if (!current.rows[0]?.name.endsWith('_test')) {
      throw new Error('resetDb só roda num banco terminado em _test.');
    }

    const tables = await client.query<{ name: string }>(
      `SELECT quote_ident(tablename) AS name
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
    );
    // Sem tabelas, o banco não foi preparado: melhor avisar do que seguir.
    if (tables.rows.length === 0) {
      throw new Error('Banco de testes sem tabelas. Rode `pnpm db:test:setup`.');
    }
    // Os nomes vêm do catálogo do banco, já com aspas.
    await client.query(
      `TRUNCATE TABLE ${tables.rows.map((table) => table.name).join(', ')} CASCADE`,
    );
  } finally {
    await client.end();
  }
}
