import type { INestApplication } from '@nestjs/common';
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
});
