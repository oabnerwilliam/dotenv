import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';
import { supabaseStatus } from './support/supabase-status';

const BUSINESS_TABLES = ['invites', 'memberships', 'projects', 'teams', 'users'];

// Vale para as migrações futuras: o `db.int-spec` olha só a tabela do Prisma, e uma tabela nova
// sem RLS ficaria acessível pela Data API do Supabase sem nenhum teste reclamar.
describe('RLS no schema public', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('toda tabela está com RLS ligado', async () => {
    const rows = await app.get(PrismaService).$queryRaw<{ table: string }[]>`
      SELECT relname::text AS "table"
      FROM pg_class
      WHERE relnamespace = 'public'::regnamespace
        AND relkind IN ('r', 'p')
        AND NOT relrowsecurity
    `;

    expect(rows).toEqual([]);
  });

  it('nenhuma tabela tem política: só a API acessa o banco', async () => {
    const rows = await app.get(PrismaService).$queryRaw<{ table: string; policy: string }[]>`
      SELECT tablename::text AS "table", policyname::text AS policy
      FROM pg_policies
      WHERE schemaname = 'public'
    `;

    expect(rows).toEqual([]);
  });
});

// O Supabase concede tudo no schema `public` aos papéis públicos, mas só no banco `postgres`:
// no `env_test` estes testes passariam mesmo sem a migração. Por isso são a única exceção que
// lê o banco de desenvolvimento, sempre numa transação somente leitura.
describe('papéis públicos no banco de desenvolvimento', () => {
  let client: Client;
  let tables: string[];

  beforeAll(async () => {
    client = new Client({
      connectionString: supabaseStatus().DB_URL,
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    // O próprio Postgres recusa qualquer escrita feita por esta conexão.
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    const result = await client.query<{ table: string }>(
      `SELECT tablename::text AS "table" FROM pg_tables WHERE schemaname = 'public'`,
    );
    tables = result.rows.map((row) => row.table);
  });

  afterAll(async () => {
    await client?.end();
  });

  it('anon e authenticated não têm concessão no banco de desenvolvimento', async () => {
    // Sem as tabelas, as consultas abaixo passariam vazias: rode `pnpm db:migrate`.
    expect(tables).toEqual(expect.arrayContaining(BUSINESS_TABLES));

    // `grantee = 0` é o PUBLIC, que inclui os dois papéis.
    const granted = await client.query(`
      SELECT c.relname::text AS object, a.privilege_type AS privilege
      FROM pg_class c, aclexplode(c.relacl) a
      WHERE c.relnamespace = 'public'::regnamespace
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
        AND (a.grantee = 0
          OR a.grantee IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated')))
    `);
    expect(granted.rows).toEqual([]);

    // O que vale para os objetos FUTUROS criados pelo papel que roda as migrações.
    const defaults = await client.query(`
      SELECT d.defaclobjtype AS type, a.privilege_type AS privilege
      FROM pg_default_acl d, aclexplode(d.defaclacl) a
      WHERE d.defaclrole = current_user::regrole
        AND d.defaclnamespace = 'public'::regnamespace
        AND (a.grantee = 0
          OR a.grantee IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated')))
    `);
    expect(defaults.rows).toEqual([]);
  });

  it('a chave pública não lê nenhuma tabela', async () => {
    expect(tables).toEqual(expect.arrayContaining(BUSINESS_TABLES));
    const { API_URL, PUBLISHABLE_KEY } = supabaseStatus();

    const answers = await Promise.all(
      tables.map(async (table) => {
        const response = await fetch(`${API_URL}/rest/v1/${table}`, {
          headers: { apikey: PUBLISHABLE_KEY },
        });
        const body = (await response.json()) as { code?: string };
        return { table, status: response.status, code: body.code };
      }),
    );

    // Exige a recusa "permissão negada" (42501). "Nenhuma linha" não prova nada num banco vazio,
    // e uma tabela que a Data API não conhece (404) também reprova.
    expect(answers).toEqual(tables.map((table) => ({ table, status: 401, code: '42501' })));
  });
});
