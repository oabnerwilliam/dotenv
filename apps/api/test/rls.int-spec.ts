import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';

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
