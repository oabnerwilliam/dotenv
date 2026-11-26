import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CommonModule } from './common/common.module';
import { ErrorFilter } from './common/error.filter';
import { EnvModule } from './config/env.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [EnvModule, CommonModule, PrismaModule, HealthModule],
  // Registrado como provider, o filtro vale para a API inteira, inclusive nos testes.
  providers: [{ provide: APP_FILTER, useClass: ErrorFilter }],
})
export class AppModule {}
