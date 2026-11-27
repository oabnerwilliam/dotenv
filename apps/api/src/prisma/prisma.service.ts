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
        // Prazo no servidor: o próprio Postgres cancela a consulta que passar de 2,5 s, e a
        // conexão continua utilizável (numa transação, tudo é desfeito).
        statement_timeout: 2500,
        // Prazo no driver, para quando o banco para de responder sem fechar o TCP: sem ele o
        // `/health` ficaria pendurado. É maior que o do servidor de propósito. Se ele vencesse
        // primeiro dentro de uma transação, a conexão voltaria ao pool ainda presa nela, e
        // gravações seguintes poderiam nunca ser confirmadas.
        // Os dois valem para TODAS as consultas da API; uma que precise de mais tempo falha.
        // As migrações não passam por aqui: a CLI do Prisma usa o `prisma.config.ts`.
        query_timeout: 3000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
