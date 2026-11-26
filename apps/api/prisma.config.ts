import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Sem env('DATABASE_URL'): ele faria o `prisma generate` falhar onde não há .env (CI).
    url: process.env.DATABASE_URL ?? '',
  },
});
