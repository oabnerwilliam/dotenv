import type { PrismaService } from '../../src/prisma/prisma.service';

// Esvazia o banco de testes. A tabela de controle das migrações fica.
export async function resetDb(prisma: PrismaService): Promise<void> {
  const [current] = await prisma.$queryRaw<{ name: string }[]>`
    SELECT current_database()::text AS name
  `;
  // Pergunta ao próprio banco: mesmo com a URL trocada por engano, nada fora de um `_test` é
  // apagado.
  if (!current?.name.endsWith('_test')) {
    throw new Error('resetDb só roda num banco terminado em _test.');
  }

  const tables = await prisma.$queryRaw<{ name: string }[]>`
    SELECT quote_ident(tablename) AS name
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  // Os nomes vêm do catálogo do banco, já com aspas.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((table) => table.name).join(', ')} CASCADE`,
  );
}
