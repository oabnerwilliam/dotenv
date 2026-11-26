import type { Health } from '@env/shared';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<Health> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'up' };
    } catch {
      // Banco fora não é erro da rota: a resposta é justamente essa informação.
      return { status: 'ok', database: 'down' };
    }
  }
}
