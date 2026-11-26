import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { ENV, type Env } from '../config/env';
import { PrismaClient } from '../generated/prisma/client';

// Sem `$connect()` na partida: a conexão abre na primeira consulta, então a API sobe mesmo
// com o banco fora e o `/health` informa a situação.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super({
      adapter: new PrismaPg({
        connectionString: env.DATABASE_URL,
        // O `pg` não tem prazo por padrão: sem isto o `/health` poderia ficar pendurado.
        connectionTimeoutMillis: 3000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
