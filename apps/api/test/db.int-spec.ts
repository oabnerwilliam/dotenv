import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Client } from 'pg';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp } from './create-app';

describe('banco de testes', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('_prisma_migrations está com RLS ligado', async () => {
    const rows = await app.get(PrismaService).$queryRaw<{ relrowsecurity: boolean }[]>`
      SELECT relrowsecurity FROM pg_class WHERE oid = 'public._prisma_migrations'::regclass
    `;

    expect(rows).toEqual([{ relrowsecurity: true }]);
  });

  // Sem o prazo no servidor, o driver desiste sozinho e devolve ao pool uma conexão ainda presa
  // na transação antiga: as gravações seguintes feitas por ela nunca seriam confirmadas.
  it('o servidor cancela uma consulta demorada em transação, e o que vem depois é gravado', async () => {
    const prisma = app.get(PrismaService);

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_sleep(4)`;
      }),
    ).rejects.toThrow(/statement timeout/);

    // Várias de uma vez, para passar por mais de uma conexão do pool.
    const slugs = Array.from({ length: 5 }, () => `prazo-${randomUUID()}`);
    await Promise.all(
      slugs.map((slug) => prisma.team.create({ data: { name: 'Prazo', slug, singleton: false } })),
    );

    // Uma conexão independente só enxerga o que foi confirmado.
    const observer = new Client({ connectionString: process.env.DATABASE_URL });
    await observer.connect();
    try {
      const seen = await observer.query('SELECT slug FROM teams WHERE slug = ANY($1)', [slugs]);
      expect(seen.rowCount).toBe(slugs.length);
    } finally {
      await observer.end();
      await prisma.team.deleteMany({ where: { slug: { in: slugs } } });
    }
  }, 20_000);
});
