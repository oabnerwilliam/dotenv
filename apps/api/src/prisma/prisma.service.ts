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
        // O `pg` não tem prazo por padrão. Este limita a espera por uma conexão.
        connectionTimeoutMillis: 3000,
        // Este limita a espera pela resposta numa conexão já aberta: se o banco para de
        // responder sem fechar o TCP, só o prazo evita que o `/health` fique pendurado.
        // Vale para TODAS as consultas da API; uma que precise de mais de 3 s falha. O erro
        // não cancela a consulta no servidor, então uma escrita ainda pode ser concluída.
        // As migrações não passam por aqui: a CLI do Prisma usa o `prisma.config.ts`.
        query_timeout: 3000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
